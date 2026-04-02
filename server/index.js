import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

const rpName = "AgriAssist";
const rpID = process.env.RP_ID || "localhost";
const origin = process.env.ORIGIN || "http://localhost:8080";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory stores (OK for dev)
const registrationChallenges = new Map();
const authChallenges = new Map();
const auditLogs = [];

app.get('/api/log', (req, res) => {
  res.json(auditLogs.slice().reverse());
});

app.post('/api/log', (req, res) => {
  const { message, url, timestamp, userId } = req.body;
  const logEntry = { message, url, timestamp, userId };
  auditLogs.push(logEntry);
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
  console.log('Audit Log:', logEntry);
  res.status(201).json({ success: true });
});

// ---------------- HELPERS ----------------

async function getCredentialsForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

async function getUserAndCredentialsByEmail(email) {
  const { data: users, error } =
    await supabaseAdmin.auth.admin.listUsers({
      email,
      perPage: 1,
    });

  if (error) throw error;
  const user = users.users?.[0];
  if (!user) return { user: null, creds: [] };

  const creds = await getCredentialsForUser(user.id);
  return { user, creds };
}

// ---------------- REGISTER CHALLENGE ----------------

app.post("/api/auth/register-challenge", async (req, res) => {
  try {
    const { userId, email, fullName } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "userId and email required" });
    }

    const existingCreds = await getCredentialsForUser(userId);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: email,
      userDisplayName: fullName || email,
      excludeCredentials: existingCreds.map((c) => ({
        id: Buffer.from(c.credential_id, "base64url"),
        type: "public-key",
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      attestationType: "none",
    });

    registrationChallenges.set(userId, options.challenge);

    res.json({ options, token: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "register-challenge failed" });
  }
});

// ---------------- REGISTER VERIFY ----------------

app.post("/api/auth/register-verify", async (req, res) => {
  try {
    const { response, token } = req.body;
    const expectedChallenge = registrationChallenges.get(token);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.json({ verified: false });
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialTransports,
    } = verification.registrationInfo;

    await supabaseAdmin.from("webauthn_credentials").insert({
      user_id: token,
      credential_id: credentialID.toString("base64url"),
      public_key: credentialPublicKey.toString("base64url"),
      counter,
      transports: credentialTransports || null,
    });

    registrationChallenges.delete(token);
    res.json({ verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ verified: false });
  }
});

// ---------------- LOGIN CHALLENGE ----------------

app.post("/api/auth/login-challenge", async (req, res) => {
  try {
    const { email } = req.body;

    const { user, creds } = await getUserAndCredentialsByEmail(email);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: creds.map((c) => ({
        id: Buffer.from(c.credential_id, "base64url"),
        type: "public-key",
      })),
    });

    authChallenges.set(user.id, options.challenge);
    res.json({ options, token: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "login-challenge failed" });
  }
});

// ---------------- LOGIN VERIFY ----------------

app.post("/api/auth/login-verify", async (req, res) => {
  try {
    const { response, token } = req.body;

    const expectedChallenge = authChallenges.get(token);
    const creds = await getCredentialsForUser(token);
    const credential = creds.find(
      (c) => c.credential_id === response.id
    );

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credential_id, "base64url"),
        credentialPublicKey: Buffer.from(credential.public_key, "base64url"),
        counter: credential.counter,
      },
    });

    const { newCounter } = verification.authenticationInfo;

    await supabaseAdmin
      .from("webauthn_credentials")
      .update({ counter: newCounter })
      .eq("id", credential.id);

    authChallenges.delete(token);

    // ✅ Create Supabase session
    const { data } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        user: { id: token },
      });

    res.json({
      verified: true,
      sessionUrl: data.action_link,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ verified: false });
  }
});

// ---------------- BIOMETRIC STORAGE ----------------

app.post("/api/auth/store-biometric", async (req, res) => {
  try {
    const { userId, biometricHash } = req.body;

    if (!userId || !biometricHash) {
      return res.status(400).json({ error: "userId and biometricHash are required" });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ biometric_hash: biometricHash })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating profile with biometric hash:", error);
      return res.status(500).json({ error: "Failed to store biometric hash" });
    }

    res.json({ success: true, message: "Biometric hash stored successfully" });
  } catch (err) {
    console.error("Server error storing biometric hash:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- CHATBOT ----------------

app.post("/api/chatbot", async (req, res) => {
  const { query, language } = req.body;
  const geminiApiKey = process.env.GEMINI_API_KEY2;

  if (!geminiApiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY2 not configured" });
  }

  const systemPrompt = `You are a helpful assistant for farmers. Your name is AgriAssist. Respond in ${
    language === "ml-IN" ? "Malayalam" : language === "hi-IN" ? "Hindi" : "English"
  }.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nUser: ${query}` }
            ]
          }
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("Gemini API Error:", errorData);
      throw new Error("Gemini API request failed");
    }

    const data = await geminiResponse.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error("Error calling Gemini:", error);
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

// ---------------- START SERVER ----------------

app.listen(3000, () => {
  console.log("✅ Auth server running on http://localhost:3000");
});