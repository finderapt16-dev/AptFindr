import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAccountDetails} from '../src/auth/signupValidation.js';
const source=readFileSync(new URL('../src/services/authService.js',import.meta.url),'utf8');
const start=source.indexOf('export async function loginUser(credentials)');
const end=source.indexOf('export async function resendSignupVerification',start);
const loginSource=source.slice(start,end).replace('export async function','async function');
const createLogin=new Function('supabaseClient','requiresPendingEmailVerification','ensureProfileForAuthUser','assertActiveAccount','recordLogin','persistCurrentUser',loginSource+';return loginUser;');
for(const role of ['tenant','landlord']) {
 test(role+' signs in directly with normalized email and unchanged password', async()=>{
  let submitted;let persisted;
  const client={rpc(){throw Error('Username lookup must not be used');},auth:{signInWithPassword:async credentials=>{submitted=credentials;return {data:{user:{id:'auth-id'}}};}}};
  const login=createLogin(client,()=>false,async()=>({id:'profile-id',role}),()=>{},async()=>{},profile=>{persisted=profile;});
  assert.equal((await login({email:' User@Example.com ',password:' Strong123 '})).role,role);
  assert.deepEqual(submitted,{email:'user@example.com',password:' Strong123 '});assert.equal(persisted.role,role);
 });
}
test('invalid or missing email is rejected before authentication',async()=>{
 let called=false;
 const login=createLogin({auth:{signInWithPassword:()=>{called=true;}}},()=>false,()=>{},()=>{},()=>{},()=>{});
 await assert.rejects(login({username:'old_user',password:'Strong123'}),/Email address/);
 await assert.rejects(login({email:'invalid',password:'Strong123'}),/valid email/);
 assert.equal(called,false);
});
test('signup validates email and passwords without requiring username',()=>{
 assert.deepEqual(validateAccountDetails({email:'user@example.com',password:'Strong123',confirmPassword:'Strong123'}),{});
 assert.ok(validateAccountDetails({email:'invalid',password:'Strong123',confirmPassword:'Strong123'}).email);
});
