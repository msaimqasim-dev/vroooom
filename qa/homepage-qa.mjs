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
const reference=http.createServer(async(req,res)=>{
 try{const root=path.resolve('dist');const pathname=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>reference.listen(5183,'127.0.0.1',resolve));
const localFailures=[];
socket.addEventListener('message',({data})=>{
 const m=JSON.parse(data);
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&m.params.response.url.startsWith('http://127.0.0.1:5182/')&&!m.params.response.url.endsWith('/favicon.ico'))localFailures.push({url:m.params.response.url,status:m.params.response.status});
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push({console:m.params.args.map(a=>a.value||a.description)});
});
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('.header')&&document.querySelector('footer')&&document.querySelectorAll('.spiral-card').length===10&&document.querySelector('.services-stage').style.getPropertyValue('--stage-height')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>250){clearInterval(t);reject('Homepage not ready');}},50);})`;
const selectors=['.header','.hero','.agency-intro','.featured-work','.marquee','.why','.services-showcase','#process','.recognition','#contact','.footer'];
const metrics=`(()=>{const selectors=${JSON.stringify(selectors)};return selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e),h=e.querySelector('h1,h2')||e.querySelector('.logo')||e;return {selector,width:r.width,height:r.height,padding:s.padding,color:s.color,background:(()=>{let n=e;while(n){const c=getComputedStyle(n).backgroundColor;if(c!=='rgba(0, 0, 0, 0)')return c;n=n.parentElement;}return s.backgroundColor;})(),headingFont:getComputedStyle(h).fontFamily,headingSize:getComputedStyle(h).fontSize,headText:h.textContent.replace(/\\s/g,''),headWeight:getComputedStyle(h).fontWeight};});})()`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 for(const width of [1920,1440,1024,768,390]){
  await resize(width);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const pair=[];
  for(const port of [5182,5183]){
   await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
   if(port===5182)await evaluate(ready);else await evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(document.querySelector('footer')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}},50);})`);
   await evaluate(`document.documentElement.style.overflow='hidden';new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   pair.push(await evaluate(metrics));
  }
  pair[0].forEach((actual,i)=>{
   const expected=pair[1][i];
   for(const field of ['width','height']){
    if(actual.selector==='.footer'&&field==='height')continue; // Task 13 approved spacing change.
    assert(Math.abs(actual[field]-expected[field])<1,`${width} ${actual.selector}.${field}: ${actual[field]} vs ${expected[field]}`);
   }
   // The authorized purple rebrand supersedes React colors; purple-theme-check.mjs validates the palette.
   for(const field of ['padding','headingFont','headingSize','headWeight'])assert.equal(actual[field],expected[field],`${width} ${actual.selector}.${field}`);
   // Marquee repeat count is doubled to prevent a wide-screen seam (Task 06).
   if(actual.selector!=='.marquee')assert.equal(actual.headText.replace(/\s/g,''),expected.headText.replace(/\s/g,''),`${width} ${actual.selector} content`);
  });
  await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
  assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);
  assert.equal(await evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size;})()`),true);
  assert.deepEqual(await evaluate(`[...document.images].filter(i=>!i.hasAttribute('alt')).map(i=>i.src)`),[]);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)`),[]);
  assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);
  assert.equal(await evaluate(`document.getAnimations().length`),0);
  // Verify all images decode without changing their asset paths or shipped loading policy.
  await evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode();})).then(()=>true)`);
  assert.equal(await evaluate(`[...document.images].every(i=>i.complete&&i.naturalWidth>0)`),true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
  await evaluate(`document.querySelector('.skip').focus();document.querySelector('.skip').click()`);
  assert.equal(await evaluate(`document.activeElement.id`),'main');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const linkTargets=await evaluate(`[...document.querySelectorAll('.desktop-nav a,.header-contact')].map(a=>a.getAttribute('href'))`);
  assert.deepEqual(linkTargets,['#work','#services','http://127.0.0.1:5182/about/','#process','#contact']);
  if(width<768){
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.close-icon')).display`),'none');
   await evaluate(`document.querySelector('.menu-toggle').focus();document.querySelector('.menu-toggle').click()`);
   assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`),false);
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.menu-icon')).display`),'none');
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.close-icon')).display`),'block');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
   assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert&&document.activeElement===document.querySelector('.menu-toggle')`),true);
  }
  const animationState=await evaluate(`({hero:document.querySelectorAll('.hero-column').length,heroDuration:document.querySelector('.hero-column').getAnimations()[0].effect.getTiming().duration,footerDuration:document.querySelector('.footer-column').getAnimations()[0].effect.getTiming().duration,agencyFloat:gsap.getTweensOf(document.querySelectorAll('.agency-card-float')).filter(t=>t.repeat()===-1).length,spiralPins:ScrollTrigger.getAll().filter(t=>t.trigger.id==='work').length,illustrations:document.querySelectorAll('.process-visual').length})`);
  assert.deepEqual(animationState,{hero:8,heroDuration:10000,footerDuration:6000,agencyFloat:4,spiralPins:1,illustrations:0});
  const snapshots=[];
  for(const progress of [.2,.7,.2]){
   await evaluate(`(()=>{const t=ScrollTrigger.getAll().find(t=>t.trigger.id==='work');window.scrollTo({top:t.start+(t.end-t.start)*${progress},behavior:'instant'});ScrollTrigger.update();})()`);
   await evaluate(`new Promise(r=>setTimeout(r,800))`);
   snapshots.push(await evaluate(`[...document.querySelectorAll('.spiral-card')].map(e=>e.style.transform)`));
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
  }
  assert.notDeepEqual(snapshots[0],snapshots[1]);assert.deepEqual(snapshots[0],snapshots[2]);
  await evaluate(`new Promise(r=>setTimeout(r,200))`);assert.deepEqual(await evaluate(`[...document.querySelectorAll('.spiral-card')].map(e=>e.style.transform)`),snapshots[2]);
  for(const selector of ['.hero','.agency-intro','.why','#services','#process','.recognition','#contact','footer']){
   await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant'});ScrollTrigger.update();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
  }
  await evaluate(`document.querySelector('#services').scrollIntoView({behavior:'instant'})`);
  for(const direction of [1,1,1,1,1,-1,-1,-1,-1,-1]){
   await evaluate(`document.querySelector('[aria-label="${direction===1?'Next':'Previous'} service"]').click();new Promise(r=>setTimeout(r,740))`);
  }
  assert.equal(await evaluate(`document.querySelector('.services-slide').dataset.active`),'true');
  const summary=await evaluate(`({brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),overflow:document.documentElement.scrollWidth>innerWidth,sectionCount:document.querySelectorAll('main section').length})`);
  assert.deepEqual(summary.brokenImages,[]);assert.equal(summary.overflow,false);assert.equal(summary.sectionCount,8);
  await evaluate(`document.querySelector('footer .back-top').click();new Promise(resolve=>{let n=0;const timer=setInterval(()=>{if(scrollY===0||++n>60){clearInterval(timer);resolve(true);}},50);})`);assert.equal(await evaluate(`scrollY`),0);
  reports.push({width,reactComparison:'PASS geometry/typography/content (purple palette intentionally replaces React colors)',reducedMotion:'PASS',navigationAndFocus:'PASS',spiralReverseAndStop:'PASS',carousel:'PASS',images:'PASS',overflow:'NONE'});
  console.log(`PASS ${width}px`);
 }
 assert.deepEqual(localFailures,[]);assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/homepage-qa-results.json'),JSON.stringify({status:'PASS',reports,localFailures,runtimeErrors:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports},null,2));
}finally{socket.close();server.close();reference.close();}
