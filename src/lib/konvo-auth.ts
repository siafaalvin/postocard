/**
 * Konvo auth bridge — allows registered Konvo users to access Postocard
 * for free. Checks credentials against Konvo's Supabase GoTrue, and
 * auto-provisions a Postocard user account with tier=basic if one
 * doesn't exist yet.
 */

const KONVO_SUPABASE_URL = process.env.KONVO_SUPABASE_URL || 'https://api.thekonvo.com';
const KONVO_SUPABASE_ANON_KEY = process.env.KONVO_SUPABASE_ANON_KEY || '';

interface KonvoAuthResult {
  success: boolean;
  email?: string;
  konvoUserId?: string;
}

export async function verifyKonvoCredentials(email: string, password: string): Promise<KonvoAuthResult> {
  if (!KONVO_SUPABASE_ANON_KEY) return { success: false };

  const res = await fetch(`${KONVO_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': KONVO_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return { success: false };

  const data = await res.json();
  if (!data.access_token || !data.user?.id) return { success: false };

  return {
    success: true,
    email: data.user.email,
    konvoUserId: data.user.id,
  };
}
