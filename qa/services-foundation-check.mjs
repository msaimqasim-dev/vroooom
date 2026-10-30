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
const reports=[];try{await send('Page.enable');await send('Runtime.enable');for(const width of [1920,1440,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/services/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>setTimeout(r,1600))}},50)})`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);assert.equal(await evaluate(`document.querySelectorAll('main>section').length`),7);assert.equal(await evaluate(`document.querySelectorAll('[data-planned][hidden]').length`),5);assert.equal(await evaluate(`getComputedStyle(document.querySelector('h1')).opacity`),'1');assert.equal(await evaluate(`new URL(document.querySelector('[data-route="https://www.vroooom.com/what-we-offer/"]').href).pathname`),'/services/');assert.equal(await evaluate(`document.querySelector('.services-explore').hash`),'#services');const a=await evaluate(`getComputedStyle(document.querySelector('.services-light')).transform`);await evaluate(`new Promise(r=>setTimeout(r,200))`);assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.services-light')).transform`),a);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>setTimeout(r,50))`);assert.equal(await evaluate(`document.getAnimations().length`),0);assert.equal(await evaluate(`gsap.getTweensOf(document.querySelector('.services-light')).length`),0);if(width===1440||width===390){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/services-hero-'+width+'.png'),Buffer.from(shot.data,'base64'));}reports.push({width,overflow:'NONE',entrance:'PASS',motion:'PASS',reducedMotion:'PASS',placeholders:'PASS',navigation:'PASS'});console.log('PASS services foundation '+width);}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/services-foundation-results.json'),JSON.stringify({status:'PASS',reports},null,2));}finally{socket.close();server.close()}
