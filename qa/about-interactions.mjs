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
 await send('Page.enable');await send('Runtime.enable');
 for(const width of [1440,390]){
  await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/about/'});
  await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&!document.querySelector('[data-review-next]').disabled){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
  await evaluate(`document.querySelector('#faqs').scrollIntoView({behavior:'instant'});document.querySelector('.about-faq-list summary').click();new Promise(r=>setTimeout(r,45))`);
  const mid=await evaluate(`(()=>{const e=document.querySelector('.about-faq-answer');return {current:e.getBoundingClientRect().height,full:e.scrollHeight,animations:e.getAnimations().length}})()`);assert(mid.current>0&&mid.current<mid.full);assert.equal(mid.animations,1);
  await evaluate(`new Promise(r=>setTimeout(r,350));document.querySelector('.about-faq-list summary').click();document.querySelector('.about-faq-list summary').click();new Promise(r=>setTimeout(r,350))`);
  assert.equal(await evaluate(`document.querySelector('.about-faq-list details').open`),true);
  await evaluate(`document.querySelector('#values').scrollIntoView({behavior:'instant'});document.querySelector('.about-value-list li').focus();new Promise(r=>setTimeout(r,500))`);
  assert(Math.abs(await evaluate(`new DOMMatrix(getComputedStyle(document.querySelector('.about-value-list h3')).transform).m41`)-10)<.01);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>setTimeout(r,50))`);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.about-value-list h3')).transform`),'none');
  reports.push({width,faqIntermediateHeight:mid,rapidReversal:'PASS',focus:'PASS',reducedMotion:'PASS'});
  console.log('PASS: '+width+' FAQ intermediate animation, rapid reversal, focus interaction and static reduced motion.');
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/about-interactions-results.json'),JSON.stringify({status:'PASS',reports},null,2));
}finally{socket.close();server.close()}
