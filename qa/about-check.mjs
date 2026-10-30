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
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('.header')&&document.querySelector('footer')&&!document.querySelector('[data-review-next]').disabled){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>150){clearInterval(t);reject('About page not ready')}},50)})`;
const failures=[];const reports=[];
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&m.params.response.url.startsWith('http://127.0.0.1:5182/')&&!m.params.response.url.endsWith('favicon.ico'))failures.push(m.params.response.url);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args);});
try {
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 for(const width of [1920,1440,1024,768,390]){
  await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await send('Page.navigate',{url:'http://127.0.0.1:5182/about/'});await evaluate(ready);
  await evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()})).then(()=>true)`);
  await evaluate(`new Promise(r=>setTimeout(r,1600))`);
  const structure=await evaluate(`({sections:document.querySelectorAll('main > section').length,h1:document.querySelectorAll('h1').length,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),anchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth||!i.hasAttribute('alt')).map(i=>i.src),team:[...document.querySelectorAll('.about-person h3')].map(e=>e.textContent),values:document.querySelectorAll('.about-value-list li').length,milestones:document.querySelectorAll('.about-timeline li').length,faqs:document.querySelectorAll('.about-faq-list details').length,overflow:document.documentElement.scrollWidth>innerWidth,aboutLink:new URL(document.querySelector('a[data-section="about"]').href).pathname,aboutCurrent:document.querySelector('a[data-section="about"]').getAttribute('aria-current'),work:new URL(document.querySelector('a[data-section="work"]').href).pathname+new URL(document.querySelector('a[data-section="work"]').href).hash})`);
  assert.equal(structure.sections,9);assert.equal(structure.h1,1);assert.equal(structure.ids.length,new Set(structure.ids).size);assert.deepEqual(structure.anchors,[]);assert.deepEqual(structure.images,[]);assert.equal(structure.values,7);assert.equal(structure.milestones,6);assert.equal(structure.faqs,7);assert.equal(structure.overflow,false);assert.equal(structure.aboutLink,'/about/');assert.equal(structure.aboutCurrent,'page');assert.equal(structure.work,'/index.html#work');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.footer-grid a')].filter(a=>a.href.includes('/about/')).map(a=>new URL(a.href).hash)`),['#team','#awards']);
  assert.equal(await evaluate(`document.querySelector('#contact .button').href`),'https://www.vroooom.com/contact-us/');
  await evaluate(`document.querySelector('.skip').focus();document.querySelector('.skip').click()`);assert.equal(await evaluate(`document.activeElement.id`),'main');
  if(width<768){await evaluate(`document.querySelector('.menu-toggle').focus();document.querySelector('.menu-toggle').click()`);assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`),false);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert&&document.activeElement===document.querySelector('.menu-toggle')`),true);}
  const poses=[];
  for(const progress of [.25,.75,.25]){await evaluate(`(()=>{const t=ScrollTrigger.getAll().find(t=>t.vars.scrub===.5);scrollTo({top:t.start+(t.end-t.start)*${progress},behavior:'instant'});ScrollTrigger.update()})();new Promise(r=>setTimeout(r,700))`);poses.push(await evaluate(`getComputedStyle(document.querySelector('.about-timeline-rail > span')).transform`));}
  assert.notEqual(poses[0],poses[1]);assert.equal(poses[0],poses[2]);await evaluate(`new Promise(r=>setTimeout(r,200))`);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.about-timeline-rail > span')).transform`),poses[2]);
  await evaluate(`document.querySelector('#testimonials').scrollIntoView({behavior:'instant'})`);
  const heights=[];
  for(let i=0;i<8;i++){const direction=i<4?'next':'prev';await evaluate(`document.querySelector('[data-review-${direction}]').click();new Promise(r=>setTimeout(r,500))`);const state=await evaluate(`({visible:[...document.querySelectorAll('[data-review]')].filter(e=>!e.hidden).length,index:[...document.querySelectorAll('[data-review]')].findIndex(e=>!e.hidden),height:document.querySelector('.about-review-stage').offsetHeight})`);assert.equal(state.visible,1);assert.equal(state.index,i<4?(i+1)%4:(7-i)%4);heights.push(state.height);}
  assert.equal(new Set(heights).size,1,'Testimonial stage shifts');
  await evaluate(`document.querySelector('[data-review-goto="2"]').click();new Promise(r=>setTimeout(r,500))`);assert.equal(await evaluate(`document.querySelectorAll('[data-review]')[2].hidden`),false);
  await evaluate(`document.querySelector('[data-review-next]').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});assert.equal(await evaluate(`document.querySelectorAll('[data-review]')[1].hidden`),false);
  await evaluate(`document.querySelector('#faqs').scrollIntoView({behavior:'instant'})`);
  for(let i=0;i<7;i++){await evaluate(`document.querySelectorAll('.about-faq-list summary')[${i}].click();new Promise(r=>setTimeout(r,350))`);assert.equal(await evaluate(`document.querySelectorAll('.about-faq-list details')[${i}].open`),true);await evaluate(`document.querySelectorAll('.about-faq-list summary')[${i}].click();new Promise(r=>setTimeout(r,350))`);assert.equal(await evaluate(`document.querySelectorAll('.about-faq-list details')[${i}].open`),false);}
  await evaluate(`document.querySelector('.about-faq-list summary').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await evaluate(`new Promise(r=>setTimeout(r,350))`);assert.equal(await evaluate(`document.querySelector('.about-faq-list details').open`),true);
  for(const selector of ['.about-hero','#who-we-are','#history','#team','#values','#awards','#testimonials','#faqs','#contact','footer']){await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'});ScrollTrigger.update();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false,selector+' overflow');}
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>setTimeout(r,100))`);
  assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);assert.equal(await evaluate(`document.getAnimations().length`),0);
  await evaluate(`document.querySelector('[data-review-next]').click()`);assert.equal(await evaluate(`document.querySelectorAll('[data-review]')[2].hidden`),false);
  await evaluate(`document.querySelector('.about-faq-list summary').click()`);assert.equal(await evaluate(`document.querySelector('.about-faq-list details').open`),false);
  if(width===1440||width===390){
   for(const [name,selector] of [['hero','.about-hero'],['team','#team'],['awards','#awards'],['faq','#faqs']]){const clip=await evaluate(`(()=>{const e=document.querySelector('${selector}');e.scrollIntoView({behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});await writeFile(path.join(site,'qa/about-'+name+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await evaluate(`new Promise(r=>setTimeout(r,100))`);
  assert((await evaluate(`ScrollTrigger.getAll().length`))>0);
  // An independent initializer must release only its own triggers/listeners.
  const cleanup=await evaluate(`(async()=>{const {initAboutPage}=await import('/js/pages/about.js');const before=ScrollTrigger.getAll().length;const dispose=initAboutPage(document.querySelector('.about-page'));const during=ScrollTrigger.getAll().length;dispose();return {before,during,after:ScrollTrigger.getAll().length}})()`);assert(cleanup.during>cleanup.before);assert.equal(cleanup.after,cleanup.before);
  reports.push({width,nineSections:'PASS',images:'PASS',navigation:'PASS',timelineReverseAndStop:'PASS',testimonialWrapAndKeyboard:'PASS',faqKeyboard:'PASS',reducedMotion:'PASS',cleanup:'PASS',overflow:'NONE'});console.log('PASS About '+width);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await writeFile(path.join(site,'qa/about-results.json'),JSON.stringify({status:'PASS',reports,runtimeErrors:errors,localAssetFailures:failures},null,2));
} finally {socket.close();server.close();}
