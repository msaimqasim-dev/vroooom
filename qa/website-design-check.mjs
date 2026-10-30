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
const reports=[];try{await send('Runtime.enable');await send('Page.enable');for(const width of [1920,1440,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/website-design/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.querySelectorAll('main>section').length`),8);for(const selector of ['.wd-rows li','.wd-timeline li','.wd-benefit-list article'])assert.equal(await evaluate(`document.querySelectorAll('${selector}').length`),4);assert.equal(await evaluate(`document.querySelectorAll('.wd-projects article').length`),3);assert.equal(await evaluate(`document.querySelectorAll('.wd-quotes figure').length`),2);await evaluate(`Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode()}))`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);assert.equal(await evaluate(`document.getAnimations().length`),0);assert.deepEqual(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash)`),[]);assert.equal(await evaluate(`new URL(document.querySelector('.wd-button').href).pathname`),'/contact-us/');if(width===1440||width===390){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/website-design-'+width+'.png'),Buffer.from(shot.data,'base64'));}await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await evaluate(`new Promise(r=>setTimeout(r,50))`);const poses=[];for(const p of [.2,.7,.2]){await evaluate(`(()=>{const t=ScrollTrigger.getAll().find(t=>t.vars.scrub===.5);scrollTo({top:t.start+(t.end-t.start)*${p},behavior:'instant'});ScrollTrigger.update()})();new Promise(r=>setTimeout(r,750))`);poses.push(await evaluate(`getComputedStyle(document.querySelector('.wd-progress>span')).transform`));}assert.notEqual(poses[0],poses[1]);assert.equal(poses[0],poses[2]);await evaluate(`new Promise(r=>setTimeout(r,200))`);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.wd-progress>span')).transform`),poses[2]);for(const e of ['.wd-why','.wd-promises','.wd-process','.wd-work','.wd-benefits','.wd-testimonials','#contact']){await evaluate(`document.querySelector('${e}').scrollIntoView({behavior:'instant'});ScrollTrigger.update()`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);}reports.push({width,images:'PASS',links:'PASS',timelineReverseAndStop:'PASS',reducedMotion:'PASS',overflow:'NONE'});console.log('PASS Website Design '+width);}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/website-design-results.json'),JSON.stringify({status:'PASS',reports},null,2));}finally{socket.close();server.close()}
