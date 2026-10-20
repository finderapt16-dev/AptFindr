import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/auth/AuthCallback.jsx', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source.replace(/^import .*;\r?\n/gm, ''), 'AuthCallback.jsx', {
    jsx: { runtime: 'classic' },
});

async function runCallback({ role = 'tenant', confirmed = true, profileAvailable = true, google = false, flow = null, hash = '', strictMode = false, hydrationError = null } = {}) {
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    const calls = { signouts: 0, hydrations: 0, navigations: 0 };
    const key = `__callbackTest${Math.random().toString(36).slice(2)}`;
    globalThis[key] = {
        React: { createElement: () => null },
        console: { error: () => {} },
        Link: () => null,
        window: { location: { search: '', hash } },
        useEffect: effect => { if (strictMode) effect()(); effect(); },
        useState: () => ['', error => finish({ error })],
        useNavigate: () => (path, options) => { calls.navigations++; finish({ path, ...options }); },
        useAuth: () => ({ hydrateSession: async () => {
            calls.hydrations++;
            if (hydrationError) throw hydrationError;
            return profileAvailable ? { role } : null;
        } }),
        clearPendingGoogleOAuthFlow: () => {},
        exchangeAuthCode: async () => ({ error: null }),
        getAuthUser: async () => ({ data: { user: { email_confirmed_at: confirmed ? '2026-10-05' : null } } }),
        getExistingProfileForAuthUser: async () => profileAvailable ? { role } : null,
        getPendingGoogleOAuthFlow: () => flow,
        GOOGLE_ROLE_ERROR: 'This Google account is already associated with another account role. Please use your designated sign-in method.',
        provisionGoogleTenant: async () => {
            if (role !== 'tenant') throw new Error('This Google account is already associated with another account role. Please use your designated sign-in method.');
            return { role: 'tenant' };
        },
        getAuthSession: async () => ({ data: { session: {} } }),
        isGoogleOAuthSession: () => google,
        isTenantRole: value => value === 'tenant',
        signOutAuthSession: async () => {
            calls.signouts++;
            return { error: null };
        },
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
        const { result, calls } = await runCallback({ role, google: true, flow: 'login' });
        assert.equal(result.path, role === 'landlord' ? '/login' : '/browse');
        assert.equal(calls.signouts, role === 'landlord' ? 1 : 0);
        if (role === 'landlord') assert.match(result.state.error, /another account role/);
    });
    test(`confirmed ${role} must sign in after email confirmation`, async () => {
        const { result, calls } = await runCallback({ role });
        assert.equal(result.path, '/login');
        assert.equal(result.replace, true);
        assert.match(result.state.message, /Email confirmed successfully/);
        assert.equal(calls.signouts, 1);
        assert.equal(calls.hydrations, 0);
    });
}

for (const flow of ['login', 'signup', null]) {
    test('Google tenant enters dashboard without manual signup, flow=' + flow, async () => {
        const { result, calls } = await runCallback({ google: true, flow });
        assert.equal(result.path, '/browse');
        assert.equal(calls.hydrations, 1);
        assert.equal(calls.signouts, 0);
    });
}
test('profile recovery failure signs out and displays an error', async () => {
    const { result, calls } = await runCallback({ google: true, profileAvailable: false });
    assert.equal(result.path, '/login');
    assert.match(result.state.error, /could not finish/);
    assert.equal(calls.signouts, 1);
});

test('unverified email cannot open a dashboard', async () => {
    const { result, calls } = await runCallback({ confirmed: false });
    assert.match(result.error, /verification could not be confirmed/);
    assert.equal(calls.hydrations, 0);
    assert.equal(result.path, undefined);
});

test('email confirmation does not hydrate an application profile', async () => {
    const { result, calls } = await runCallback({ profileAvailable: false });
    assert.equal(result.path, '/login');
    assert.match(result.state.message, /Email confirmed successfully/);
    assert.equal(calls.hydrations, 0);
});

test('expired implicit confirmation link reports its error before loading a profile', async () => {
    const { result, calls } = await runCallback({ hash: '#error=access_denied&error_code=otp_expired' });
    assert.equal(result.path, '/login');
    assert.match(result.state.error, /expired/);
    assert.equal(calls.hydrations, 0);
});

test('StrictMode callback remount only hydrates and navigates once', async () => {
    const { result, calls } = await runCallback({ google: true, strictMode: true });
    assert.equal(result.path, '/browse');
    assert.equal(calls.hydrations, 1);
    assert.equal(calls.navigations, 1);
    assert.equal(calls.signouts, 0);
});
test('missing provisioning RPC reports the deployment problem and does not loop', async () => {
    const { result, calls } = await runCallback({ google: true,
        hydrationError: Object.assign(new Error('Function missing'), { code: 'PGRST202' }) });
    assert.equal(result.path, '/login');
    assert.match(result.state.error, /database function has not been deployed/);
    assert.equal(calls.hydrations, 1);
    assert.equal(calls.navigations, 1);
    assert.equal(calls.signouts, 1);
});
