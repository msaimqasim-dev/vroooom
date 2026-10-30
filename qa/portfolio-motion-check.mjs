import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const site = path.resolve('html-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname));
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
const {getSpiralGeometry,getSpiralPosition}=await import('../../src/components/home/FeaturedWork/spiralConfig.js');
const trigger=`ScrollTrigger.getAll().find(t=>t.trigger.id==='work')`;
const transforms=`[...document.querySelectorAll('.spiral-card')].map(c=>c.style.transform)`;
const ready=`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(window.ScrollTrigger && ScrollTrigger.getAll().some(t=>t.trigger.id==='work')){clearInterval(timer);document.fonts.ready.then(()=>resolve(true));}else if(++count>200){clearInterval(timer);reject('Motion did not mount');}},50);})`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 for(const width of [1920,1440,768,390]){
  await resize(width);await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
  await evaluate(`Promise.all([...document.querySelectorAll('.spiral-card img')].map(i=>{i.loading='eager';return i.decode();})).then(()=>true)`);
  // Test-only next-content fixture: no subsequent website section is implemented.
  await evaluate(`(()=>{const next=document.createElement('div');next.id='qa-next';next.style.height='900px';document.querySelector('main').append(next);ScrollTrigger.refresh();})()`);
  const settings=await evaluate(`(()=>{const t=${trigger};return {scrub:t.vars.scrub,pin:t.vars.pin,duration:t.end-t.start,repeat:t.animation.repeat(),galleryWidth:document.querySelector('.spiral-gallery').clientWidth};})()`);
  assert.equal(settings.scrub,.7);assert.equal(settings.pin,true);assert.equal(settings.repeat,0);
  assert.equal(settings.duration,Math.round(900*getSpiralGeometry(settings.galleryWidth,900).scrollScreens));
  const samples=new Map();
  for(const progress of [0,.25,.5,.75,1,.75,.5,.25,0]){
   await evaluate(`(()=>{const t=${trigger};window.scrollTo({top:t.start+(t.end-t.start)*${progress},behavior:'instant'});ScrollTrigger.update();})()`);
   await evaluate(`new Promise(resolve=>setTimeout(resolve,850))`);
   const state=await evaluate(`(()=>{const t=${trigger},g=document.querySelector('.spiral-gallery');return {progress:t.animation.progress(),width:g.clientWidth,height:g.clientHeight,styles:${transforms},top:document.querySelector('.featured-work').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
   assert(Math.abs(state.progress-progress)<.001);
   assert.equal(state.overflow,false);
   if(progress>0 && progress<1) assert(Math.abs(state.top)<1);
   const geometry=getSpiralGeometry(state.width,state.height);
   const expected=Array.from({length:10},(_,i)=>getSpiralPosition(i,10,state.progress,geometry));
   const expectedStyles=await evaluate(`${JSON.stringify(expected)}.map(p=>{const c=document.createElement('span');c.style.transform='translate3d('+p.x+'px, '+p.y+'px, '+p.z+'px) rotateX('+p.rotateX+'deg) rotateY('+p.rotateY+'deg) rotateZ('+p.rotateZ+'deg) scale('+p.scale+')';return c.style.transform;})`);
   assert.deepEqual(state.styles,expectedStyles);
   if(samples.has(progress)) assert.deepEqual(state.styles,samples.get(progress));
   else samples.set(progress,state.styles);
   if(progress===.5){
    await evaluate(`new Promise(resolve=>setTimeout(resolve,300))`);
    assert.deepEqual(await evaluate(transforms),state.styles);
   }
  }
  await evaluate(`(()=>{const t=${trigger};window.scrollTo({top:t.end+200,behavior:'instant'});ScrollTrigger.update();})()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,850))`);
  assert.equal(await evaluate(`(()=>{const r=document.querySelector('#qa-next').getBoundingClientRect();return r.top<innerHeight && r.bottom>0 && document.querySelector('.featured-work').getBoundingClientRect().top<0;})()`),true);
  reports.push({width,geometry:'MATCHES REACT',reverse:'PASS',stop:'PASS',pinRelease:'PASS'});
 }
 // Repeated breakpoint changes keep exactly one portfolio trigger and pin spacer.
 for(const width of [1440,768,390,1440]){
  await resize(width);await evaluate(`new Promise(resolve=>setTimeout(resolve,450))`);
  assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.trigger.id==='work').length`),1);
  assert.equal(await evaluate(`document.querySelectorAll('.pin-spacer').length`),1);
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
 assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.trigger.id==='work').length`),0);
 assert.equal(await evaluate(`document.querySelectorAll('.pin-spacer').length`),0);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.spiral-gallery')).display`),'grid');
 assert.equal(await evaluate(`[...document.querySelectorAll('.spiral-card')].every(c=>getComputedStyle(c).transform==='none')`),true);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
 assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.trigger.id==='work').length`),1);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/portfolio-motion-results.json'),JSON.stringify({status:'PASS',reports,breakpointCleanup:'PASS',reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports,reducedMotion:'PASS',breakpointCleanup:'PASS'},null,2));
}finally{socket.close();server.close();}
