import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const site = path.resolve('html-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(site + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(5182, '127.0.0.1', resolve));
const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
const tab = tabs.find(tab => tab.type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(message.error); else entry.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const resize = width => send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
try{
 await send('Runtime.enable');await send('Page.enable');await send('DOM.enable');await send('CSS.enable');
 for(const width of [1440,390]){
  await resize(width);await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
  await evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')&&document.querySelector('.services-stage').style.getPropertyValue('--stage-height')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}},50);})`);
  const doc=await send('DOM.getDocument');
  for(const [selector,read,expected] of [
   ['.why article',`getComputedStyle(document.querySelector('.why article')).backgroundColor`,'color(srgb 0.858824 0.752941 0.929412 / 0.2)'],
   ['#contact .button',`getComputedStyle(document.querySelector('#contact .button')).backgroundColor`,'rgb(84, 16, 112)'],
   ['.footer .back-top',`getComputedStyle(document.querySelector('.footer .back-top')).backgroundColor`,'rgb(84, 16, 112)'],
   ['.services-slide',`getComputedStyle(document.querySelector('.services-slide-detail')).opacity`,'1'],
  ]){
   const node=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});
   await send('CSS.forcePseudoState',{nodeId:node.nodeId,forcedPseudoClasses:['hover']});await evaluate(`new Promise(r=>setTimeout(r,500))`);
   assert.equal(await evaluate(read),expected);
   await send('CSS.forcePseudoState',{nodeId:node.nodeId,forcedPseudoClasses:[]});
  }
  await evaluate(`document.querySelector('.why article').focus();new Promise(r=>setTimeout(r,500))`);
  assert.equal(await evaluate(`getComputedStyle(document.activeElement,'::before').opacity`),'1');
  await evaluate(`document.querySelector('.services-slide').focus();new Promise(r=>setTimeout(r,600))`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.services-slide-detail')).opacity`),'1');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
  assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[1].dataset.active`),'true');
  await evaluate(`(()=>{const e=document.querySelector('.services-stage');for(const [type,x] of [['pointerdown',250],['pointerup',150]])e.dispatchEvent(new PointerEvent(type,{pointerType:'touch',pointerId:1,isPrimary:true,clientX:x,clientY:100,bubbles:true}));})()`);
  assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[2].dataset.active`),'true');
  await evaluate(`(()=>{const e=document.querySelector('.services-stage');for(const [type,x] of [['pointerdown',150],['pointerup',250]])e.dispatchEvent(new PointerEvent(type,{pointerType:'touch',pointerId:2,isPrimary:true,clientX:x,clientY:100,bubbles:true}));})()`);
  assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[1].dataset.active`),'true');
  if(width===390){
   await evaluate(`document.activeElement.blur();document.querySelector('.menu-toggle').click();document.querySelector('.mobile-nav a[data-section="services"]').click()`);
   assert.equal(await evaluate(`location.hash`),'#services');assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`),true);
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  console.log(`PASS ${width}px: row/button/footer/card hover, keyboard focus, carousel arrows and touch swipe.`);
 }
 assert.equal(await evaluate(`(async()=>{const saved=window.fetch;const host=document.createElement('div');window.fetch=()=>Promise.reject(new Error('QA network failure'));try{const {mountHeader}=await import('/js/components/header.js');try{await mountHeader(host);}catch{}return host.textContent.includes('Navigation could not load');}finally{window.fetch=saved;}})()`),true);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/homepage-interactions-results.json'),JSON.stringify({status:'PASS',widths:[1440,390],hover:'PASS',keyboard:'PASS',swipe:'PASS',mobileAnchor:'PASS',headerFailureFallback:'PASS'},null,2));
}finally{socket.close();server.close();}
