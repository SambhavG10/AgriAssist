import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers'; // Import helper
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// --- INLINED SUPABASE CLIENT START ---
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
// --- INLINED SUPABASE CLIENT END ---

const RP_NAME = 'AgriAssist';
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

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'Missing userId or email' });
  }

  try {
    const { data: authenticators, error: dbError } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    const rpID = getRpId(req.headers.host || 'localhost');

    // FIX: Convert UUID string to Uint8Array for the library
    const userIDBuffer = isoUint8Array.fromUTF8String(userId);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: userIDBuffer, // <--- CHANGED THIS LINE (No longer just 'userId')
      userName: email,
      excludeCredentials: authenticators?.map(auth => ({
        id: auth.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    const token = jwt.sign({ challenge: options.challenge, userId }, JWT_SECRET, { expiresIn: '5m' });

    return res.status(200).json({ options, token });

  } catch (error: any) {
    console.error('Registration Challenge Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}