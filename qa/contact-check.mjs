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
const reports=[];try{await send('Runtime.enable');await send('Page.enable');for(const width of [1920,1440,1024,768,390]){await resize(width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.navigate',{url:'http://127.0.0.1:5182/contact-us/'});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('footer')&&document.querySelector('.header')&&document.querySelector('form').noValidate){clearInterval(t);document.fonts.ready.then(r)}},50)})`);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);await evaluate(`document.querySelector('[type=submit]').click()`);assert.equal(await evaluate(`document.activeElement.id`),'first-name');assert((await evaluate(`document.querySelectorAll('[aria-invalid=true]').length`))>=7);await evaluate(`(()=>{const f=document.querySelector('form');f.elements['first-name'].value='Test';f.elements['last-name'].value='Inquiry';f.elements.email.value='bad-email';f.elements.phone.value='123';f.elements.requirements.value='Local validation test only';for(const n of ['has-website','google-ranking','has-logo'])f.elements[n].value='Yes';f.querySelector('[type=submit]').click()})()`);assert.equal(await evaluate(`document.querySelector('#email').getAttribute('aria-invalid')`),'true');await evaluate(`document.querySelector('#email').value='test@example.com';document.querySelector('#phone').value='7065764702';document.querySelector('[type=submit]').click()`);assert((await evaluate(`document.querySelector('#form-status').textContent`)).includes('not available'));assert.equal(await evaluate(`document.querySelector('#requirements').value`),'Local validation test only');assert.equal(await evaluate(`document.querySelector('form').getAttribute('data-netlify')`),'true');assert.equal(await evaluate(`document.querySelector('[name="form-name"]').value`),'vroooom-inquiry');assert.equal(await evaluate(`document.querySelector('.contact-options a[href*="support-ticket"]').href`),'https://www.vroooom.com/support-ticket/');await evaluate(`document.querySelector('[name="company-url"]').value='spam';document.querySelector('[type=submit]').click()`);assert((await evaluate(`document.querySelector('#form-status').textContent`)).includes('Unable'));assert.equal(await evaluate(`ScrollTrigger.getAll().length`),0);assert.equal(await evaluate(`document.getAnimations().length`),0);if(width<=1100){await evaluate(`document.querySelector('.menu-toggle').click();new Promise(r=>setTimeout(r,300))`);assert.equal(await evaluate(`document.querySelector('nav').inert`),false);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});}assert.equal(await evaluate(`new URL(document.querySelector('.header-contact').href).pathname`),'/contact-us/');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await evaluate(`new Promise(r=>setTimeout(r,1200))`);assert((await evaluate(`ScrollTrigger.getAll().length`))>0);if(width===1440||width===390){await evaluate(`scrollTo({top:0,behavior:'instant'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(site,'qa/contact-'+width+'.png'),Buffer.from(shot.data,'base64'));}reports.push({width,responsive:'PASS',validation:'PASS',unconfiguredSubmission:'HONEST FALLBACK',honeypot:'PASS',reducedMotion:'PASS',menu:'PASS'});console.log('PASS Contact '+width);}assert.deepEqual(errors,[]);await writeFile(path.join(site,'qa/contact-results.json'),JSON.stringify({status:'PASS',reports,liveSubmission:'NOT CONFIGURED / NOT TESTED'},null,2));}finally{socket.close();server.close()}
