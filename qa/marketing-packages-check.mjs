import http from 'node:http';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const source = await readFile('qa/fixtures/marketing-packages-source.txt','utf8');
const html = await readFile('digital-marketing-packages/index.html','utf8');
const escape = s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows = source.split('\n').filter(l=>l.startsWith('| ')&&!l.startsWith('| Core'));
assert.equal(rows.length,30);
for(const row of rows)for(const cell of row.split('|').slice(1,-1))assert.ok(html.includes(escape(cell.trim())),cell);
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.join(process.cwd(),decodeURIComponent(url.pathname),url.pathname.endsWith('/')?'index.html':'');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(5182,'127.0.0.1',r));
const pages=await(await fetch('http://127.0.0.1:9245/json')).json();
const socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[],results=[];
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry);});
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const navigate=async route=>{await send('Page.navigate',{url:`http://127.0.0.1:5182/${route}`});await evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.readyState==='complete'&&document.querySelector('.header')&&document.querySelector('[data-site-footer] footer')){clearInterval(t);document.fonts.ready.then(r)}},40)})`);};
try{
 await send('Runtime.enable');await send('Log.enable');await navigate('digital-marketing-packages/');
 for(const width of [320,390,768,1024,1440,1920]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  for(let i=0;i<3;i++){
   await evaluate(`document.querySelectorAll('[role=tab]')[${i}].click()`);
   const state=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,visible:[...document.querySelectorAll('[role=tabpanel]')].filter(p=>!p.hidden).length,rows:document.querySelectorAll('[role=tabpanel]')[${i}].querySelectorAll('.dmp-scope-row').length})`);
   assert.equal(state.overflow,false,`overflow ${width} ${i}`);assert.equal(state.visible,1);assert.equal(state.rows,10);
  }
  if(width<=1024){await evaluate(`document.querySelector('.menu-toggle').click();document.querySelector('[aria-label="Services submenu"]').click();document.querySelector('.submenu-toggle').click()`);assert.equal(await evaluate(`document.querySelector('[data-route="digitalMarketingPackages"]').getBoundingClientRect().width>0`),true);assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelector('.nav-flyout').hidden`),true);assert.equal(await evaluate(`document.querySelector('.dropdown-toggle').getAttribute('aria-expanded')`),'true');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await evaluate(`document.querySelector('.menu-toggle').click()`);}
  results.push({width,plans:3,scopeRows:30,noOverflow:true});
 }
 await evaluate(`document.querySelectorAll('[role=tab]')[0].focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});assert.equal(await evaluate(`document.activeElement.textContent`),'Advanced');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End'});assert.equal(await evaluate(`document.activeElement.textContent`),'Premium');
 for(const route of ['website-marketing/','services/']){await navigate(route);assert.equal(await evaluate(`!!document.querySelector('main a[href="../digital-marketing-packages/"]')`),true);}
 for(const plan of ['Basic','Advanced','Premium']){await navigate(`contact-us/?package=${plan}#quote`);assert.equal(await evaluate(`document.querySelector('#requirements').value.includes('${plan} digital marketing plan')`),true);}
 await navigate('contact-us/?package=Custom#quote');
 assert.equal(await evaluate(`document.querySelector('#requirements').value`),'My custom package is: ');
 await evaluate(`new Promise(resolve=>{let tries=0;const timer=setInterval(()=>{if(Math.abs(document.querySelector('#quote').getBoundingClientRect().top)<180||++tries>100){clearInterval(timer);resolve()}},20)})`);
 const quotePosition=await evaluate(`({top:document.querySelector('#quote').getBoundingClientRect().top,scroll:scrollY,hash:location.hash,height:innerHeight})`);
 assert.ok(quotePosition.scroll>0&&quotePosition.top>=0&&quotePosition.top<250,`Quote anchor: ${JSON.stringify(quotePosition)}`);
 await evaluate(`document.querySelector('form').requestSubmit()`);
 assert.equal(await evaluate(`document.querySelector('#requirements').getAttribute('aria-invalid')`),'true');
 assert.equal(await evaluate(`document.querySelector('#requirements-error').textContent`),'Please complete this field.');
 await evaluate(`document.querySelector('#requirements').value+='SEO and email support';document.querySelector('form').requestSubmit()`);
 assert.equal(await evaluate(`document.querySelector('#requirements').hasAttribute('aria-invalid')`),false);
 await evaluate(`import('/js/pages/contact.js').then(m=>{const cleanup=m.initContact(document.querySelector('.contact-page'));cleanup();})`);
 assert.equal(await evaluate(`document.querySelector('#requirements').value`),'My custom package is: SEO and email support');
 await navigate('digital-marketing-packages/');
 assert.equal(await evaluate(`document.querySelectorAll('.dmp-custom a[href="../contact-us/?package=Custom#quote"]').length`),2);
 assert.equal(await evaluate(`[...document.querySelectorAll('.dmp-final a')].find(a=>a.textContent.includes('Request a Custom Quote')).search`),'?package=Custom');
 for(const width of [1101,1280,1440,1920]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  const point=await evaluate(`(()=>{const r=document.querySelector('.nav-pair').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
  const branchPoint=await evaluate(`(()=>{const r=document.querySelector('.nav-branch-row').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...branchPoint});
  assert.equal(await evaluate(`document.querySelector('.nav-flyout').hidden`),false);
  const flyoutState=await evaluate(`(()=>{const r=document.querySelector('.nav-flyout').getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom,x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  assert.ok(flyoutState.left>=0&&flyoutState.right<=width&&flyoutState.bottom<=900);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:flyoutState.x,y:flyoutState.y});
  assert.equal(await evaluate(`document.querySelector('.nav-flyout').hidden`),false,'Pointer can reach flyout');
  await evaluate(`document.querySelector('.submenu-toggle').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
  assert.equal(await evaluate(`document.activeElement.dataset.route`),'digitalMarketingPackages');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await evaluate(`document.activeElement.className`),'submenu-toggle');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:500});
  await evaluate(`document.activeElement.blur();document.querySelector('.dropdown-toggle').click()`);
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('digital-marketing-packages/');
 assert.equal(await evaluate(`document.querySelectorAll('.dmp-timeline li').length`),4);
 const links=await evaluate(`[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.startsWith(location.origin))`);
 for(const link of new Set(links))assert.equal((await fetch(link)).ok,true,link);
 const findPages=async(dir='')=>{const entries=await readdir(dir||'.',{withFileTypes:true});const pages=[];for(const entry of entries){if(['.git','qa','assets','components','sections','vendor'].includes(entry.name))continue;const file=path.posix.join(dir,entry.name);if(entry.isDirectory())pages.push(...await findPages(file));else if(file.endsWith('.html'))pages.push(file);}return pages;};
 const sitePages=await findPages();const allLinks=new Set();
 for(const page of sitePages){
  await navigate(page);
  assert.deepEqual(await evaluate(`[...document.querySelector('#nav-sub-2').children].map(el=>el.matches('a')?el.dataset.route:el.querySelector('[data-route]').dataset.route)`),['services','websiteDesign','websiteMarketing','websiteHosting']);
  assert.equal(await evaluate(`new URL(document.querySelector('footer a[href*="digital-marketing-packages"]').href).pathname`),'/digital-marketing-packages/');
  for(const width of [320,768,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
   await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false,`overflow ${page} ${width}`);
  }
  const local=await evaluate(`[...document.querySelectorAll('[href],[src]')].flatMap(el=>[el.href,el.src]).filter(h=>typeof h==='string'&&h.startsWith(location.origin))`);
  for(const link of local)allLinks.add(link);
  assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1,page);
 }
 for(const link of allLinks){const response=await fetch(link);assert.equal(response.ok,true,link);const url=new URL(link);if(url.hash&&response.headers.get('content-type')?.includes('text/html')){const page=await response.text();const anchor=decodeURIComponent(url.hash.slice(1));assert.ok(page.includes(`id="${anchor}"`)||page.includes(`id='${anchor}'`),`Missing anchor: ${link}`);}}
 assert.equal(errors.length,0,JSON.stringify(errors));
 await writeFile('qa/marketing-packages-results.json',JSON.stringify({sourceCellsVerified:90,results,sitePages:sitePages.length,siteWidths:[320,768,1440],localUrlsChecked:allLinks.size,keyboard:true,mobileNavigation:true,desktopFlyoutWidths:[1101,1280,1440,1920],fourPrimaryServices:true,footerPackagesLink:true,customQuotePrefill:true,customTemplateRejected:true,userTextPreserved:true,quotePrefill:true,localLinks:true,reducedMotion:true,errors},null,2));console.log(`PASS: package content and interactions; ${sitePages.length} pages at three widths; ${allLinks.size} local links/assets/anchors; no captured errors.`);
}finally{socket.close();server.close();}
