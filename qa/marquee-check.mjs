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
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('.marquee-track')&&document.querySelector('.header')){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}else if(++n>200){clearInterval(t);reject('Not loaded');}},50);})`);
  const state=await evaluate(`(()=>{const m=document.querySelector('.marquee'),t=m.firstElementChild,s=getComputedStyle(m),c=getComputedStyle(t.firstElementChild),a=t.getAnimations()[0];a.pause();a.currentTime=0;return {width:innerWidth,height:m.getBoundingClientRect().height,background:s.backgroundColor,color:s.color,font:c.fontSize,gap:c.gap,itemWidth:t.firstElementChild.getBoundingClientRect().width,trackWidth:t.getBoundingClientRect().width,viewport:m.clientWidth,duration:a.effect.getTiming().duration,easing:a.effect.getTiming().easing,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
  assert.equal(state.height,width<768?76.5:97);
  assert.equal(state.font,width<768?'23px':'30px');
  assert.equal(state.gap,width<768?'25px':'40px');
  assert.equal(state.background,'rgb(247, 247, 236)');
  assert.equal(state.color,'rgb(23, 38, 45)');
  assert.equal(state.overflow,false);
  console.log('Coverage',width,state.trackWidth/2,state.viewport);
  assert(state.trackWidth/2>=state.viewport,'Loop must cover full viewport at its endpoint');
  assert.equal(state.easing,'linear');
  const loop=await evaluate(`(()=>{const t=document.querySelector('.marquee-track'),a=t.getAnimations()[0],d=a.effect.getTiming().duration; a.currentTime=d-1;const endX=new DOMMatrix(getComputedStyle(t).transform).m41; a.currentTime=d+1; const startX=new DOMMatrix(getComputedStyle(t).transform).m41;return {endX,startX,half:t.clientWidth/2};})()`);
  assert(Math.abs(loop.endX+loop.half-loop.startX)<1);
  assert.equal(await evaluate(`(async()=>{const t=document.querySelector('.marquee-track'),a=t.getAnimations()[0];a.play();const before=new DOMMatrix(getComputedStyle(t).transform).m41;await new Promise(r=>setTimeout(r,200));return new DOMMatrix(getComputedStyle(t).transform).m41<before;})()`),true);
  await evaluate(`document.querySelector('.marquee').scrollIntoView({behavior:'instant'})`);
  const shot=await send('Page.captureScreenshot');await writeFile(path.join(site,`qa/marquee-${width}.png`),Buffer.from(shot.data,'base64'));
  reports.push(state);
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate(`document.querySelector('.marquee-track').getAnimations().length`),0);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.marquee-track')).transform`),'none');
 assert.deepEqual(errors,[]);
 await writeFile(path.join(site,'qa/marquee-results.json'),JSON.stringify({status:'PASS',reports,reducedMotion:'PASS',runtimeExceptions:errors},null,2));
 console.log('PASS: dimensions, colors, responsive typography, coverage, seam, leftward motion, and reduced motion.');
}finally{socket.close();server.close();}
