import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const site = path.resolve('html-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(site, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
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

const reports=[];
try {
await send('Runtime.enable');await send('Page.enable');
for(const width of [1920,1440,768,390]){
 await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:5182/website-marketing/'});
 await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
 assert.equal(await evaluate(`document.querySelectorAll('main>section').length`),6);
 assert.equal(await evaluate(`document.querySelectorAll('[data-solution]').length`),6);
 assert.equal(await evaluate(`document.querySelectorAll('.wm-timeline li').length`),5);
 await evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()}))`);
 for(let i=0;i<6;i++){
  await evaluate(`document.querySelectorAll('[data-solution]')[${i}].focus()`);
  assert.equal(await evaluate(`document.querySelector('[data-solution][aria-expanded="true"]').dataset.solution`),String(i));
  assert.equal(await evaluate(`document.querySelectorAll('.wm-row figure:not([hidden])').length`),1);
  await evaluate(`document.querySelectorAll('.wm-row')[${5-i}].dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))`);
  assert.equal(await evaluate(`document.querySelector('[aria-expanded="true"][data-solution]').dataset.solution`),String(5-i));
  await evaluate(`document.querySelectorAll('[data-solution]')[${i}].click()`);
  assert.equal(await evaluate(`document.querySelector('[aria-expanded="true"][data-solution]').dataset.solution`),String(i));
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
 }
 await evaluate(`document.querySelector('[data-solution="0"]').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);
 assert.equal(await evaluate(`document.activeElement.dataset.solution`),'1');
 assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);
 assert.equal(await evaluate(`document.getAnimations().length`),0);
 assert.equal(await evaluate(`new URL(document.querySelector('.wm-button').href).pathname`),'/contact-us/');
 assert.equal(await evaluate(`new URL(document.querySelector('[data-route="websiteMarketing"]').href).pathname`),'/website-marketing/');
 assert.deepEqual(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash)`),[]);
 if(width===1440||width===390){
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:await evaluate(`({x:0,y:0,width:innerWidth,height:document.documentElement.scrollHeight,scale:1})`)});
  await writeFile(path.join(site,'qa/website-marketing-'+width+'.png'),Buffer.from(shot.data,'base64'));
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(`new Promise(r=>setTimeout(r,100))`);
 const poses=[];
 for(const p of [.2,.7,.2]){
  await evaluate(`(()=>{const t=ScrollTrigger.getAll().find(t=>t.vars.scrub===.5);scrollTo({top:t.start+(t.end-t.start)*${p},behavior:'instant'});ScrollTrigger.update()})();new Promise(r=>setTimeout(r,800))`);
  poses.push(await evaluate(`getComputedStyle(document.querySelector('.wm-progress>span')).transform`));
 }
 assert.notEqual(poses[0],poses[1]);assert.equal(poses[0],poses[2]);
 await evaluate(`new Promise(r=>setTimeout(r,200))`);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.wm-progress>span')).transform`),poses[2]);
 for(const selector of ['.wm-intro','.wm-solutions','.wm-process','.wm-matters','#contact']){
 await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'});ScrollTrigger.update()`);
 assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
 }
 reports.push({width,images:'PASS',sixPreviewsPointerKeyboardClick:'PASS',reverseAndStop:'PASS',reducedMotion:'PASS',overflow:'NONE'});console.log('PASS Marketing '+width);
}
assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/website-marketing-results.json'),JSON.stringify({status:'PASS',reports},null,2));
}finally{socket.close();server.close()}
