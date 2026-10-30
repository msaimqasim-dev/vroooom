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

const pages=['/','/about/','/portfolio/','/blog/','/contact-us/','/services/','/website-marketing/','/website-design/',... (await (await import('node:fs/promises')).readdir(path.join(site,'blog/posts'))).map(n=>'/blog/posts/'+n+'/')];
try {
 await send('Runtime.enable'); await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1440,390]) {
  await resize(width);
  for(const page of pages) {
   await send('Page.navigate',{url:'http://127.0.0.1:5182'+page});
   await evaluate(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(timer);resolve()}else if(++count>200){clearInterval(timer);reject(Error('Shared components missing'))}},50)})`);
   assert.equal(await evaluate(`new URL(document.querySelector('[data-route="websiteMarketing"]').href).pathname`),'/website-marketing/');
   if(page==='/services/')assert.equal(await evaluate(`new URL(document.querySelectorAll('.service-editorial a')[1].href).pathname`),'/website-marketing/');
   await evaluate(`(()=>{if(innerWidth<=1100)document.querySelector('.menu-toggle').click();document.querySelector('.dropdown-toggle').click();document.querySelector('[data-route="websiteMarketing"]').click()})()`);
   await evaluate(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(location.pathname==='/website-marketing/'&&document.querySelector('footer')&&document.querySelector('.wm-hero')&&document.querySelector('.header')){clearInterval(timer);resolve()}else if(++count>200){clearInterval(timer);reject(Error('Navigation failed'))}},50)})`);
   await evaluate(`Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode()}))`);
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.wm-hero')).position`),'relative');
   assert.equal(await evaluate(`document.querySelector('script[src$="website-marketing.js"]')!==null`),true);
   const resources=await evaluate(`[...document.querySelectorAll('link[rel="stylesheet"],script[src]')].map(e=>e.href||e.src)`);
   for(const url of resources.filter(url=>url.startsWith('http://127.0.0.1:5182/')))assert.equal((await fetch(url)).status,200,url);
   console.log('PASS '+width+' '+page+' -> /website-marketing/');
  }
 }
 assert.deepEqual(errors,[]);
} finally {socket.close();server.close()}

