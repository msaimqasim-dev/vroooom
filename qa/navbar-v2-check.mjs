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

try{await send('Page.enable');await send('Runtime.enable');for(const width of [1920,1440,1024,768,390]){await resize(width);await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('.header img')?.complete){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);if(width<=1100){await evaluate(`document.querySelector('.menu-toggle').click();new Promise(r=>setTimeout(r,300))`);assert.equal(await evaluate(`document.querySelector('nav').inert`),false);}await evaluate(`document.querySelector('.dropdown-toggle').click()`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),true);assert.equal(await evaluate(`document.querySelector('.header img').naturalWidth`),2048);await evaluate(`document.querySelector('.dropdown-toggle').focus();document.querySelector('.dropdown-toggle').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);assert.equal(await evaluate(`document.activeElement===document.querySelector('.nav-submenu a')`),true);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});if(width>1100){await evaluate(`document.activeElement.blur();document.querySelector('.nav-group').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);await evaluate(`document.querySelector('.nav-group').dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}))`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),true);}console.log('PASS navbar '+width)}assert.deepEqual(errors,[])}finally{socket.close();server.close()}
