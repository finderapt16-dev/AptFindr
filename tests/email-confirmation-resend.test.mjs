import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/auth/Signin.jsx',import.meta.url),'utf8');
const handler=source.match(/const resendVerification\s*=\s*async \(\) => \{[\s\S]*?\n        \};/)[0];
async function resend({email='',verificationEmail='',expired=true,cooldown=0}={}) {
  const calls=[];
  const fn=new Function('email','verificationEmail','location','resending','resendCooldown','setResending','setError','setSuccessMessage','setResendCooldown','resendSignupVerification',handler+';return resendVerification;');
  await fn(email,verificationEmail,{state:{allowResendVerification:expired}},false,cooldown,
    ()=>{},()=>{},()=>{},seconds=>calls.push({cooldown:seconds}),async email=>calls.push({email}))();
  return calls;
}
test('expired confirmation link resends to the email entered by the user',async()=>{
  assert.deepEqual(await resend({email:' user@example.com '}),[{email:'user@example.com'},{cooldown:60}]);
});
test('resend rejects invalid email and respects the existing resend cooldown',async()=>{
  assert.deepEqual(await resend({email:'invalid'}),[]);
  assert.deepEqual(await resend({email:'user@example.com',cooldown:30}),[]);
});
test('ordinary unconfirmed login keeps its existing verification-email resend flow',async()=>{
  assert.deepEqual(await resend({expired:false,verificationEmail:'pending@example.com'}),[{email:'pending@example.com'},{cooldown:60}]);
});
