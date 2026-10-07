import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('pending email signup uses the entered email and does not write app profiles', async () => {
    let submitted;
    const key = '__pendingSignupTest';
    globalThis[key] = {
        auth: { signUp: async input => {
            submitted = input;
            return { data: { user: { id: 'pending-id', identities: [{}], email_confirmed_at: null }, session: null } };
        } },
        from: () => { throw new Error('Unverified signup must not access profile tables'); },
    };
    try {
        let source = await readFile(new URL('../src/services/authService.js', import.meta.url), 'utf8');
        source = source.replace(/^import .*;\r?\n/gm, '').replaceAll('import.meta.env.DEV', 'false');
        source = `const supabaseClient = globalThis.${key};
            const validateSignupPassword = () => null;
            const window = { location: { origin: 'https://aptfindr.example' } };\n` + source;
        const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
        const result = await service.signupUser({
            email: ' New.User@gmail.com ', username: 'new_user', name: 'New User',
            password: 'Strong123!', role: 'tenant', termsAccepted: true,
        });
        assert.equal(submitted.email, 'new.user@gmail.com');
        assert.equal(submitted.options.emailRedirectTo, 'https://aptfindr.example/auth/callback');
        assert.equal(result.requiresEmailVerification, true);
        assert.equal(result.profileCreated, false);
    } finally {
        delete globalThis[key];
    }
});
