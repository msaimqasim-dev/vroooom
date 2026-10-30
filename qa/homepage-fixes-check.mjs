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
const reports=[];
try{
 await send('Runtime.enable');await send('Page.enable');
 for(const width of [1920,1440,768,390,320]){
  await resize(width);await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('footer')&&window.ScrollTrigger){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Not ready');}},50);})`);
  const columns=await evaluate(`[...document.querySelectorAll('.hero-column')].map(e=>{const s=getComputedStyle(e),a=e.getAnimations()[0];return {tone:s.getPropertyValue('--tone').trim(),gradient:s.backgroundImage,opacity:+s.opacity,duration:a.effect.getTiming().duration,delay:a.effect.getTiming().delay};})`);
  assert.equal(columns.length,8);assert(columns.every(c=>c.tone==='#208ea3'&&c.duration===10000));
  assert.equal(new Set(columns.map(c=>c.gradient)).size,1);
  assert.deepEqual(columns.map(c=>c.opacity),[1,.96,.94,.92,.92,.94,.96,1]);
  assert.deepEqual(columns.map(c=>c.delay),[0,-1250,-2500,-3750,-5000,-6250,-7500,-8750]);
  assert.equal(await evaluate(`document.querySelectorAll('.process-visual,.process-geometry,.process-flow').length`),0);
  assert.equal(await evaluate(`ScrollTrigger.getAll().filter(t=>t.trigger===document.querySelector('#process .steps')).length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('#process .step').length`),4);
  const footer=await evaluate(`(()=>{const f=document.querySelector('footer'),w=f.querySelector('.footer-wordmark'),s=getComputedStyle(w),t=w.querySelector('text'),r=t.getBoundingClientRect(),b=f.getBoundingClientRect();return {height:f.offsetHeight,marginTop:s.marginTop,marginBottom:s.marginBottom,lineHeight:s.lineHeight,font:getComputedStyle(t).fontSize,svgWidth:w.querySelector('svg').getBoundingClientRect().width,svgHeight:w.querySelector('svg').getBoundingClientRect().height,clipped:r.top<b.top||r.bottom>b.bottom||r.left<b.left-1||r.right>b.right+1,svgOverflow:getComputedStyle(w.querySelector('svg')).overflow,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
  assert.equal(footer.marginTop,'12px');assert.equal(footer.marginBottom,width<768?'20px':'24px');
  assert.equal(footer.lineHeight,'16px');assert.equal(footer.font,'220px');assert.equal(footer.svgOverflow,'visible');
  assert(Math.abs(footer.svgHeight-footer.svgWidth*.23)<1);
  assert.equal(footer.clipped,false);assert.equal(footer.overflow,false);
  await evaluate(`document.querySelector('footer').scrollIntoView({behavior:'instant'})`);
  const clip=await evaluate(`(()=>{const r=document.querySelector('footer').getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`);
  const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip});await writeFile(path.join(site,`qa/homepage-fixes-footer-${width}.png`),Buffer.from(shot.data,'base64'));
  reports.push({width,heroPalette:'PASS',heroTiming:'UNCHANGED',processIllustration:'REMOVED',footerHeight:footer.height,wordmarkClipping:'NONE',overflow:'NONE'});
 }
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/homepage-fixes-results.json'),JSON.stringify({status:'PASS',reports,runtimeExceptions:errors},null,2));
 console.log(JSON.stringify({status:'PASS',reports},null,2));
}finally{socket.close();server.close();}
