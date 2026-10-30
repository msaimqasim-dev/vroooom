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
const { getSpiralGeometry, getSpiralPosition } = await import('../../src/components/home/FeaturedWork/spiralConfig.js');
const ready = `new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(document.querySelectorAll('.spiral-card').length===10 && document.querySelector('.header')){clearInterval(timer);document.fonts.ready.then(()=>resolve(true));}else if(++tries>200){clearInterval(timer);reject('Portfolio did not initialize');}},50);})`;
const reports=[];
try {
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  for(const width of [1920,1440,1024,768,390,320]){
    await resize(width);
    await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
    await evaluate(ready);
    await evaluate(`document.querySelector('.featured-work').scrollIntoView({behavior:'instant'});Promise.all([...document.querySelectorAll('.spiral-card img')].map(i=>{i.loading='eager';return i.decode();})).then(()=>true)`);
    const state=await evaluate(`(()=>{
      const section=document.querySelector('.featured-work'),gallery=section.querySelector('.spiral-gallery'),cards=[...gallery.children];
      return {width:innerWidth,galleryWidth:gallery.clientWidth,height:gallery.clientHeight,sectionHeight:section.clientHeight,cardWidth:cards[0].offsetWidth,ratio:getComputedStyle(cards[0]).aspectRatio,perspective:getComputedStyle(gallery).perspective,styles:cards.map(c=>c.style.transform),shades:cards.map(c=>+c.style.getPropertyValue('--card-shade')),overflow:document.documentElement.scrollWidth>innerWidth,captions:section.querySelectorAll('figcaption,small').length,pins:section.querySelectorAll('.pin-spacer').length,sectionTriggers:ScrollTrigger.getAll().filter(t=>section.contains(t.trigger)).length,animations:section.getAnimations({subtree:true}).length,background:getComputedStyle(section.querySelector('.featured-work-light')).backgroundImage};
    })()`);
    assert.equal(state.height,900);
    assert.equal(state.sectionHeight,900);
    assert.equal(state.ratio,'1.62 / 1');
    assert.equal(state.perspective,width<768?'1000px':'1400px');
    assert.equal(state.overflow,false);
    assert.equal(state.captions,0);assert.equal(state.sectionTriggers,0);assert.equal(state.animations,0);assert.equal(state.pins,0);
    assert(state.background.includes('featured-work-background.png'));
    const geometry=getSpiralGeometry(state.galleryWidth,state.height);
    const expected=Array.from({length:10},(_,i)=>getSpiralPosition(i,10,0,geometry));
    const expectedStyles=await evaluate(`${JSON.stringify(expected)}.map(p=>{const e=document.createElement('span');e.style.transform='translate3d('+p.x+'px, '+p.y+'px, '+p.z+'px) rotateX('+p.rotateX+'deg) rotateY('+p.rotateY+'deg) rotateZ('+p.rotateZ+'deg) scale('+p.scale+')';return e.style.transform;})`);
    expected.forEach((p,i)=>{
      assert.equal(state.styles[i],expectedStyles[i]);
      assert.equal(state.shades[i],1-p.brightness);
    });
    await evaluate(`window.scrollBy({top:-180,behavior:'instant'});new Promise(resolve=>setTimeout(resolve,250))`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.spiral-card')].map(c=>c.style.transform)`),state.styles);
    await evaluate(`document.querySelector('.featured-work').scrollIntoView({behavior:'instant'})`);
    const screenshot=await send('Page.captureScreenshot');
    await writeFile(path.join(site,`qa/portfolio-foundation-${width}.png`),Buffer.from(screenshot.data,'base64'));
    reports.push({width,cardWidth:state.cardWidth,height:state.height,initialGeometry:'MATCHES REACT',staticOnScroll:true});
  }
  for(const width of [1440,390]){
    await resize(width);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.spiral-gallery')).display`),'grid');
    assert.equal(await evaluate(`[...document.querySelectorAll('.spiral-card')].every(c=>getComputedStyle(c).transform==='none')`),true);
    assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.spiral-card-back')).display`),'none');
    const count=await evaluate(`getComputedStyle(document.querySelector('.spiral-gallery')).gridTemplateColumns.split(' ').length`);
    assert.equal(count,width===390?1:2);
  }
  assert.deepEqual(errors,[]);
  await writeFile(path.join(site,'qa/portfolio-foundation-results.json'),JSON.stringify({status:'PASS',reports,reducedMotion:'PASS',runtimeExceptions:errors},null,2));
  console.log(JSON.stringify({status:'PASS',reports,reducedMotion:'PASS'},null,2));
}finally{socket.close();server.close();}
