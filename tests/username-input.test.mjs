import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/services/authService.js',import.meta.url),'utf8');
const body=s.slice(s.indexOf('function resolveProfileUsername'),s.indexOf('function getEmailDisplayName'));
const resolve=new Function(body+';return resolveProfileUsername;')();
test('entered three-character username is retained without suffix',()=>assert.equal(resolve('deo'),'deo'));
test('username capitalization is preserved without generating a replacement',()=>assert.equal(resolve(' Deo_12 '),'Deo_12'));
test('missing or invalid usernames are rejected instead of generated',()=>{for(const value of [undefined,'','ab','bad name','x'.repeat(31)])assert.throws(()=>resolve(value),/Enter a username/);});
