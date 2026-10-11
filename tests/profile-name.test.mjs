import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/Settings.jsx',import.meta.url),'utf8');
const start=source.indexOf('function profileNameParts(user)');
const end=source.indexOf('function profileStateFromUser',start);
const parts=new Function('isTenantRole',source.slice(start,end)+';return profileNameParts;')(role=>role==='tenant');
test('tenant email prefix is not prefilled as a personal name',()=>{
 assert.deepEqual(parts({role:'tenant',email:'karldeo12@gmail.com',name:'karldeo12'}),[]);
});
test('saved personal names are still displayed',()=>{
 assert.deepEqual(parts({role:'tenant',email:'karldeo12@gmail.com',name:'Karl Santos'}),['Karl','Santos']);
});
test('legacy username fallback stays blank',()=>{
 assert.deepEqual(parts({role:'tenant',username:'karldeo12',name:'karldeo12'}),[]);
});
