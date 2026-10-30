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
const reports=[];
try{await send('Runtime.enable');await send('Page.enable');
for(const width of [1440,390]){
 await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const page of pages){
  await send('Page.navigate',{url:'http://127.0.0.1:5182'+page});
  await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header[data-theme]')){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
  const count=await evaluate(`document.querySelectorAll('[data-nav-theme]').length`);
  const seen=new Set();
  for(let i=0;i<count;i++){
   await evaluate(`(()=>{const e=document.querySelectorAll('[data-nav-theme]')[${i}],r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+Math.min(r.height/2,140)-50,behavior:'instant'})})();new Promise(r=>setTimeout(r,70))`);
   const result=await evaluate(`(()=>{const h=document.querySelector('.header'),r=h.getBoundingClientRect(),els=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2);const e=els.find(e=>!h.contains(e)&&e.closest('[data-nav-theme]'));return{actual:h.dataset.theme,expected:e?.closest('[data-nav-theme]').dataset.navTheme}})()`);
   assert.equal(result.actual,result.expected,page+' section '+i);seen.add(result.actual);
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
  }
  assert(seen.has('light'),page);if(!page.includes('/posts/'))assert(seen.has('dark'),page);
  for(const theme of ['dark','light']){
   await evaluate(`(()=>{const e=document.querySelector('[data-nav-theme="${theme}"]'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+Math.min(r.height/2,140)-50,behavior:'instant'})})();new Promise(r=>setTimeout(r,70))`);
   if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click()`);
   await evaluate(`document.querySelector('.dropdown-toggle').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);
   assert.equal(await evaluate(`document.activeElement.textContent`),'All Services');
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.nav-submenu')).color===getComputedStyle(document.querySelector('.header')).color`),true);
   await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
   if(width<=1100)await evaluate(`document.querySelector('.menu-toggle').click()`);
  }
  reports.push({page,width,status:'PASS',regions:count});console.log('PASS adaptive '+width+' '+page);
 }
}
// Real pinned spiral and reverse scroll with ordinary motion enabled.
await resize(1440);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&window.ScrollTrigger?.getAll().some(t=>t.pin)){clearInterval(t);r()}},50)})`);
for(const p of [.2,.7,.2]){await evaluate(`(()=>{const t=ScrollTrigger.getAll().find(t=>t.pin);scrollTo({top:t.start+(t.end-t.start)*${p},behavior:'instant'});ScrollTrigger.update()})();new Promise(r=>setTimeout(r,650))`);assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),'dark');}
assert.equal(await evaluate(`getComputedStyle(document.querySelector('.header')).transitionDuration.split(', ').every(t=>t==='0.45s')`),true);

await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for(const width of [1440,390]){
 await resize(width);
 await evaluate(`ScrollTrigger.refresh();scrollTo({top:0,behavior:'instant'});new Promise(r=>setTimeout(r,100))`);
 for(const [name,offset] of [['dark',-30],['light',30]]){
 await evaluate(`(()=>{const h=document.querySelector('.header').getBoundingClientRect(),e=document.querySelector('#about').getBoundingClientRect();scrollTo({top:scrollY+e.top-h.top-h.height/2+${offset},behavior:'instant'})})();new Promise(r=>setTimeout(r,100))`);
 assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),name);
 const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/adaptive-header-'+name+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
 }
 for(const offset of [-3,3,-2,2]){
 await evaluate(`(()=>{const h=document.querySelector('.header').getBoundingClientRect(),e=document.querySelector('#about').getBoundingClientRect();scrollTo({top:scrollY+e.top-h.top-h.height/2+${offset},behavior:'instant'})})();new Promise(r=>setTimeout(r,70))`);
 assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),'light');
 }
}
assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/adaptive-header-results.json'),JSON.stringify({status:'PASS',reports,pinnedReverse:'PASS'},null,2));
}finally{socket.close();server.close()}
