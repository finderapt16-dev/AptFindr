import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/services/authService.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function assertUsernameAvailable'),source.indexOf('export async function signupUser'));
const check=result=>new Function('supabaseClient',body+';return assertUsernameAvailable;')({rpc:async()=>result});
test('available username passes',async()=>{await check({data:true})('karl');});
test('duplicate username is rejected',async()=>{await assert.rejects(check({data:false})('karl'),/already taken/);});
test('failed availability lookup blocks signup',async()=>{await assert.rejects(check({error:{message:'offline'}})('karl'),/Unable to check/);});
