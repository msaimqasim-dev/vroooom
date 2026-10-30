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


const pages=['/','/about/','/portfolio/','/blog/','/contact-us/','/services/','/website-design/','/website-marketing/','/website-hosting/',...(await (await import('node:fs/promises')).readdir(path.join(site,'blog/posts'))).map(n=>'/blog/posts/'+n+'/')];
const servicePages=['/services/','/website-design/','/website-marketing/','/website-hosting/'];
const reports=[],checked=new Set(),networkErrors=[],consoleErrors=[];
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Network.responseReceived'&&m.params.response.url.startsWith('http://127.0.0.1:5182/')&&m.params.response.status>=400)networkErrors.push(m.params.response.url);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value||a.description));});
const ready=()=>evaluate(`new Promise((r,j)=>{let count=0;const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(r)}else if(++count>200){clearInterval(t);j(Error('Components missing'))}},50)})`);
try{
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for(const width of [1920,1440,768,390]){
 await resize(width);
 for(const page of (width===1920||width===768?servicePages:pages)){
  await send('Page.navigate',{url:'http://127.0.0.1:5182'+page});await ready();
  assert.equal(await evaluate(`document.querySelectorAll('.dropdown-toggle').length`),1);
  assert.equal(await evaluate(`new URL(document.querySelector('.nav-pair>a').href).pathname`),'/services/');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.nav-submenu a')].map(a=>[a.textContent,new URL(a.href).pathname])`),[['All Services','/services/'],['Website Design','/website-design/'],['Website Marketing','/website-marketing/'],['Website Hosting','/website-hosting/']]);
  assert.equal(await evaluate(`new URL(document.querySelector('.header-contact').href).pathname`),'/contact-us/');
  if(servicePages.includes(page)){
   assert.equal(await evaluate(`document.querySelector('.nav-pair>a').dataset.activeSection`),'true');
   assert.equal(await evaluate(`document.querySelector('.nav-submenu a[aria-current="page"]').pathname`),page);
   assert.equal(await evaluate(`document.title.includes('Vroooom')`),true);
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).fontFamily.includes('Manrope')`),true);
  }
  if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click()`);
  await evaluate(`document.querySelector('.dropdown-toggle').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.textContent`),'All Services');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`document.activeElement.textContent`),'Website Design');
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.classList.contains('dropdown-toggle')`),true);
  assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),true);
  if(width>1100){await evaluate(`document.activeElement.blur();document.querySelector('.nav-group').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);await evaluate(`document.querySelector('.nav-group').dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}))`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),true);}
  await evaluate(`document.querySelector('.dropdown-toggle').click()`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);
  await evaluate(`document.querySelector('.dropdown-toggle').click()`);
  const stale=await evaluate(`[...document.querySelectorAll('a[href]')].filter(a=>a.hostname==='www.vroooom.com'&&['/what-we-offer/','/website-design/','/website-marketing/','/website-hosting/','/contact-us/'].includes(a.pathname)&&!a.textContent.includes('Read the original reviews')).map(a=>a.href)`);assert.deepEqual(stale,[]);
  const links=await evaluate(`[...document.querySelectorAll('a[href],link[rel="stylesheet"],script[src]')].map(e=>e.href||e.src).filter(u=>u.startsWith(location.origin))`);
  for(const href of links){const url=new URL(href);url.hash='';if(checked.has(url.href))continue;assert.equal((await fetch(url)).status,200,href);checked.add(url.href);}
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
  await evaluate(`Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode()}))`);
  reports.push({width,page,status:'PASS'});console.log('PASS '+width+' '+page);
 }
}
// Follow each dropdown destination, including explicit index.html current-page detection.
for(const page of [...servicePages,'/website-hosting/index.html']){
 await send('Page.navigate',{url:'http://127.0.0.1:5182'+page});await ready();
 assert.equal(await evaluate(`document.querySelector('.nav-submenu a[aria-current="page"]').pathname`),page.replace('index.html',''));
 await evaluate(`document.querySelector('.menu-toggle').click();document.querySelector('.dropdown-toggle').click();document.querySelector('.nav-submenu a').click()`);await ready();
 assert.equal(await evaluate(`location.pathname`),'/services/');
}
assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(networkErrors,[]);
await writeFile(path.join(site,'qa/services-navigation-results.json'),JSON.stringify({status:'PASS',reports,checkedLocalURLs:checked.size},null,2));
}finally{socket.close();server.close()}
