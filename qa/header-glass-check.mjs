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



try{await send('Runtime.enable');await send('Page.enable');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for(const width of [1920,1440,768,390]){
 await resize(width);await send('Page.navigate',{url:'http://127.0.0.1:5182/website-hosting/'});
 await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
 await evaluate(`document.querySelector('[data-brand-image]').decode()`);
 const poses=[];
 for(const selector of ['.wh-hero','.wh-intro','.wh-backups','.wh-features']){
  await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'})`);
  poses.push(await evaluate(`(()=>{const h=document.querySelector('.header'),s=getComputedStyle(h),r=h.getBoundingClientRect();return {background:s.backgroundColor,height:r.height,top:r.top,backdrop:s.backdropFilter}})()`));
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
 }
 poses.forEach(p=>assert.deepEqual(p,poses[0]));assert(poses[0].background.includes('0.9'));assert.equal(poses[0].height,width<768?64:70);assert(poses[0].backdrop.includes('blur(24px)'));
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.brand-emblem')).backgroundColor`),'rgba(0, 0, 0, 0)');
 await evaluate(`location.hash='hosting-solutions';new Promise(r=>setTimeout(r,80))`);
 assert.equal(await evaluate(`document.querySelector('#hosting-solutions').getBoundingClientRect().top>document.querySelector('.header').getBoundingClientRect().bottom`),true);
 for(const [name,selector] of [['dark','.wh-hero'],['light','.wh-intro']]){
 await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'})`);
 if(width===1440||width===390){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/header-glass-'+name+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
 }
 if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click()`);
 await evaluate(`document.querySelector('.dropdown-toggle').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);
 assert.equal(await evaluate(`document.activeElement.textContent`),'All Services');
 await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
 assert.equal(await evaluate(`document.activeElement.classList.contains('dropdown-toggle')`),true);
 assert.equal(await evaluate(`document.querySelectorAll('.dropdown-toggle').length`),1);
 console.log('PASS header contrast, geometry, anchor clearance and keyboard '+width);
}assert.deepEqual(errors,[]);}finally{socket.close();server.close()}
