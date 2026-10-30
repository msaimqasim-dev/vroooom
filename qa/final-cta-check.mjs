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
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('#contact')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Not ready');}},50);})`;
const measure=`(()=>{const section=document.querySelector('#contact'),r=section.getBoundingClientRect();return {height:r.height,overflow:document.documentElement.scrollWidth>innerWidth,nodes:[...section.querySelectorAll('.section-label,h2,.contact-bottom,.button,.text-link,.contact-star')].map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent,x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,fontSize:s.fontSize,lineHeight:s.lineHeight};})};})()`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1920,1440,768,390,320]){
  await resize(width);const captures=[];
  for(const port of [5182,5183]){
   await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await evaluate(ready);
   await evaluate(`document.documentElement.style.overflow='hidden';document.querySelector('#contact').scrollIntoView({behavior:'instant'})`);
   captures.push(await evaluate(measure));
   if(port===5182){
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#contact')).backgroundColor`),'rgb(7, 20, 23)');
    const r=await evaluate(`(()=>{const b=document.querySelector('#contact').getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,scale:1};})()`);
    const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip:r});await writeFile(path.join(site,`qa/final-cta-${width}.png`),Buffer.from(shot.data,'base64'));
   }
  }
  assert(Math.abs(captures[0].height-captures[1].height)<1,`${width} section height: ${captures[0].height} vs ${captures[1].height}`);
  assert.equal(captures[0].overflow,false);
  captures[0].nodes.forEach((actual,i)=>{const expected=captures[1].nodes[i];for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-expected[key])<1,`${width} ${i} ${key}: ${actual[key]} vs ${expected[key]}`);for(const key of ['fontSize','lineHeight'])assert.equal(actual[key],expected[key]);assert.equal(actual.text.replace(/\s/g,''),expected.text.replace(/\s/g,''));});
  reports.push({width,height:captures[0].height,reactGeometryTypographyContent:'PASS',overflow:'NONE'});
 }
 await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
 assert.deepEqual(await evaluate(`[...document.querySelectorAll('#contact a')].map(a=>a.href)`),['https://www.vroooom.com/contact-us/','tel:+17065764702']);
 assert.equal(await evaluate(`document.querySelector('.contact-glow').getAnimations().length`),0);
 await evaluate(`document.querySelector('#contact .button').focus()`);assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`),'solid');
 await evaluate(`document.activeElement.blur();window.scrollTo({top:0,behavior:'instant'})`);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 const settings=await evaluate(`ScrollTrigger.getAll().filter(t=>document.querySelector('#contact').contains(t.trigger)).map(t=>({start:t.vars.start,duration:t.animation.duration(),y:t.animation.vars.y,opacity:t.animation.vars.opacity}))`);
 assert.deepEqual(settings,[{start:'top 91%',duration:.9,y:35,opacity:0}]);
 const glow=await evaluate(`(()=>{const a=document.querySelector('.contact-glow').getAnimations()[0];return {duration:a.effect.getTiming().duration,iterations:a.effect.getTiming().iterations===Infinity,direction:a.effect.getTiming().direction};})()`);
 assert.deepEqual(glow,{duration:16000,iterations:true,direction:'alternate'});
 await evaluate(`document.querySelector('#contact').scrollIntoView({behavior:'instant'});ScrollTrigger.update();new Promise(r=>setTimeout(r,1100))`);
 assert.equal(await evaluate(`+getComputedStyle(document.querySelector('#contact h2')).opacity`),1);
 await send('DOM.enable');await send('CSS.enable');
 const doc=await send('DOM.getDocument');const button=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#contact .button'});
 await send('CSS.forcePseudoState',{nodeId:button.nodeId,forcedPseudoClasses:['hover']});
 await evaluate(`new Promise(r=>setTimeout(r,300))`);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('#contact .button')).transform`),'matrix(1, 0, 0, 1, 0, -3)');
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('#contact .button svg')).transform`),'matrix(1, 0, 0, 1, 2, -2)');
 await send('CSS.forcePseudoState',{nodeId:button.nodeId,forcedPseudoClasses:[]});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>document.querySelector('#contact').contains(t.trigger)).length`),0);
 assert.equal(await evaluate(`document.querySelector('.contact-glow').getAnimations().length`),0);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/final-cta-results.json'),JSON.stringify({status:'PASS',reports,linksAndFocus:'PASS',revealAndGlow:'PASS',reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports,linksAndFocus:'PASS',revealAndGlow:'PASS',reducedMotion:'PASS'},null,2));
}finally{socket.close();server.close();reference.close();}
