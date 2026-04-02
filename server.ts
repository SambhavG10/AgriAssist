import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';

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

// Initialize AI Clients
const openaiApiKey = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key present:', !!openaiApiKey);
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

app.post('/api/chatbot', async (req: Request, res: Response) => {
  console.log('Received chatbot request');
  const { query, language } = req.body;

  if (!openai) {
    console.error('OpenAI client not initialized');
    res.status(500).json({ error: 'OpenAI API key not configured' });
    return;
  }

  try {
    console.log('Calling OpenAI with query:', query);
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful assistant for farmers. Your name is AgriAssist. Respond in ${language === 'ml-IN' ? 'Malayalam' : 'English'}.`
        },
        {
          role: 'user',
          content: query
        }
      ],
      model: 'gpt-3.5-turbo',
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('OpenAI response received');
    res.status(200).json({ reply: aiResponse });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
