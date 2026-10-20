import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';
import * as validation from '../src/auth/signupValidation.js';
import { getGoogleNameFields } from '../src/auth/googleNameFields.js';

const source = await readFile(new URL('../src/auth/Signup.jsx', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source.replace(/^import .*;\r?\n/gm, ''), 'Signup.jsx', { jsx: { runtime: 'classic' } });

async function setup({ existing = false, restricted = false } = {}) {
  const state = [], dependencies = [], effects = [];
  let cursor = 0, effectCursor = 0, tree, completed = false;
  const calls = { navigations: [], submissions: [], signouts: 0 };
  const user = { id: 'verified-id', email: 'verified@gmail.com', email_confirmed_at: '2026-01-01',
    user_metadata: { full_name: 'Google Tenant' }, app_metadata: { provider: 'google' } };
  const profile = { id: 'tenant-profile', role: 'tenant' };
  const roleError = 'This Google account is already associated with another account role. Please use your designated sign-in method.';
  function SignupAccountFields() {} function SignupFullNameField() {} function SignupAgreement() {}
  const navigate = (path, options) => calls.navigations.push({ path, ...options });
  const hydrateSession = async () => {
    if (restricted) throw new Error(roleError);
    return existing || completed ? profile : null;
  };
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState: initial => { const slot=cursor++; if (!(slot in state)) state[slot]=typeof initial==='function'?initial():initial;
      return [state[slot], value => { state[slot]=typeof value==='function'?value(state[slot]):value; }]; },
    useRef: initial => { const slot=cursor++; state[slot]??={current:initial}; return state[slot]; },
    useEffect: (effect,deps) => { const slot=effectCursor++; if (!dependencies[slot] || deps.some((v,i)=>v!==dependencies[slot][i])) { dependencies[slot]=deps; effects.push(effect); } },
    useNavigate: () => navigate,
    useLocation: () => ({ search: '?google=setup&role=landlord' }),
    useAuth: () => ({ signup: () => { throw new Error('Password signup must not run'); }, hydrateSession }),
    useSignupViewport: () => {},
    getAuthUser: async () => ({data:{user}}), isGoogleAuthUser: () => true,
    finalizeGoogleSignup: async (identity,input) => { calls.submissions.push({identity,input}); completed=true; return profile; },
    clearPendingGoogleOAuthFlow: () => {},
    signOutAuthSession: async () => { calls.signouts++; return {}; },
    GOOGLE_ROLE_ERROR: roleError,
    getGoogleNameFields, ...validation,
    Link: 'a', AppLogo: 'logo', SignupAccountFields, SignupFullNameField, SignupAgreement,
    SignupPersonalFields: 'personal', SignupPolicyDialog: 'policy',
    AlertCircle: 'alert', ArrowRight: 'arrow', Building2: 'building', ChevronRight: 'chevron', Home: 'home', Info: 'info', Users: 'users',
    requestAnimationFrame: callback => callback(),
  };
  const key=`__signupUi${Math.random().toString(36).slice(2)}`;
  globalThis[key]=context;
  const bindings=Object.keys(context).join(',');
  const module=await import(`data:text/javascript;base64,${Buffer.from(`const {${bindings}}=globalThis['${key}'];\n${code}`).toString('base64')}`);
  delete globalThis[key];
  function render() { cursor=0;effectCursor=0;tree=module.Signup({});while(effects.length)effects.shift()();return tree; }
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
  function find(type,node=tree) {
    if (!node || typeof node!=='object') return null;
    if (Array.isArray(node)) { for(const child of node){const match=find(type,child);if(match)return match;} return null; }
    if(node.type===type)return node;
    return find(type,node.props?.children);
  }
  render();await settle();render();
  return {calls,render,settle,find,types:{SignupAccountFields,SignupFullNameField,SignupAgreement}};
}

test('new Google user sees tenant signup with prefilled identity and must submit before dashboard',async()=>{
  const ui=await setup();
  const fields=ui.find(ui.types.SignupAccountFields).props;
  assert.equal(fields.values.role,'tenant');
  assert.equal(fields.values.email,'verified@gmail.com');
  assert.equal(fields.values.fullName,'Google Tenant');
  assert.equal(fields.emailReadOnly,true);
  assert.equal(fields.includeUsername,false);
  assert.equal(fields.includePassword,false);
  assert.deepEqual(ui.calls.navigations,[]);
  assert.deepEqual(ui.calls.submissions,[]);
  ui.find('form').props.onSubmit({preventDefault(){}});
  await ui.settle();ui.render();
  assert.equal(ui.calls.submissions.length,0); // Agreement is required.
  ui.find(ui.types.SignupAgreement).props.onChange(true);ui.render();
  ui.find('form').props.onSubmit({preventDefault(){}});
  await ui.settle();
  assert.equal(ui.calls.submissions.length,1);
  assert.equal(ui.calls.submissions[0].input.role,'tenant');
  assert.equal(ui.calls.submissions[0].input.email,'verified@gmail.com');
  assert.equal(ui.calls.submissions[0].identity.id,'verified-id');
  assert.equal(ui.calls.navigations.at(-1).path,'/browse');
});

test('existing tenant visiting Google setup goes straight to dashboard without registration',async()=>{
  const ui=await setup({existing:true});
  assert.equal(ui.calls.navigations.at(-1).path,'/browse');
  assert.equal(ui.calls.submissions.length,0);
});

test('restricted Google account cannot complete tenant setup',async()=>{
  const ui=await setup({restricted:true});
  assert.equal(ui.calls.navigations.at(-1).path,'/login');
  assert.match(ui.calls.navigations.at(-1).state.error,/another account role/);
  assert.equal(ui.calls.signouts,1);
  assert.equal(ui.calls.submissions.length,0);
});

