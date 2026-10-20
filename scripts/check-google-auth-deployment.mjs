import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
// An anonymous request cannot create a profile. No credentials/tokens are printed.
const response = await fetch(`${url}/rest/v1/rpc/complete_google_tenant_sign_in`, {
  method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{}',
});
const result = await response.json();
console.log(JSON.stringify({ status: response.status, code: result.code,
  message: result.message, details: result.details, hint: result.hint }, null, 2));
