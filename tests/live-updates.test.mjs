import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('live counts respond to matching mutations, reconnect and fallback, then clean up', async () => {
 const previous = {window:globalThis.window,document:globalThis.document,CustomEvent:globalThis.CustomEvent};
 const win = new EventTarget(); const doc = new EventTarget();
 const timers = new Map(); const timeouts = new Map(); let timerId=0; const channels=[]; const removed=[];
 win.setInterval=callback=>{timers.set(++timerId,callback);return timerId;};
 win.clearInterval=id=>timers.delete(id);
 win.setTimeout=callback=>{timeouts.set(++timerId,callback);return timerId;};
 win.clearTimeout=id=>timeouts.delete(id); doc.visibilityState='visible';
 globalThis.window=win; globalThis.document=doc;
 globalThis.CustomEvent=class extends Event {constructor(type,options){super(type);this.detail=options.detail;}};
 globalThis.__liveSupabase={channel(name){const channel={name,on(event,filter,callback){this.change=callback;this.filter=filter;return this;},subscribe(callback){this.status=callback;return this;}};channels.push(channel);return channel;},removeChannel(channel){removed.push(channel);return Promise.resolve();}};
 try {
  const source=readFileSync(new URL('../src/services/liveUpdates.js',import.meta.url),'utf8').replace('import { supabase } from "./supabaseClient";', 'const supabase=globalThis.__liveSupabase;');
  const {subscribeToLiveUpdates,notifyNotificationsChanged}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  let count=0; const stop=subscribeToLiveUpdates('user-a','notifications',async()=>{count++;});
  const tick=()=>new Promise(resolve=>setImmediate(resolve)); await tick(); assert.equal(count,1);
  notifyNotificationsChanged('user-b');await tick();assert.equal(count,1);
  const flush=async()=>{const callbacks=[...timeouts.values()];timeouts.clear();callbacks.forEach(callback=>callback());await tick();};
  notifyNotificationsChanged('user-a');channels[0].change();win.dispatchEvent(new Event('focus'));
  assert.equal(count,1,'Realtime bursts wait for the existing debounce');
  await flush();assert.equal(count,2,'Matching updates are coalesced into one refresh');
  channels[0].status('SUBSCRIBED');await flush();assert.equal(count,3);
  doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(count,3);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(count,4);
  timers.values().next().value();await flush();assert.equal(count,5);
  const stopSecond=subscribeToLiveUpdates('user-a','notifications',async()=>{});
  assert.notEqual(channels[0].name,channels[1].name);
  stopSecond();stop();assert.equal(timers.size,0);assert.equal(timeouts.size,0);assert.equal(removed.length,2);
  notifyNotificationsChanged('user-a');channels[0].change();await flush();assert.equal(count,5);
 } finally {Object.assign(globalThis,previous);delete globalThis.__liveSupabase;}
});
