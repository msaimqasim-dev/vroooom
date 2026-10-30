import { serviceRoutes, siteBase } from '../utils/site-links.js';
const fragmentURL = new URL('../../sections/home/navigation/section.html', import.meta.url);
export async function mountHeader(host) {
 if(!host)return ()=>{};
 try {const r=await fetch(fragmentURL);if(!r.ok)throw Error('Header request failed');host.innerHTML=await r.text();return initHeader(host);}catch(e){host.textContent='Navigation could not load. Please reload the page.';throw e;}
}
export function initHeader(root){
 const base=siteBase,nav=root.querySelector('nav'),toggle=root.querySelector('.menu-toggle'),media=matchMedia('(max-width:1100px)'),events=new AbortController();
 root.querySelector('.logo').href='/';root.querySelector('[data-brand-image]').src=new URL('assets/images/brand/final-logo_without-tag-27-2048x829.png',base);
 root.querySelector('.header-contact:not(.header-support)').href=new URL('contact-us/#quote',base);
 const routes={...serviceRoutes,support:'support-ticket/',faq:'faq/',contact:'contact-us/','https://www.vroooom.com/blog/':'blog/',home:'index.html',about:'about/',portfolio:'portfolio/',websites:'portfolio/#websites',logos:'portfolio/#logos'};
 const pagePath=location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
 root.querySelectorAll('[data-route]').forEach(a=>{a.removeAttribute('aria-current');a.href=routes[a.dataset.route]?new URL(routes[a.dataset.route],base):a.dataset.route;const url=new URL(a.href);if(url.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')===pagePath&&!url.hash)a.setAttribute('aria-current','page');});
 const servicesLink=root.querySelector('.nav-pair>a');
 if(Object.values(serviceRoutes).some(route=>new URL(route,base).pathname===pagePath))servicesLink.setAttribute('data-active-section','true');
 const closeSubs=()=>root.querySelectorAll('.dropdown-toggle').forEach(b=>{b.setAttribute('aria-expanded','false');document.getElementById(b.getAttribute('aria-controls')).hidden=true;});
 const setOpen=open=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);nav.inert=media.matches&&!open;if(!open)closeSubs();};
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'),{signal:events.signal});
 root.querySelectorAll('.nav-group').forEach(group=>{const b=group.querySelector('button'),panel=group.querySelector('.nav-submenu');const open=()=>{closeSubs();panel.hidden=false;b.setAttribute('aria-expanded','true');};b.addEventListener('click',()=>{const was=!panel.hidden;closeSubs();if(!was)open();},{signal:events.signal});b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();panel.querySelector('a').focus();}},{signal:events.signal});group.addEventListener('pointerenter',e=>{if(!media.matches&&e.pointerType==='mouse')open();},{signal:events.signal});group.addEventListener('pointerleave',()=>{if(!media.matches&&!group.contains(document.activeElement))closeSubs();},{signal:events.signal});group.addEventListener('focusout',e=>{if(!group.contains(e.relatedTarget))closeSubs();},{signal:events.signal});});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const b=root.querySelector('.dropdown-toggle[aria-expanded="true"]');if(b){closeSubs();b.focus();}else if(toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus();}}},{signal:events.signal});
 document.addEventListener('click',e=>{if(!root.contains(e.target))setOpen(false);},{signal:events.signal});nav.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false);},{signal:events.signal});const resize=()=>setOpen(false);media.addEventListener('change',resize);setOpen(false);return()=>{events.abort();media.removeEventListener('change',resize);setOpen(false);};
}

