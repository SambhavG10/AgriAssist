import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { response, token, email } = req.body;

  if (!response || !token) {
    return res.status(400).json({ error: 'Missing response or token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { challenge: string, userId: string };
    const rpID = getRpId(req.headers.host || 'localhost');
    const origin = req.headers.origin || (req.headers.host?.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`);

    // 1. Fetch Authenticator from DB
    const { data: storedCredential } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', response.id)
      .single();

    if (!storedCredential) {
      return res.status(400).json({ error: 'Authenticator not found' });
    }

    // 2. Prepare the Credential Object (v10+ Structure)
    // FIX 1: Property names inside this object changed
    const authenticatorDevice = {
      id: storedCredential.credential_id,         // was 'credentialID'
      publicKey: Buffer.from(storedCredential.public_key, 'base64url'), // was 'credentialPublicKey'
      counter: Number(storedCredential.counter) || 0,
      transports: storedCredential.transports,
    };

    // 3. Verify
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      // FIX 2: The option key is now 'credential', NOT 'authenticator'
      credential: authenticatorDevice, 
      requireUserVerification: false,
    });

    if (verification.verified) {
      // 4. Update Counter
      await supabaseAdmin
        .from('webauthn_credentials')
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq('id', storedCredential.id);

      // 5. Generate Magic Link
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
            // Tell Supabase to redirect to /dashboard after verifying the token
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
}