import test from 'node:test';
import assert from 'node:assert/strict';
import {getGoogleNameFields} from '../src/auth/googleNameFields.js';
test('Google structured names preserve compound first and last names',()=>{
 assert.deepEqual(getGoogleNameFields({user_metadata:{given_name:' Maria Clara ',family_name:' De la Cruz ',full_name:'Maria Clara De la Cruz'}}),{firstName:'Maria Clara',lastName:'De la Cruz'});
});
test('Google full name fills both fields when structured names are unavailable',()=>{
 assert.deepEqual(getGoogleNameFields({user_metadata:{full_name:'Joshua Santos'}}),{firstName:'Joshua',lastName:'Santos'});
});
test('names can come from verified Google identity data',()=>{
 assert.deepEqual(getGoogleNameFields({identities:[{provider:'google',identity_data:{given_name:'Joshua',family_name:'Santos'}}]}),{firstName:'Joshua',lastName:'Santos'});
});
test('Gmail address alone is not used to guess a persons name',()=>{
 assert.deepEqual(getGoogleNameFields({email:'joshua.santos@gmail.com'}),{firstName:'',lastName:''});
});
