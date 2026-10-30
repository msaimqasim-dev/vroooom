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
const ready=`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{const s=document.querySelector('.services-stage');if(s&&s.style.getPropertyValue('--stage-height')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Services not ready');}},50);})`;
const measure=`(()=>{const section=document.querySelector('#services'),r=section.getBoundingClientRect();return {height:r.height,nodes:['.section-label','h2','.services-showcase-intro','.services-carousel','.services-stage','.services-controls','.services-status','.services-image-note'].map(selector=>{const e=section.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color};})};})()`;
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1920,1440,768,390]){
  await resize(width);const captures=[];
  for(const port of [5182,5183]){
   await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await evaluate(ready);
   await evaluate(`document.documentElement.style.overflow='hidden';document.querySelector('#services').scrollIntoView({behavior:'instant'});new Promise(r=>setTimeout(r,80))`);
   captures.push(await evaluate(measure));
  }
  if(Math.abs(captures[0].height-captures[1].height)>=1)console.log(JSON.stringify(captures,null,2));
  assert(Math.abs(captures[0].height-captures[1].height)<1,`${width} section height ${captures[0].height} vs ${captures[1].height}`);
  captures[0].nodes.forEach((actual,i)=>{
   const expected=captures[1].nodes[i];
   for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-expected[key])<1,`${width} ${actual.selector}.${key}: ${actual[key]} vs ${expected[key]}`);
   for(const key of ['fontSize','lineHeight','color'])assert.equal(actual[key],expected[key]);
  });
  await send('Page.navigate',{url:'http://127.0.0.1:5182/'});await evaluate(ready);
  await evaluate(`document.querySelector('#services').scrollIntoView({behavior:'instant'});Promise.all([...document.querySelectorAll('.services-slide img')].map(i=>i.decode())).then(()=>true)`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.services-slide h3')].map(e=>e.textContent)`),['Website design','Digital marketing','Logo & branding','eCommerce','Website hosting']);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  let current=0;
  for(const direction of [1,1,1,1,1,-1,-1,-1,-1,-1]){
   await evaluate(`document.querySelector('[aria-label="${direction===1?'Next':'Previous'} service"]').click()`);
   current=(current+direction+5)%5;
   assert.equal(await evaluate(`document.querySelector('[aria-label="Next service"]').disabled`),true);
   await evaluate(`new Promise(r=>setTimeout(r,780))`);
   const state=await evaluate(`(()=>{const stage=document.querySelector('.services-stage');return {width:stage.clientWidth,cardWidth:parseFloat(stage.style.getPropertyValue('--service-card-width')),height:parseFloat(stage.style.getPropertyValue('--stage-height')),active:[...stage.children].findIndex(c=>c.dataset.active==='true'),cards:[...stage.children].map(c=>({x:gsap.getProperty(c,'x'),scale:gsap.getProperty(c,'scaleX'),opacity:+getComputedStyle(c).opacity,z:+c.style.zIndex})),left:document.querySelector('.services-progress span').style.left,overflow:document.documentElement.scrollWidth>innerWidth,locked:document.querySelector('[aria-label="Next service"]').disabled};})()`);
   assert.equal(state.active,current);assert.equal(state.left,`${current*20}%`);assert.equal(state.locked,false);assert.equal(state.overflow,false);
   const mobile=state.width<768,gap=mobile?12:16;
   const cardWidth=mobile?Math.min(state.width*.72,370):Math.min((state.width-gap*4)/3.52,380);
   assert(Math.abs(state.cardWidth-cardWidth)<.01);
   const near=mobile?cardWidth*.85:cardWidth*.88+gap;
   const far=mobile?cardWidth*1.55:near+cardWidth*.63+gap;
   state.cards.forEach((card,index)=>{const slot=((index-current+2+5)%5)-2;assert(Math.abs(card.x-Math.sign(slot)*[0,near,far][Math.abs(slot)])<.01);assert(Math.abs(card.scale-[1,.76,.5][Math.abs(slot)])<.001);assert.equal(card.opacity,1);assert.equal(card.z,10-Math.abs(slot));});
  }
  await evaluate(`document.querySelector('#services').scrollIntoView({behavior:'instant'});new Promise(r=>setTimeout(r,150))`);
  const shot=await send('Page.captureScreenshot');await writeFile(path.join(site,`qa/services-${width}.png`),Buffer.from(shot.data,'base64'));
  reports.push({width,reactLayout:'PASS',allPositionsForwardBackward:'PASS',overflow:'NONE'});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 }
 await evaluate(`document.querySelector('.services-slide').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
 assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[1].dataset.active`),'true');
 await evaluate(`(()=>{const stage=document.querySelector('.services-stage');stage.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:250,clientY:100,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:150,clientY:105,bubbles:true}));})()`);
 assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[2].dataset.active`),'true');
 await evaluate(`(()=>{const stage=document.querySelector('.services-stage');stage.dispatchEvent(new PointerEvent('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:true,clientX:150,clientY:100,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointerup',{pointerId:2,pointerType:'touch',isPrimary:true,clientX:250,clientY:105,bubbles:true}));})()`);
 assert.equal(await evaluate(`document.querySelectorAll('.services-slide')[1].dataset.active`),'true');
 assert.equal(await evaluate(`gsap.isTweening(document.querySelectorAll('.services-slide'))`),false);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/services-results.json'),JSON.stringify({status:'PASS',reports,keyboard:'PASS',swipe:'PASS',reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports,keyboard:'PASS',swipe:'PASS',reducedMotion:'PASS'},null,2));
}finally{socket.close();server.close();reference.close();}
