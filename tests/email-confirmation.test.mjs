import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/auth/AuthCallback.jsx', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source.replace(/^import .*;\r?\n/gm, ''), 'AuthCallback.jsx', {
    jsx: { runtime: 'classic' },
});

async function runCallback({ role = 'tenant', confirmed = true, profileAvailable = true, google = false, hash = '' } = {}) {
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    const calls = { signouts: 0, hydrations: 0 };
    const key = `__callbackTest${Math.random().toString(36).slice(2)}`;
    globalThis[key] = {
        React: { createElement: () => null },
        console: { error: () => {} },
        Link: () => null,
        window: { location: { search: '', hash } },
        useEffect: effect => effect(),
        useState: () => ['', error => finish({ error })],
        useNavigate: () => (path, options) => finish({ path, ...options }),
        useAuth: () => ({ hydrateSession: async () => {
            calls.hydrations++;
            return profileAvailable ? { role } : null;
        } }),
        clearPendingGoogleOAuthFlow: () => {},
        exchangeAuthCode: async () => ({ error: null }),
        getAuthUser: async () => ({ data: { user: { email_confirmed_at: confirmed ? '2026-10-05' : null } } }),
        getExistingProfileForAuthUser: async () => profileAvailable ? { role } : null,
        isGoogleAuthUser: () => google,
        isTenantRole: value => value === 'tenant',
        signOutAuthSession: async () => { calls.signouts++; },
    };
    try {
        const bindings = Object.keys(globalThis[key]).join(', ');
        const module = await import(`data:text/javascript;base64,${Buffer.from(`const { ${bindings} } = globalThis['${key}'];\n${code}`).toString('base64')}`);
        module.AuthCallback();
        return { result: await completed, calls };
    } finally {
        delete globalThis[key];
    }
}

for (const role of ['tenant', 'landlord']) {
    test(`existing Google ${role} goes to their login destination`, async () => {
        const { result, calls } = await runCallback({ role, google: true });
        assert.equal(result.path, role === 'landlord' ? '/landlord/dashboard' : '/browse');
        assert.equal(calls.signouts, 0);
    });
    test(`confirmed ${role} keeps the session and opens Apartments`, async () => {
        const { result, calls } = await runCallback({ role });
        assert.equal(result.path, '/browse');
        assert.equal(result.replace, true);
        assert.equal(calls.signouts, 0);
        assert.equal(calls.hydrations, 1);
    });
}

test('new Google user must choose a role and complete signup before dashboard access', async () => {
    const { result, calls } = await runCallback({ google: true, profileAvailable: false });
    assert.equal(result.path, '/signup?google=setup');
    assert.equal(calls.hydrations, 0);
    assert.equal(calls.signouts, 0);
});

test('unverified email cannot open a dashboard', async () => {
    const { result, calls } = await runCallback({ confirmed: false });
    assert.match(result.error, /verification could not be confirmed/);
    assert.equal(calls.hydrations, 0);
    assert.equal(result.path, undefined);
});

test('missing profile reports failure rather than successful dashboard entry', async () => {
    const { result } = await runCallback({ profileAvailable: false });
    assert.equal(result.path, '/login');
    assert.match(result.state.error, /could not load your account/);
});

test('expired implicit confirmation link reports its error before loading a profile', async () => {
    const { result, calls } = await runCallback({ hash: '#error=access_denied&error_code=otp_expired' });
    assert.equal(result.path, '/login');
    assert.match(result.state.error, /expired/);
    assert.equal(calls.hydrations, 0);
});
