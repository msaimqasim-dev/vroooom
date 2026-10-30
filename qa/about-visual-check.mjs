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
 await send('Runtime.enable');await send('Page.enable');await send('DOM.enable');await send('CSS.enable');
 for(const width of [1920,1440,768,390]){
  await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/about/'});
  await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&!document.querySelector('[data-review-next]').disabled){clearInterval(t);document.fonts.ready.then(r)}},50)})`);
  await evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()})).then(()=>new Promise(r=>setTimeout(r,1600)))`);
  const backgrounds=await evaluate(`[...document.querySelectorAll('main > .about-dark')].map(e=>({section:e.id||'hero',image:getComputedStyle(e,'::before').backgroundImage,filter:getComputedStyle(e,'::before').filter}))`);
  assert.equal(backgrounds.length,3);assert(backgrounds.every(b=>b.image.includes('-background.png')&&b.filter.includes('hue-rotate')));
  await evaluate(`Promise.all(['../assets/images/agency/services-background.png','../assets/images/portfolio/featured-work-background.png'].map(src=>{const i=new Image();i.src=src;return i.decode()})).then(()=>true)`);
  const state=await evaluate(`(()=>{const h=document.querySelector('.about-hero h1'),a=document.querySelector('.about-hero-art'),range=document.createRange();range.selectNodeContents(h);return {contentWidth:document.documentElement.clientWidth,count:document.querySelectorAll('.about-hero-art .hero-column').length,gradients:[...a.querySelectorAll('.hero-column')].map(e=>getComputedStyle(e).backgroundImage),durations:[...a.querySelectorAll('.hero-column')].map(e=>e.getAnimations()[0].effect.getTiming().duration),delays:[...a.querySelectorAll('.hero-column')].map(e=>getComputedStyle(e).animationDelay),heights:[...a.querySelectorAll('.hero-column')].map(e=>e.offsetHeight),artLeft:a.getBoundingClientRect().left,artTop:a.getBoundingClientRect().top,headingRight:Math.max(...[...range.getClientRects()].map(r=>r.right)),navBottom:document.querySelector('.about-jump-nav').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth,workspace:document.querySelectorAll('.about-workspace img').length,collaboration:document.querySelectorAll('.about-collaboration img').length,imageReveals:ScrollTrigger.getAll().filter(t=>t.trigger.hasAttribute('data-about-image')).length,imageFilters:[...document.querySelectorAll('.about-editorial-image img,.about-portrait img')].map(e=>getComputedStyle(e).filter),oldGlow:!!document.querySelector('.about-hero-light')};})()`);
  assert.equal(state.count,4);assert.equal(new Set(state.gradients).size,1);assert(state.durations.every(d=>d===10000));assert.equal(new Set(state.delays).size,4);assert.equal(new Set(state.heights).size,4);assert.equal(state.workspace,1);assert.equal(state.collaboration,1);assert.equal(state.imageReveals,4);assert(state.imageFilters.every(f=>f==='none'));assert.equal(state.oldGlow,false);assert.equal(state.overflow,false);
  if(width>=768){assert(Math.abs(state.artLeft-state.contentWidth*.6)<1);assert(state.headingRight<=state.artLeft,'Headline overlaps rectangles');}else assert(state.artTop>=state.navBottom,'Mobile art overlaps hero content');
  const before=await evaluate(`getComputedStyle(document.querySelector('.about-hero-art .hero-column')).transform`);await evaluate(`new Promise(r=>setTimeout(r,250))`);assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.about-hero-art .hero-column')).transform`),before);
  const doc=await send('DOM.getDocument');const person=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.about-person'});await send('CSS.forcePseudoState',{nodeId:person.nodeId,forcedPseudoClasses:['hover']});await evaluate(`new Promise(r=>setTimeout(r,800))`);assert(Math.abs(await evaluate(`new DOMMatrix(getComputedStyle(document.querySelector('.about-portrait img')).transform).m11`)-1.025)<.001);await send('CSS.forcePseudoState',{nodeId:person.nodeId,forcedPseudoClasses:[]});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>setTimeout(r,50))`);assert.equal(await evaluate(`document.getAnimations().length`),0);assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);
  for(const [name,selector] of [['hero','.about-hero'],...(width===1440||width===390?[['intro','#who-we-are'],['values','#values']]:[])]){const clip=await evaluate(`(()=>{const e=document.querySelector('${selector}');e.scrollIntoView({behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});await writeFile(path.join(site,'qa/about-refined-'+name+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  reports.push({width,...state,waveMovement:'PASS',portraitHover:'PASS',reducedMotion:'PASS'});console.log('PASS About visual '+width);
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/about-visual-results.json'),JSON.stringify({status:'PASS',reports},null,2));
}finally{socket.close();server.close()}
