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
const reports=[];try{await send('Runtime.enable');await send('Page.enable');for(const width of [1920,1440,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/services/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.querySelectorAll('main>section').length`),7);assert.equal(await evaluate(`document.querySelectorAll('.service-editorial').length`),3);assert.equal(await evaluate(`document.querySelectorAll('.services-additional li').length`),6);assert.equal(await evaluate(`document.querySelectorAll('.services-projects article').length`),3);assert.equal(await evaluate(`document.querySelectorAll('[data-planned]').length`),0);await evaluate(`Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode()}))`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.deepEqual(await evaluate(`[...document.querySelectorAll('.service-editorial a')].map(a=>a.href)`),['http://127.0.0.1:5182/website-design/','http://127.0.0.1:5182/website-marketing/','http://127.0.0.1:5182/website-hosting/']);assert.equal(await evaluate(`new URL(document.querySelector('#contact .button').href).pathname`),'/contact-us/');for(let i=0;i<6;i++){await evaluate(`document.querySelectorAll('.services-additional li')[${i}].focus()`);assert.equal(await evaluate(`document.querySelector('.services-preview .is-active').dataset.servicePreview`),String(i));await evaluate(`document.querySelectorAll('.services-additional li')[${5-i}].dispatchEvent(new PointerEvent('pointerenter'))`);assert.equal(await evaluate(`document.querySelector('.services-preview .is-active').dataset.servicePreview`),String(5-i));}assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);assert.equal(await evaluate(`document.getAnimations().length`),0);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await evaluate(`new Promise(r=>setTimeout(r,100))`);assert((await evaluate(`ScrollTrigger.getAll().length`))>10);for(const id of ['services','core-services','additional-services','our-approach','featured-work','contact']){await evaluate(`document.getElementById('${id}').scrollIntoView({behavior:'instant'});ScrollTrigger.update();new Promise(r=>setTimeout(r,100))`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);}if(width===1440||width===390){await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});const clip=await evaluate(`(()=>{const e=document.querySelector('#core-services');e.scrollIntoView({behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});await writeFile(path.join(site,'qa/services-complete-'+width+'.png'),Buffer.from(shot.data,'base64'));}reports.push({width,sections:'PASS',images:'PASS',links:'PASS',motion:'PASS',overflow:'NONE'});console.log('PASS Services complete '+width);}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/services-complete-results.json'),JSON.stringify({status:'PASS',reports},null,2));}finally{socket.close();server.close()}
