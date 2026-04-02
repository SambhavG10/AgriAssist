import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
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

const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

function getRpId(host: string) {
  if (host.includes('localhost')) return 'localhost';
  return host.split(':')[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email } = req.body;
  const rpID = getRpId(req.headers.host || 'localhost');

  let allowCredentials: any[] | undefined;
  let userId = '';

  try {
    if (email) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.find(u => u.email === email);

      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      userId = user.id;

      const { data: authenticators } = await supabaseAdmin
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', userId);

      if (authenticators && authenticators.length > 0) {
        allowCredentials = authenticators.map(auth => ({
          // FIX: Pass the String directly. Do NOT convert to Buffer here.
          // The library validates this as a Base64URL string.
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
}