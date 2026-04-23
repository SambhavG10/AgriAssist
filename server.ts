import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
  console.error('Current directory:', process.cwd());
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
console.log('Supabase Admin Client initialized');

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

// Register Challenge
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
      userID: new TextEncoder().encode(userId),
      userName: email,
      excludeCredentials: authenticators?.map(auth => ({
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

// Register Verify
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
      clientDataJSON: response.response.clientDataJSON,
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
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      const { error } = await supabaseAdmin.from('user_authenticators').insert({
        user_id: decoded.userId,
        credential_id: Buffer.from(credentialID).toString('base64url'),
        credential_public_key: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: response.response.transports || [],
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
  } catch (error) {
    console.error('Registration Verify Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login Challenge
app.post('/api/auth/login-challenge', async (req: Request, res: Response) => {
  const { email } = req.body;
  const rpID = getRpId(req);

  let allowCredentials;
  let userId = '';

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
      allowCredentials = authenticators.map(auth => ({
        id: auth.credential_id,
        type: 'public-key' as const,
        transports: auth.transports,
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
});

// Login Verify
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

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: Buffer.from(authenticator.credential_public_key, 'base64url'),
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
    });

    if (verification.verified) {
      await supabaseAdmin
        .from('user_authenticators')
        .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date() })
        .eq('id', authenticator.id);

      let userEmail = email;
      if (!userEmail) {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);
        userEmail = user.user?.email;
      }

      if (!userEmail) throw new Error('User email not found');

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });

      if (linkError) throw linkError;

      res.status(200).json({ verified: true, sessionUrl: linkData.properties.action_link });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (error) {
    console.error('Login Verify Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Initialize AI - Gemini
const geminiApiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key present:', !!geminiApiKey);

app.post('/api/chatbot', async (req: Request, res: Response) => {
  console.log('Received chatbot request');
  const { query, language } = req.body;

  if (!geminiApiKey) {
    console.error('Gemini API key not configured');
    res.status(500).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env file.' });
    return;
  }

  try {
    const langName = language === 'ml-IN' ? 'Malayalam' : language === 'hi-IN' ? 'Hindi' : 'English';
    const systemPrompt = `You are a helpful assistant for farmers. Your name is AgriAssist. Respond in ${langName}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    console.log('Calling Gemini API...');
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}` }]
        }]
      })
    });

    const data = await googleResponse.json() as any;

    if (!googleResponse.ok) {
      console.error('Gemini API Error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Unknown error from Gemini');
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) throw new Error('No text returned from Gemini');

    console.log('Gemini response received');
    res.status(200).json({ reply: aiResponse });
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
