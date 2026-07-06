import express, { Request, Response } from 'express';
import cors from 'cors';
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set body limit to 10mb to handle audio uploads
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Audit log in-memory store
const auditLogs: any[] = [];

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
  console.error('Current directory:', process.cwd());
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
console.log('Supabase Admin Client initialized (server.ts)');

const RP_NAME = 'AgriAssist';
const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

function getRpId(req: Request) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname;
      return hostname;
    } catch (e) {
      // ignore invalid url
    }
  }
  const host = req.headers.host || 'localhost';
  if (host.includes('localhost')) return 'localhost';
  return host.split(':')[0];
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------- AUDIT LOGS ----------------
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

// ---------------- WEBAUTHN REGISTER CHALLENGE ----------------
app.post('/api/auth/register-challenge', async (req: Request, res: Response) => {
  const { userId, email } = req.body;

  if (!userId || !email) {
    res.status(400).json({ error: 'Missing userId or email' });
    return;
  }

  try {
    const { data: authenticators, error: dbError } = await supabaseAdmin
      .from('user_authenticators')
      .select('credential_id')
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database Error:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    const rpID = getRpId(req);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: isoUint8Array.fromUTF8String(userId),
      userName: email,
      excludeCredentials: authenticators?.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'discouraged',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
    });

    const token = jwt.sign({ challenge: options.challenge, userId }, JWT_SECRET, { expiresIn: '5m' });

    res.status(200).json({ options, token });
  } catch (error: any) {
    console.error('Register Challenge Error:', error);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

// ---------------- WEBAUTHN REGISTER VERIFY ----------------
app.post('/api/auth/register-verify', async (req: Request, res: Response) => {
  const { response, token } = req.body;

  if (!response || !token) {
    res.status(400).json({ error: 'Missing response or token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { challenge: string, userId: string };
    const rpID = getRpId(req);
    const origin = req.headers.origin || (req.headers.host?.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`);

    console.log('Verifying Registration:', {
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    console.log('Verification Result:', verification);

    if (verification.verified && verification.registrationInfo) {
      // Library v10+ structure: credential.publicKey, credential.id, credential.counter
      const { credential } = verification.registrationInfo;

      if (!credential || !credential.publicKey) {
        throw new Error('Registration successful, but public key is missing.');
      }

      const publicKeyStr = Buffer.from(credential.publicKey).toString('base64url');
      const credentialID = credential.id;
      const counter = credential.counter;

      const { error } = await supabaseAdmin.from('user_authenticators').insert({
        user_id: decoded.userId,
        credential_id: credentialID,
        credential_public_key: publicKeyStr,
        counter,
        transports: credential.transports || [],
      });

      if (error) {
        console.error('DB Insert Error:', error);
        throw error;
      }

      res.status(200).json({ verified: true });
    } else {
      console.error('Verification Failed Details:', verification);
      res.status(400).json({ verified: false, error: 'Verification failed', details: verification });
    }
  } catch (error: any) {
    console.error('Registration Verify Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ---------------- WEBAUTHN LOGIN CHALLENGE ----------------
app.post('/api/auth/login-challenge', async (req: Request, res: Response) => {
  const { email } = req.body;
  const rpID = getRpId(req);

  let allowCredentials;
  let userId = '';

  try {
    if (email) {
      const { data: uid, error } = await supabaseAdmin.rpc('get_user_id_by_email', { email });

      if (error || !uid) {
        res.status(400).json({ error: 'User not found' });
        return;
      }
      userId = uid;

      const { data: authenticators } = await supabaseAdmin
        .from('user_authenticators')
        .select('credential_id, transports')
        .eq('user_id', userId);

      if (authenticators && authenticators.length > 0) {
        allowCredentials = authenticators.map((auth: any) => ({
          id: auth.credential_id,
          type: 'public-key' as const,
          transports: auth.transports || [],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const token = jwt.sign({ challenge: options.challenge, userId }, JWT_SECRET, { expiresIn: '5m' });

    res.status(200).json({ options, token });
  } catch (error: any) {
    console.error('Login Challenge Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ---------------- WEBAUTHN LOGIN VERIFY ----------------
app.post('/api/auth/login-verify', async (req: Request, res: Response) => {
  const { response, token, email } = req.body;

  if (!response || !token) {
    res.status(400).json({ error: 'Missing response or token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { challenge: string, userId: string };
    const rpID = getRpId(req);
    const origin = req.headers.origin || (req.headers.host?.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`);

    const { data: authenticator } = await supabaseAdmin
      .from('user_authenticators')
      .select('*')
      .eq('credential_id', response.id)
      .single();

    if (!authenticator) {
      res.status(400).json({ error: 'Authenticator not found' });
      return;
    }

    // Library v10+ structure: id, publicKey, counter, transports inside credential object
    const authenticatorDevice = {
      id: authenticator.credential_id,
      publicKey: Buffer.from(authenticator.credential_public_key, 'base64url'),
      counter: Number(authenticator.counter) || 0,
      transports: authenticator.transports || [],
    };

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: authenticatorDevice,
      requireUserVerification: true,
    });

    if (verification.verified) {
      await supabaseAdmin
        .from('user_authenticators')
        .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date() })
        .eq('id', authenticator.id);

      let userEmail = email;
      if (!userEmail && decoded.userId) {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);
        userEmail = user.user?.email;
      }

      if (!userEmail) throw new Error('User email not found');

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: {
          redirectTo: `${origin}/dashboard`
        }
      });

      if (linkError) throw linkError;

      res.status(200).json({ verified: true, sessionUrl: linkData.properties.action_link });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Login Verify Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ---------------- BIOMETRIC STORAGE ----------------
app.post('/api/auth/store-biometric', async (req: Request, res: Response) => {
  try {
    const { userId, biometricHash } = req.body;

    if (!userId || !biometricHash) {
      res.status(400).json({ error: "userId and biometricHash are required" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ biometric_hash: biometricHash })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating profile with biometric hash:", error);
      res.status(500).json({ error: "Failed to store biometric hash" });
      return;
    }

    res.json({ success: true, message: "Biometric hash stored successfully" });
  } catch (err: any) {
    console.error("Server error storing biometric hash:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- WEATHER ENDPOINT ----------------
app.get('/api/weather', async (req: Request, res: Response) => {
  const { location } = req.query;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!location) {
    res.status(400).json({ error: 'Location is required' });
    return;
  }

  if (!apiKey || apiKey.startsWith('your-')) {
    res.status(500).json({ error: 'Weather API key is not configured' });
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

  try {
    const weatherResponse = await fetch(url);
    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
    }
    const weatherData = await weatherResponse.json();
    res.status(200).json(weatherData);
  } catch (error: any) {
    console.error('[Weather] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// ---------------- TRANSCRIPTION (STT) ENDPOINT ----------------
app.post('/api/transcribe', async (req: Request, res: Response) => {
  const { audio: base64Audio, mimeType } = req.body;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!base64Audio) {
    res.status(400).json({ message: 'No audio data provided.' });
    return;
  }

  if (!geminiApiKey || geminiApiKey.startsWith('your-')) {
    res.status(500).json({ message: 'Gemini API key not found.' });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  try {
    console.log(`[Transcribe] Calling Gemini for STT...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType || 'audio/webm', data: base64Audio } },
            { text: "Transcribe this audio exactly. Only output the transcription text, nothing else." }
          ]
        }]
      })
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      console.error('[Transcribe] Gemini Error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Gemini STT failed');
    }

    const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!transcription) throw new Error('No transcription returned from Gemini');

    console.log('[Transcribe] Success');
    res.status(200).json({ transcription });
  } catch (error: any) {
    console.error('[Transcribe] Error:', error.message);
    res.status(500).json({ message: 'Transcription failed', details: error.message });
  }
});

// ---------------- CROP ADVISORY SECURE PROXY ENDPOINT ----------------
app.post('/api/advisory', async (req: Request, res: Response) => {
  const { crop, location } = req.body;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!crop || !location) {
    res.status(400).json({ error: 'Crop and location are required' });
    return;
  }

  if (!geminiApiKey) {
    res.status(500).json({ error: 'Gemini API key is not configured' });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const prompt = `
      As an expert agricultural assistant, provide specific farming advice for the crop "${crop}" in the location "${location}".
      Return the response STRICTLY as a JSON object with the following fields:
      {
        "sowing": "Best months/conditions for sowing in this location",
        "harvest": "Expected harvest time/duration",
        "irrigation": "Specific watering needs for this crop in this climate",
        "stages": ["Array of 4-5 major growth stages"],
        "diseases": ["Array of 3-4 common diseases/pests for this crop in this area"]
      }
      Provide concise but highly relevant local advice. Do not include any markdown formatting or extra text.
    `;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = (await googleResponse.json()) as any;

    if (!googleResponse.ok) {
      console.error('[Advisory] Gemini API Error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Unknown error from Gemini');
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) throw new Error('No text returned from Gemini');

    // Robust JSON extraction
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('[Advisory] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch AI crop advisory data', details: error.message });
  }
});

// ---------------- CHATBOT ENDPOINT ----------------
const geminiApiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key present:', !!geminiApiKey);

app.post('/api/chatbot', async (req: Request, res: Response) => {
  const { query, language } = req.body;

  if (!geminiApiKey) {
    console.error('Gemini API key not configured');
    res.status(500).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env file.' });
    return;
  }

  try {
    const langName = language === 'ml-IN' ? 'Malayalam' : language === 'hi-IN' ? 'Hindi' : 'English';
    // Fixed contradiction in prompt
    const systemPrompt = `You are AgriAssist, a highly knowledgeable and friendly agricultural assistant. You MUST always identify yourself as AgriAssist. Respond in ${langName} as requested by the user.`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    console.log(`[Chatbot] Calling Gemini API for query: "${query?.slice(0, 50)}..."`);
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}` }]
        }]
      })
    });

    const data = (await googleResponse.json()) as any;

    if (!googleResponse.ok) {
      console.error('[Chatbot] Gemini API Error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Unknown error from Gemini');
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) throw new Error('No text returned from Gemini');

    res.status(200).json({ reply: aiResponse });
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
  }
});

// Alias for plural endpoint
app.post('/api/chatbots', (req: Request, res: Response) => {
  req.url = '/api/chatbot';
  app.handle(req, res);
});

// Start Server
app.listen(port, () => {
  console.log(`\n✅ AgriAssist Unified Local Server running on port ${port}`);
});
