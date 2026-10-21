import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transformWithOxc} from 'vite';
const source=await readFile(new URL('../src/contexts/AuthContext.jsx',import.meta.url),'utf8');
const {code}=await transformWithOxc(source.replace(/^import .*;\r?\n/gm,''),'AuthContext.jsx',{jsx:{runtime:'classic'}});

async function setup(implementation) {
  const state=[],effects=[];let cursor=0,emit;
  const key=`__authRace${Math.random().toString(36).slice(2)}`;
  globalThis[key]={
    React:{createElement:(type,props)=>props.value},
    createContext:()=>({Provider:'provider'}),
    useState:initial=>{const slot=cursor++;if(!(slot in state))state[slot]=initial;return[state[slot],value=>{state[slot]=typeof value==='function'?value(state[slot]):value;}];},
    useRef:initial=>{const slot=cursor++;state[slot]??={current:initial};return state[slot];},
    useCallback:fn=>fn,useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),
    onAuthStateChange:callback=>{emit=callback;return()=>{};},
    loginUser:credentials=>implementation(credentials,profile=>emit(profile)),
    persistCurrentUser:()=>{},fetchAppUsers:async()=>[],getPendingLandlordCount:async()=>0,
    logoutUser:async()=>emit(null),
  };
  const bindings=Object.keys(globalThis[key]).join(',');
  const module=await import(`data:text/javascript;base64,${Buffer.from(`const {${bindings}}=globalThis['${key}'];\n${code}`).toString('base64')}`);
  delete globalThis[key];
  const render=()=>{cursor=0;return module.AuthProvider({children:null});};
  render();effects.find(effect=>effect.toString().includes('return onAuthStateChange'))();
  return{render,emit:profile=>emit(profile)};
}
const tenant={id:'tenant-id',role:'tenant'};
const defer=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};

test('SIGNED_IN emitted during password login does not cancel the successful login',async()=>{
  const ui=await setup(async(_credentials,emit)=>{emit(tenant);await Promise.resolve();return tenant;});
  const result=await ui.render().login({email:'tenant@example.test',password:'test-only'});
  assert.equal(result.success,true);
  assert.equal(ui.render().currentUser.id,tenant.id);
  assert.equal(ui.render().isLoading,false);
});
test('failed login clears loading and permits later auth-state restoration',async()=>{
  const ui=await setup(async(_credentials,emit)=>{emit(null);throw new Error('Invalid credentials');});
  assert.equal((await ui.render().login({})).error,'Invalid credentials');
  assert.equal(ui.render().isLoading,false);
  assert.equal(ui.render().currentUser,null);
  ui.emit(tenant);
  assert.equal(ui.render().currentUser.id,tenant.id);
});
test('a genuinely newer login supersedes an earlier one without clearing its loading state',async()=>{
  const first=defer(),second=defer();let count=0;
  const ui=await setup(()=>++count===1?first.promise:second.promise);
  const older=ui.render().login({});
  const newer=ui.render().login({});
  first.resolve({id:'older',role:'tenant'});
  assert.equal((await older).success,false);
  assert.equal(ui.render().isLoading,true);
  second.resolve(tenant);
  assert.equal((await newer).success,true);
  assert.equal(ui.render().currentUser.id,tenant.id);
  assert.equal(ui.render().isLoading,false);
});
test('logout during a pending login prevents that stale login restoring the user',async()=>{
  const pending=defer();const ui=await setup(()=>pending.promise);
  const login=ui.render().login({});
  await ui.render().logout();
  pending.resolve(tenant);
  assert.equal((await login).success,false);
  assert.equal(ui.render().currentUser,null);
  assert.equal(ui.render().isLoading,false);
});
