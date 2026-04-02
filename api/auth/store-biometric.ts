import type { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      console.error("Error updating profile:", error);
      return res.status(500).json({ error: "Failed to store biometric hash" });
    }

    res.json({ success: true, message: "Biometric hash stored successfully" });
  } catch (err: any) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}