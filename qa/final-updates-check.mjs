import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd();
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9257',`--user-data-dir=${root}/qa/.final-browser`,'--no-first-run','about:blank'],{windowsHide:true,stdio:'ignore'});
const server=http.createServer((req,res)=>{try{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(5188,'127.0.0.1',r));
let socket;
const reports=[],broken=[],legacy=[];
try{
 let tabs;for(let i=0;i<50;i++){try{tabs=await(await fetch('http://127.0.0.1:9257/json')).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
 socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Page.enable');await send('Runtime.enable');
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['qa','assets','vendor','components','sections'].includes(e.name)?walk(path.join(dir,e.name)):e.isFile()&&e.name==='index.html'?[path.join(dir,e.name)]:[])}
 for(const width of [1440,768,390,320]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 for(const file of walk(root)){
 const route=path.relative(root,file).replaceAll('\\','/');await send('Page.navigate',{url:`http://127.0.0.1:5188/${route}`});
 await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector('.footer-wordmark img')?.naturalWidth&&document.querySelector('.header .brand-wordmark')){clearInterval(timer);document.fonts.ready.then(()=>setTimeout(resolve,100))}else if(++n>100){clearInterval(timer);reject('Shared components did not load')}},50)})`);
 const result=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {overflow:document.documentElement.scrollWidth>innerWidth,brand:document.querySelector('.brand-wordmark').textContent,wordmark:document.querySelector('.footer-wordmark text').textContent,emblem:rect(document.querySelector('.footer-wordmark-emblem')),word:rect(document.querySelector('.footer-wordmark svg')),links:[...document.querySelectorAll('a[href]')].map(a=>({href:a.href,text:a.textContent.trim(),target:a.target}))}})()`);
 assert.equal(result.brand,'Vroooom®');assert.equal(result.wordmark,'Vroooom');assert(!result.overflow,`${route} overflow at ${width}`);assert(result.emblem.x+result.emblem.width<result.word.x);assert(result.word.width>result.emblem.width);
 if(width===1440)for(const a of result.links){const u=new URL(a.href);if(u.origin==='http://127.0.0.1:5188'){let dest=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(dest)&&fs.statSync(dest).isDirectory())dest=path.join(dest,'index.html');if(!fs.existsSync(dest))broken.push({route,...a});else if(u.hash){const html=fs.readFileSync(dest,'utf8');if(!html.includes(`id="${decodeURIComponent(u.hash.slice(1))}"`))broken.push({route,...a,reason:'missing anchor'})}}else if(['www.vroooom.com','vroooom.com'].includes(u.hostname))legacy.push({route,...a});}
 if(width<=1100){await evaluate(`document.querySelector('.menu-toggle').click()`);assert.equal(await evaluate(`document.querySelector('nav').inert`),false)}
 await evaluate(`document.querySelector('.dropdown-toggle').click()`);assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),false);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelector('.nav-submenu').hidden`),true);
 reports.push({route,width,status:'PASS'});
 if(route==='portfolio/index.html'){
 await evaluate(`document.querySelector('.website-project a').click()`);assert.equal(await evaluate(`document.querySelector('dialog').open`),true);
 await evaluate(`document.querySelector('[data-next]').click();document.querySelector('[data-close]').click()`);
 await evaluate(`document.querySelector('[data-logo]').click()`);assert.equal(await evaluate(`document.querySelector('dialog').open`),true);await evaluate(`document.querySelector('[data-close]').click()`);
 }
 if(route==='index.html'){
 await evaluate(`document.querySelector('.menu-toggle[aria-expanded="true"]')?.click();window.scrollTo({top:0,behavior:'instant'});new Promise(r=>setTimeout(r,500))`);assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),'dark');
 await evaluate(`window.scrollTo({top:document.querySelector('#about').getBoundingClientRect().top+scrollY,behavior:'instant'});new Promise(r=>setTimeout(r,500))`);assert.equal(await evaluate(`document.querySelector('.header').dataset.theme`),'light');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await evaluate(`getComputedStyle(document.querySelector('.header')).transitionDuration`),'0s');
 await evaluate(`window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});new Promise(r=>setTimeout(r,300))`);
 const clip=await evaluate(`(()=>{const r=document.querySelector('footer').getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
 const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,clip});fs.writeFileSync(`qa/final-branding-${width}.png`,Buffer.from(shot.data,'base64'));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 }
 }
 console.log(`PASS all pages at ${width}px`);
 }
 fs.writeFileSync('qa/final-updates-results.json',JSON.stringify({reports,broken,legacy,runtimeErrors:errors},null,2));console.log(JSON.stringify({pages:reports.length,broken,legacy,runtimeErrors:errors},null,2));assert.equal(broken.length,0);assert.equal(errors.length,0);
}finally{socket?.close();server.close();chrome.kill()}
