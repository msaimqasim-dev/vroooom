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
const results=[];
try {
 await send('Runtime.enable');await send('Page.enable');
 for(const width of [1920,1440,768,390]){
  await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
  await evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')&&document.querySelectorAll('.spiral-card').length===10){clearInterval(t);document.fonts.ready.then(()=>resolve(true));}},50)})`);
  await evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()})).then(()=>true)`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.why,#process,.recognition,.services-showcase,.footer')].map(e=>getComputedStyle(e).backgroundColor)`),['rgb(238, 229, 244)','rgb(24, 12, 34)','rgb(250, 247, 252)','rgb(24, 12, 34)','rgb(24, 12, 34)']);
  const theme=await evaluate(`(()=>{
   const css=e=>getComputedStyle(typeof e==='string'?document.querySelector(e):e);
   const luminance=c=>{const a=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
   const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   const samples=[['.agency-copy>p','.agency-intro'],['.hero-description','.hero'],['.services-showcase-intro','.services-showcase'],['.services-image-note','.services-showcase'],['#contact .button','#contact .button'],['.footer-bottom','.footer']].map(([f,b])=>({selector:f,ratio:contrast(css(f).color,css(b).backgroundColor==='rgba(0, 0, 0, 0)'?(b==='.agency-intro'?'rgb(223, 201, 238)':css(document.documentElement).backgroundColor):css(b).backgroundColor)}));
   return {primary:css(document.documentElement).getPropertyValue('--color-primary').trim(),dark:css('.hero').backgroundColor,light:css('#contact').backgroundColor,heroGradients:[...document.querySelectorAll('.hero-column')].map(e=>css(e).backgroundImage),footerGradients:[...document.querySelectorAll('.footer-column')].map(e=>css(e).backgroundImage),filters:[...document.querySelectorAll('.spiral-card img,.services-slide img,.agency-card img')].map(e=>css(e).filter),decorative:[css('.featured-work-light').filter,getComputedStyle(document.querySelector('.services-showcase'),'::before').filter],overflow:document.documentElement.scrollWidth>innerWidth,samples};
  })()`);
  assert.equal(theme.primary,'#6b0b8e');assert.equal(theme.dark,'rgb(24, 12, 34)');assert.equal(theme.light,'rgb(250, 247, 252)');
  assert.equal(new Set(theme.heroGradients).size,1);assert.equal(theme.heroGradients.length,8);assert.equal(new Set(theme.footerGradients).size,1);assert.equal(theme.footerGradients.length,8);
  assert(theme.filters.every(f=>f==='none'));assert(theme.decorative.every(f=>f.includes('hue-rotate')));assert.equal(theme.overflow,false);
  for(const s of theme.samples)assert(s.ratio>=4.5,s.selector+' contrast '+s.ratio);
  if(width===1440||width===390){
   for(const [name,selector] of [['hero','.hero'],['portfolio','.featured-work'],['services','.services-showcase'],['cta','#contact'],['footer','.footer']]){
    const clip=await evaluate(`(()=>{const e=document.querySelector('${selector}');e.scrollIntoView({behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});await writeFile(path.join(site,'qa/purple-'+name+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
   }
  }
  results.push({width,...theme});console.log('PASS purple theme '+width);
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/purple-theme-results.json'),JSON.stringify({status:'PASS',results},null,2));
} finally { socket.close();server.close(); }
