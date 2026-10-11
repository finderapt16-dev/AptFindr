import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const respond = (body: unknown) => new Response(JSON.stringify(body), { headers });
  try {
    const { username, password } = await request.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !password || username.length > 100) return respond({ error: 'Invalid username or password.' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: profile, error: lookupError } = await admin.from('app_users').select('email').eq('username', username.trim().toLowerCase()).maybeSingle();
    if (lookupError || !profile?.email) return respond({ error: 'Invalid username or password.' });
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session || !data.user.email_confirmed_at) return respond({ error: 'Unable to sign in. Check your credentials and email confirmation.' });
    return respond({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  } catch { return respond({ error: 'Unable to sign in.' }); }
});
