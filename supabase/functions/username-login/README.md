Deploy with: supabase functions deploy username-login

This public sign-in endpoint verifies the password using Supabase Auth before returning a session. It never returns account emails to unauthenticated callers. Service role credentials stay in the Edge Function environment. Email sign-in continues to work without deploying this function.
