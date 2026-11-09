/* ===== site-links ===== */
const siteLinksModule = (() => {
/** Shared destinations resolve from the site root, including subdirectory hosting. */
const siteBase = new URL('../', import.meta.url);
const serviceRoutes = Object.freeze({
  services: 'services.html',
  websiteDesign: 'website-design.html',
  websiteMarketing: 'website-marketing.html',
  websiteHosting: 'website-hosting.html'
});
const localURL = route => new URL(route, siteBase);
const originalRoutes = Object.freeze({
  '/': 'index.html',
  '/about/': 'about.html',
  '/our-history/': 'our-history.html',
  '/our-awards/': 'our-awards.html',
  '/testimonials/': 'about.html#testimonials',
  '/faq/': 'faq.html',
  '/portfolio/': 'portfolio.html#websites',
  '/logo-portfolio/': 'portfolio.html#logos',
  '/what-we-offer/': serviceRoutes.services,
  '/website-design/': serviceRoutes.websiteDesign,
  '/website-marketing/': serviceRoutes.websiteMarketing,
  '/website-hosting/': serviceRoutes.websiteHosting,
  '/contact-us/': 'contact-us.html',
  '/get-a-quote/': 'contact-us.html#quote',
  '/blog/': 'blog.html'
});
/** Apply only to navigation links; retain explicitly labeled editorial source links. */
function localNavigationURL(href) {
  const url = new URL(href, siteBase);
  if (!['vroooom.com', 'www.vroooom.com'].includes(url.hostname)) return null;
  const route = originalRoutes[url.pathname.replace(/\/?$/, '/')];
  if (!route) return null;
  const target = localURL(route);
  target.search = url.search;
  if (url.hash) target.hash = url.hash;
  return target;
}
return { siteBase, serviceRoutes, localURL, localNavigationURL };
})();

/* ===== header ===== */
const headerModule = (() => {
const { serviceRoutes, siteBase } = siteLinksModule;
const fragmentURL = new URL('../header.part', import.meta.url);
async function mountHeader(host) {
 if(!host)return ()=>{};
 try {const r=await fetch(fragmentURL);if(!r.ok)throw Error('Header request failed');host.innerHTML=await r.text();return initHeader(host);}catch(e){host.textContent='Navigation could not load. Please reload the page.';throw e;}
}
function initHeader(root){
 const base=siteBase,nav=root.querySelector('nav'),toggle=root.querySelector('.menu-toggle'),media=matchMedia('(max-width:1100px)'),events=new AbortController();
 root.querySelector('.logo').href='/';root.querySelector('[data-brand-image]').src=new URL('assets/images/brand/final-logo_without-tag-27-2048x829.png',base);
 root.querySelector('.header-contact:not(.header-support)').href=new URL('contact-us.html#quote',base);
 const routes={...serviceRoutes,support:'support-ticket.html',faq:'faq.html',contact:'contact-us.html','https://www.vroooom.com/blog/':'blog.html',home:'index.html',about:'about.html',history:'our-history.html',awards:'our-awards.html',portfolio:'portfolio.html',websites:'portfolio.html#websites',logos:'portfolio.html#logos'};
 const pagePath=location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
 root.querySelectorAll('[data-route]').forEach(a=>{a.removeAttribute('aria-current');a.href=routes[a.dataset.route]?new URL(routes[a.dataset.route],base):a.dataset.route;const url=new URL(a.href);if(url.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')===pagePath&&!url.hash)a.setAttribute('aria-current','page');});
 const servicesLink=root.querySelector('[data-route="services"]');
 if(Object.values(serviceRoutes).some(route=>new URL(route,base).pathname.replace(/\/?$/, '/')===pagePath))servicesLink.setAttribute('data-active-section','true');
 if(['our-history.html','our-awards.html'].some(route=>location.pathname.endsWith('/'+route)))root.querySelector('[data-route="about"]').setAttribute('data-active-section','true');
 const closeSubs=()=>root.querySelectorAll('.dropdown-toggle').forEach(b=>{b.setAttribute('aria-expanded','false');document.getElementById(b.getAttribute('aria-controls')).hidden=true;});
 const setOpen=open=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);nav.inert=media.matches&&!open;if(!open)closeSubs();};
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'),{signal:events.signal});
 root.querySelectorAll('.nav-group').forEach(group=>{const b=group.querySelector('button'),panel=group.querySelector('.nav-submenu');const open=()=>{closeSubs();panel.hidden=false;b.setAttribute('aria-expanded','true');};b.addEventListener('click',()=>{const was=!panel.hidden;closeSubs();if(!was)open();},{signal:events.signal});b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();panel.querySelector('a').focus();}},{signal:events.signal});group.addEventListener('pointerenter',e=>{if(!media.matches&&e.pointerType==='mouse')open();},{signal:events.signal});group.addEventListener('pointerleave',()=>{if(!media.matches&&!group.contains(document.activeElement))closeSubs();},{signal:events.signal});group.addEventListener('focusout',e=>{if(!group.contains(e.relatedTarget))closeSubs();},{signal:events.signal});});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const b=root.querySelector('.dropdown-toggle[aria-expanded="true"]');if(b){closeSubs();b.focus();}else if(toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus();}}},{signal:events.signal});
 document.addEventListener('click',e=>{if(!root.contains(e.target))setOpen(false);},{signal:events.signal});nav.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false);},{signal:events.signal});const resize=()=>setOpen(false);media.addEventListener('change',resize);setOpen(false);return()=>{events.abort();media.removeEventListener('change',resize);setOpen(false);};
}
return { mountHeader, initHeader };
})();

/* ===== main ===== */
{
const { mountHeader } = headerModule;

mountHeader(document.querySelector('[data-site-header]')).catch(error => {
  console.error('Unable to load navigation:', error);
});
}

/* ===== footer ===== */
{
const { localNavigationURL } = siteLinksModule;
const fragmentURL = new URL('../footer.part', import.meta.url);

/** Shared across pages: module-relative fragment and shared local navigation destinations. */
async function mountFooter(host) {
  if (!host) return () => {};
  try {
    const response = await fetch(fragmentURL);
    if (!response.ok) throw new Error(`Footer request failed: ${response.status}`);
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    host.replaceChildren(template.content);
    host.querySelectorAll('[data-footer-logo]').forEach(image => {
      image.src = new URL('../assets/images/brand/final-logo_without-tag-27-2048x829.png', import.meta.url).href;
    });
    const aboutURL = new URL('../about.html', import.meta.url);
    const aboutRoutes = { '/about/':'team', '/testimonials/':'testimonials', '/faq/':'faqs' };
    host.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href.startsWith('#')) link.href = new URL(href, fragmentURL).href;
      const url = new URL(link.href);
      const local = localNavigationURL(link.href);
      if (local) link.href = local.href;
      if (url.hostname === 'www.vroooom.com' && aboutRoutes[url.pathname]) {
        link.href = `${aboutURL.href}#${aboutRoutes[url.pathname]}`;
      }
    });
    host.querySelector('[data-footer-year]').textContent = String(new Date().getFullYear());
    window.ScrollTrigger?.refresh();
    return () => host.replaceChildren();
  } catch (error) {
    host.textContent = 'Footer could not load. Please reload the page.';
    throw error;
  }
}

if (typeof document !== 'undefined') {
  mountFooter(document.querySelector('[data-site-footer]')).catch(error => console.error('Unable to load footer:', error));
}
}

/* ===== final-cta ===== */
{
/** Original 0.9s headline reveal; the decorative glow remains CSS-owned. */
function initFinalCTA(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      gsap.from(section.querySelector('[data-reveal]'), {
        y:35, opacity:0, duration:.9,
        scrollTrigger: { trigger:section.querySelector('[data-reveal]'), start:'top 91%' },
      });
    }, section);
    return () => context.revert();
  });
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  return () => { disposed = true; media.revert(); };
}

const mount = () => initFinalCTA(document.querySelector('#contact'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
else mount();
}

const { localNavigationURL } = siteLinksModule;
export { localNavigationURL };
