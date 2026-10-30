import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const site = path.resolve('html-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
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
const ready = `new Promise((resolve, reject) => { let tries=0; const timer=setInterval(() => { if(document.querySelector('.header') && window.gsap && window.ScrollTrigger) { clearInterval(timer); document.fonts.ready.then(() => resolve(true)); } else if(++tries > 200) { clearInterval(timer); reject('Page did not initialize'); } },50); })`;
const reportLayout = `(() => {
  const section=document.querySelector('.agency-intro');
  const box = e => {const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const copy=[...section.querySelectorAll('.agency-copy > *')].map(box);
  const images=[...section.querySelectorAll('img')].map(box);
  const intersect=(a,b)=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
  return {width:innerWidth, section:box(section), count:images.length, loaded:[...section.querySelectorAll('img')].every(i=>i.complete && i.naturalWidth>0), overflow:document.documentElement.scrollWidth>innerWidth, textCovered:images.some(i=>copy.some(c=>intersect(i,c))), imageOutside:images.some(i=>i.left<0 || i.right>innerWidth || i.top<box(section).top || i.bottom>box(section).bottom), text:section.querySelector('h2').textContent, headingFont:getComputedStyle(section.querySelector('h2')).fontSize, columnLayout:getComputedStyle(section.querySelector('.agency-card-scene')).position };
})()`;
const reports=[];
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const width of [1920,1440,1280,1200,1024,768,390,320]) {
    await resize(width);
    await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
    await evaluate(ready);
    await evaluate(`document.querySelector('.agency-intro').scrollIntoView({behavior:'instant'}); Promise.all([...document.querySelectorAll('.agency-intro img')].map(i=>i.decode())).then(()=>true)`);
    const layout=await evaluate(reportLayout);
    if(layout.textCovered || layout.imageOutside) console.log('Layout issue:', JSON.stringify(layout), await evaluate(`JSON.stringify({copy:[...document.querySelectorAll('.agency-copy > *')].map(e=>({tag:e.tagName,box:e.getBoundingClientRect().toJSON()})),images:[...document.querySelectorAll('.agency-intro img')].map(e=>({src:e.src,box:e.getBoundingClientRect().toJSON()}))})`));
    assert.equal(layout.count,7);
    assert.equal(layout.loaded,true);
    assert.equal(layout.overflow,false);
    assert.equal(layout.textCovered,false);
    assert.equal(layout.imageOutside,false);
    assert.equal(layout.text,'Your Team. Our Team.One Team.');
    assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);
    assert.equal(await evaluate(`gsap.getTweensOf(document.querySelectorAll('.agency-card-float')).length`),0);
    assert.equal(await evaluate(`document.querySelector('.agency-copy .button').href`),'https://www.vroooom.com/about/');
    await evaluate(`document.querySelector('.agency-copy .button').focus()`);
    assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`),'solid');
    await evaluate(`document.activeElement.blur(); document.querySelector('.agency-intro').scrollIntoView({behavior:'instant'})`);
    const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip:{x:0,y:await evaluate(`scrollY`),width,height:layout.section.height,scale:1}});
    await writeFile(path.join(site,`qa/agency-${width}.png`),Buffer.from(shot.data,'base64'));
    reports.push({...layout,reducedMotion:'PASS'});
  }
  await resize(1440);
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`gsap.getTweensOf(document.querySelectorAll('.agency-card-float')).length`),7);
  assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.vars.scrub).length`),6);
  assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.vars.once).length`),8);
  await evaluate(`document.querySelector('.agency-intro').scrollIntoView({behavior:'instant'}); ScrollTrigger.update(); new Promise(resolve=>setTimeout(resolve,1800))`);
  assert.equal(await evaluate(`[...document.querySelectorAll('.agency-reveal')].every(e=>+getComputedStyle(e).opacity===1)`),true);
  const moved=await evaluate(`(async()=>{
    const cards=[...document.querySelectorAll('.agency-card-float')];
    const before=cards.map(c=>getComputedStyle(c).transform);
    await new Promise(resolve=>setTimeout(resolve,250));
    return cards.some((c,i)=>getComputedStyle(c).transform!==before[i]);
  })()`);
  assert.equal(moved,true);
  const parallax=await evaluate(`(async()=>{
    const card=document.querySelector('.agency-card'); const before=gsap.getProperty(card,'y');
    window.scrollBy({top:200,behavior:'instant'}); ScrollTrigger.update();
    await new Promise(resolve=>setTimeout(resolve,1400));
    return gsap.getProperty(card,'y')!==before;
  })()`);
  assert.equal(parallax,true);
  await resize(390);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
  assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.vars.scrub).length`),0);
  assert.equal(await evaluate(`gsap.getTweensOf(document.querySelectorAll('.agency-card-float')).length`),7);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);
  assert.equal(await evaluate(`[...document.querySelectorAll('.agency-card,.agency-card-float,.agency-card-reveal')].every(e=>getComputedStyle(e).transform==='none' && +getComputedStyle(e).opacity===1)`),true);
  // Verify initializer cleanup under normal motion, where it owns live tweens.
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`(async()=>{
    const {initAgencyIntro}=await import('/js/sections/agency-intro.js');
    const before=ScrollTrigger.getAll().length;
    const cleanup=initAgencyIntro(document.querySelector('.agency-intro')); cleanup();
    return ScrollTrigger.getAll().length===before;
  })()`),true);
  assert.deepEqual(errors,[]);
  await writeFile(path.join(site,'qa/agency-results.json'),JSON.stringify({status:'PASS',reports,animationChecks:['staggered entrances','seven floating tweens','six desktop scrub triggers','scroll changes parallax','tablet/mobile reinitialization','live reduced-motion cleanup','initializer cleanup'],runtimeExceptions:errors},null,2));
  console.log(JSON.stringify({status:'PASS',widths:reports.map(r=>r.width),animation:'PASS',reducedMotion:'PASS',assets:'PASS',noClippingOrTextOverlap:'PASS'},null,2));
} finally { socket.close(); server.close(); }

