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
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('.why')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Page not ready');}},50);})`;
const measure=`(()=>{const section=document.querySelector('.why'),r=section.getBoundingClientRect();return {height:r.height,background:getComputedStyle(section).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,nodes:[section,...section.querySelectorAll('.section-label,h2,.why-layout,article,article span,h3,p,.text-link')].map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,text:e.textContent.trim(),x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,color:s.color};})};})()`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1920,1440,768,390]){
  await resize(width);const captures=[];
  for(const port of [5182,5183]){
   await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await evaluate(ready);
   await evaluate(`document.documentElement.style.overflow='hidden';document.querySelector('.why').scrollIntoView({behavior:'instant'})`);
   captures.push(await evaluate(measure));
   if(port===5182){
    await evaluate(`document.querySelector('.why a').focus()`);assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`),'solid');
    assert.equal(await evaluate(`document.querySelector('.why a').href`),'https://www.vroooom.com/our-history/');
    await evaluate(`document.activeElement.blur();document.querySelector('.why').scrollIntoView({behavior:'instant'})`);
    const position=await evaluate(`(()=>{const r=document.querySelector('.why').getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};})()`);
    const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip:{...position,scale:1}});
    await writeFile(path.join(site,`qa/why-${width}.png`),Buffer.from(shot.data,'base64'));
   }
  }
  assert.equal(captures[0].background,captures[1].background);assert.equal(captures[0].overflow,false);
  assert(Math.abs(captures[0].height-captures[1].height)<1);
  assert.equal(captures[0].nodes.length,captures[1].nodes.length);
  captures[0].nodes.forEach((actual,i)=>{
   const expected=captures[1].nodes[i];
   for(const field of ['x','y','width','height'])assert(Math.abs(actual[field]-expected[field])<1,`${width} ${i} ${field}: ${actual[field]} vs ${expected[field]}`);
   for(const field of ['fontSize','fontWeight','lineHeight','letterSpacing','color'])assert.equal(actual[field],expected[field],`${width} ${i} ${field}`);
   // HTML formatting whitespace is irrelevant; visible content is identical.
   assert.equal(actual.text.replace(/\s+/g,''),expected.text.replace(/\s+/g,''));
  });
  reports.push({width,height:captures[0].height,reactGeometryAndTypography:'PASS',overflow:'NONE'});
 }
 await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
 await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 const animationSettings=await evaluate(`ScrollTrigger.getAll().filter(t=>document.querySelector('.why').contains(t.trigger)).map(t=>({start:t.vars.start,duration:t.animation.duration(),y:t.animation.vars.y,opacity:t.animation.vars.opacity}))`);
 assert.equal(animationSettings.length,4);
 animationSettings.forEach(s=>assert.deepEqual(s,{start:'top 91%',duration:.9,y:35,opacity:0}));
 await evaluate(`document.querySelector('.why').scrollIntoView({behavior:'instant'});ScrollTrigger.update();new Promise(r=>setTimeout(r,1200))`);
 assert.equal(await evaluate(`[...document.querySelectorAll('.why [data-reveal]')].every(e=>+getComputedStyle(e).opacity===1 && Math.abs(gsap.getProperty(e,'y'))<.01)`),true);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>document.querySelector('.why').contains(t.trigger)).length`),0);
 assert.equal(await evaluate(`[...document.querySelectorAll('.why [data-reveal]')].every(e=>getComputedStyle(e).transform==='none' && +getComputedStyle(e).opacity===1)`),true);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/why-results.json'),JSON.stringify({status:'PASS',reports,animations:'PASS',reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports,animations:'PASS',reducedMotion:'PASS'},null,2));
}finally{socket.close();server.close();reference.close();}
