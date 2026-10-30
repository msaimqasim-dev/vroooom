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
 await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header[data-theme]')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
 for(const theme of ['dark','light']){
 await evaluate(`(()=>{const e=document.querySelector('[data-nav-theme="${theme}"]'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+150,behavior:'instant'})})();new Promise(r=>setTimeout(r,100))`);
 assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),theme);
 const colors=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.header-contact'));return [s.backgroundColor,s.color]})()`);
 assert.deepEqual(colors,theme==='dark'?['rgb(255, 255, 255)','rgb(24, 12, 34)']:['rgb(107, 11, 142)','rgb(255, 255, 255)']);
 if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click();new Promise(r=>setTimeout(r,50))`);
 const alignment=await evaluate(`(()=>{const a=document.querySelector('.nav-pair>a').getBoundingClientRect(),s=document.querySelector('.dropdown-toggle svg').getBoundingClientRect();return {offset:Math.abs(a.top+a.height/2-s.top-s.height/2),size:s.width,gap:getComputedStyle(document.querySelector('.nav-pair')).gap}})()`);
 assert(alignment.offset<1);assert.equal(alignment.size,12);assert.equal(alignment.gap,'6px');
 await evaluate(`document.querySelector('.dropdown-toggle').click()`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);
 await evaluate(`document.querySelector('.dropdown-toggle').click()`);
 if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click()`);
 assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
 assert.equal(await evaluate(`document.querySelector('.header').getBoundingClientRect().height`),width<768?64:70);
 }
 console.log('PASS navbar CTA themes, chevron and dropdown '+width);
}assert.deepEqual(errors,[]);}finally{socket.close();server.close()}
