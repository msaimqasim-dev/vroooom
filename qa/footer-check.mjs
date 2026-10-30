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
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Footer not mounted');}},50);})`;
const measure=`(()=>{const section=document.querySelector('footer'),r=section.getBoundingClientRect();return {height:r.height,background:getComputedStyle(section).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,nodes:[...section.querySelectorAll('.footer-top,.logo,.footer-top p,.back-top,.footer-grid,.footer-grid>div,small,.footer-grid p,.footer-grid a,.footer-wordmark,.footer-wordmark svg,.footer-bottom')].map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,text:e.textContent,x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color};})};})()`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1920,1440,768,390,320]){
  await resize(width);const captures=[];
  for(const port of [5182,5183]){
   await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await evaluate(ready);
   await evaluate(`document.documentElement.style.overflow='hidden';document.querySelector('footer').scrollIntoView({behavior:'instant'})`);
   captures.push(await evaluate(measure));
   if(port===5182){const r=await evaluate(`(()=>{const b=document.querySelector('footer').getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,scale:1};})()`);const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip:r});await writeFile(path.join(site,`qa/footer-${width}.png`),Buffer.from(shot.data,'base64'));}
  }
  if(Math.abs(captures[0].height-captures[1].height)>=1) console.log(JSON.stringify(captures.map(c=>({height:c.height,nodes:c.nodes.filter(n=>['DIV','svg'].includes(n.tag))})),null,2));
  assert(Math.abs(captures[0].height-captures[1].height)<1,`${width} footer height: ${captures[0].height} vs ${captures[1].height}`);
  assert.equal(captures[0].background,captures[1].background);assert.equal(captures[0].overflow,false);
  assert.equal(captures[0].nodes.length,captures[1].nodes.length);
  captures[0].nodes.forEach((actual,i)=>{const expected=captures[1].nodes[i];for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-expected[key])<1,`${width} ${i} ${key}: ${actual[key]} vs ${expected[key]}`);for(const key of ['fontSize','lineHeight','color'])assert.equal(actual[key],expected[key]);assert.equal(actual.text.replace(/\s/g,''),expected.text.replace(/\s/g,''));});
  reports.push({width,height:captures[0].height,reactGeometryTypographyContent:'PASS',overflow:'NONE'});
 }
 await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
 const links=await evaluate(`[...document.querySelectorAll('.footer-grid a')].map(a=>a.href)`);
 assert.deepEqual(links,['mailto:sales@vroooom.com','tel:+17065764702','https://www.vroooom.com/about/','https://www.vroooom.com/our-awards/','https://www.vroooom.com/contact-us/','https://www.facebook.com/vwebmarketing','https://www.vroooom.com/blog/']);
 await evaluate(`document.querySelector('.footer .back-top').focus()`);assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`),'solid');
 await evaluate(`document.querySelector('.footer .back-top').click()`);assert.equal(await evaluate(`scrollY`),0);
 assert.equal(await evaluate(`document.querySelector('[data-footer-year]').textContent===String(new Date().getFullYear())`),true);
 assert.equal(await evaluate(`(async()=>{history.pushState({},'', '/pages/example/');const host=document.createElement('div');document.body.append(host);const {mountFooter}=await import('/js/components/footer.js');const cleanup=await mountFooter(host);const links=[...host.querySelectorAll('.footer-grid a')].map(a=>a.href);const same=links.every((href,i)=>href===document.querySelectorAll('.footer-grid a')[i].href);cleanup();host.remove();history.replaceState({},'','/');return same;})()`),true);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 const wave=await evaluate(`(()=>{const a=[...document.querySelectorAll('.footer-column')].map(e=>e.getAnimations()[0]);return {count:a.length,durations:a.map(x=>x.effect.getTiming().duration),delays:a.map(x=>x.effect.getTiming().delay)};})()`);
 assert.equal(wave.count,8);assert(wave.durations.every(d=>d===6000));assert.equal(new Set(wave.delays).size,8);
 assert.equal(await evaluate(`(async()=>{const c=document.querySelector('.footer-column');const before=getComputedStyle(c).transform;await new Promise(r=>setTimeout(r,250));return before!==getComputedStyle(c).transform;})()`),true);
 await send('DOM.enable');await send('CSS.enable');const doc=await send('DOM.getDocument');const button=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.footer .back-top'});
 await send('CSS.forcePseudoState',{nodeId:button.nodeId,forcedPseudoClasses:['hover']});await evaluate(`new Promise(r=>setTimeout(r,350))`);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.footer .back-top')).backgroundColor`),'rgb(52, 76, 83)');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 assert.equal(await evaluate(`document.querySelector('.footer-column').getAnimations().length`),0);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/footer-results.json'),JSON.stringify({status:'PASS',reports,linksAndNestedReuse:'PASS',focusAndBackToTop:'PASS',waveAndHover:'PASS',reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports,linksAndNestedReuse:'PASS',focusAndBackToTop:'PASS',waveAndHover:'PASS',reducedMotion:'PASS'},null,2));
}finally{socket.close();server.close();reference.close();}
