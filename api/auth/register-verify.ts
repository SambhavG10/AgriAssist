import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// --- INLINED SUPABASE CLIENT ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase Environment Variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
// ------------------------------

const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

function getRpId(host: string) {
  if (host.includes('localhost')) return 'localhost';
  return host.split(':')[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { response, token } = req.body;

  if (!response || !token) {
    return res.status(400).json({ error: 'Missing response or token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { challenge: string, userId: string };
    const rpID = getRpId(req.headers.host || 'localhost');
    const origin = req.headers.origin || (req.headers.host?.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      // FIX: In v10+, the data is nested inside 'credential'
      const { credential } = verification.registrationInfo;

      if (!credential || !credential.publicKey) {
         throw new Error('Registration successful, but public key is missing.');
      }

      // 1. Public Key (Uint8Array -> Base64URL String)
      const publicKeyStr = Buffer.from(credential.publicKey).toString('base64url');

      // 2. Credential ID (Already Base64URL string in v10)
      const credentialID = credential.id;

      // 3. Counter (Number)
      const counter = credential.counter;

      // Store in Supabase
      const { error } = await supabaseAdmin.from('webauthn_credentials').insert({
        user_id: decoded.userId,
        credential_id: credentialID,
        public_key: publicKeyStr,
        counter: counter,
        transports: credential.transports || [],
      });

      if (error) {
        console.error('DB Insert Error:', error);
        throw error;
      }

      return res.status(200).json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Registration Verify Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}