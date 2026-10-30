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
try{await send('Page.enable');await send('Runtime.enable');for(const width of [1920,1440,1024,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});for(const route of ['/','/about/','/portfolio/']){await send('Page.navigate',{url:'http://127.0.0.1:5182'+route});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header img')?.complete){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false,route+width);assert.equal(await evaluate(`document.querySelector('.header img').naturalWidth`),2048);if(width<=1100){await evaluate(`document.querySelector('.menu-toggle').click()`);assert.equal(await evaluate(`document.querySelector('nav').inert`),false);}await evaluate(`document.querySelectorAll('.dropdown-toggle')[1].click()`);assert.equal(await evaluate(`document.querySelectorAll('.nav-submenu')[1].hidden`),false);assert.equal(await evaluate(`new URL(document.querySelectorAll('.nav-submenu')[1].querySelector('a').href).pathname+new URL(document.querySelectorAll('.nav-submenu')[1].querySelector('a').href).hash`),'/portfolio/#websites');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelectorAll('.nav-submenu')[1].hidden`),true);if(width<=1100)await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});}
 assert.deepEqual(await evaluate(`Promise.all([...document.images].map(async i=>{i.loading='eager';try{await i.decode();return null}catch{return i.src}})).then(a=>a.filter(Boolean))`),[]);assert.equal(await evaluate(`document.querySelectorAll('.website-project').length`),34);assert.equal(await evaluate(`document.querySelectorAll('.logo-project').length`),12);assert.equal(await evaluate(`document.querySelectorAll('main>section').length`),6);assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);assert.deepEqual(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash)`),[]);
 for(let i=0;i<12;i++){await evaluate(`document.querySelectorAll('[data-logo]')[${i}].click();document.querySelector('dialog img').decode()`);assert.equal(await evaluate(`document.querySelector('dialog').open`),true);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await evaluate(`new Promise(r=>setTimeout(r,60))`);assert.equal(await evaluate(`document.querySelector('dialog').open`),false);assert.equal(await evaluate(`document.activeElement.dataset.logo`),String(i));}
 await evaluate(`document.querySelector('[data-logo]').click()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});assert.equal(await evaluate(`document.querySelector('dialog h2').textContent`),"Martin's Tree service");await evaluate(`document.querySelector('[data-close]').click()`);
 assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);assert.equal(await evaluate(`document.getAnimations().length`),0);
 if(width===1440||width===390){await evaluate(`scrollTo({top:0,behavior:'instant'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/portfolio-page-'+width+'.png'),Buffer.from(shot.data,'base64'));}
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await evaluate(`new Promise(r=>setTimeout(r,100))`);assert((await evaluate(`ScrollTrigger.getAll().length`))>0);reports.push({width,threePageNavigation:'PASS',images:'PASS',lightbox:'PASS',reducedMotion:'PASS',overflow:'NONE'});console.log('PASS portfolio and shared navbar '+width);
}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/portfolio-page-results.json'),JSON.stringify({status:'PASS',reports},null,2));}finally{socket.close();server.close()}
