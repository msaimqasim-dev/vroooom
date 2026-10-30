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
const reports=[];try{await send('Page.enable');await send('Runtime.enable');for(const width of [1920,1440,1024,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/blog/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('.blog-load-more')&&document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.querySelectorAll('[data-blog-card]:not([hidden])').length`),9);await evaluate(`document.querySelector('.blog-load-more').click()`);assert.equal(await evaluate(`document.querySelectorAll('[data-blog-card]:not([hidden])').length`),12);assert.equal(await evaluate(`document.querySelector('.blog-load-more').hidden`),true);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.blog-grid')).gridTemplateColumns.split(' ').length`),width>=1024?3:width>=768?2:1);await evaluate(`Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode()}))`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.equal(await evaluate(`new URL(document.querySelector('[data-route="https://www.vroooom.com/blog/"]').href).pathname`),'/blog/');const local=await evaluate(`[...new Set([...document.querySelectorAll('a[href^="posts/"]')].map(a=>a.href))]`);assert.equal(local.length,6);for(const url of local){await send('Page.navigate',{url});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);await evaluate(`Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode()}))`);assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.equal(await evaluate(`new URL(document.querySelector('.article-header>a').href).pathname`),'/blog/');assert((await evaluate(`document.querySelector('.article-body').textContent.length`))>200);}reports.push({width,loadMore:'PASS',images:'PASS',sixLocalArticles:'PASS',overflow:'NONE'});console.log('PASS blog '+width);}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/blog-results.json'),JSON.stringify({status:'PASS',reports},null,2));}finally{socket.close();server.close()}
