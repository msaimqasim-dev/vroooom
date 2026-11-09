/* ===== logo-projects ===== */
const logoProjectsModule = (() => {
// Verified official collection; source URL and project destination retained.
const projects = [
  {
    "name": "Coleman's woodcrafts",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/Colemans-Woodcrafts-logo-1.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/Colemans-Woodcrafts-logo-1.png", import.meta.url).href
  },
  {
    "name": "Martin's Tree service",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/1-1-768x576.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/1-1-768x576.png", import.meta.url).href
  },
  {
    "name": "rci services",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/RCI-Logo-outline.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/RCI-Logo-outline.png", import.meta.url).href
  },
  {
    "name": "Capella's Dance Studio",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/Capell_Trial_Logo.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/Capell_Trial_Logo.png", import.meta.url).href
  },
  {
    "name": "Affordable Prom Ballgowns",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/main-log.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/main-log.png", import.meta.url).href
  },
  {
    "name": "Miles Management Group",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/Miles-Management-Logo.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/Miles-Management-Logo.png", import.meta.url).href
  },
  {
    "name": "Smith's Water Authority",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/Large-Final.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/Large-Final.png", import.meta.url).href
  },
  {
    "name": "Machine Tool Fitters",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/02/SoftwareLogo-150.jpg",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/SoftwareLogo-150.jpg", import.meta.url).href
  },
  {
    "name": "franklin insulation group",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/06/franklinlogo-1024x236.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/franklinlogo-1024x236.png", import.meta.url).href
  },
  {
    "name": "Larry Love's Diamond Exchange",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/12/Diamond-Exchange-Logo-01-1024x576.jpg",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/Diamond-Exchange-Logo-01-1024x576.jpg", import.meta.url).href
  },
  {
    "name": "House of Blair",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/11/final-logo2.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/final-logo2.png", import.meta.url).href
  },
  {
    "name": "diet plans",
    "source": "https://www.vroooom.com/wp-content/uploads/2025/05/dietplans-logo.png",
    "url": null,
    "image": new URL("../assets/images/portfolio/logos/dietplans-logo.png", import.meta.url).href
  }
];
return { projects };
})();

/* ===== portfolio ===== */
{
const { projects: logos } = logoProjectsModule;
function initPortfolio(root){
 const events=new AbortController(),dialog=document.querySelector('.portfolio-lightbox'),image=dialog.querySelector('img'),title=dialog.querySelector('h2');let index=0,previousOverflow='',opener;
 const cards=[...root.querySelectorAll('.website-project')];let shown=12;const more=document.createElement('button');more.type='button';more.className='portfolio-load-more';more.textContent='Load More';root.querySelector('.website-gallery').after(more);const update=()=>{cards.forEach((c,i)=>{c.hidden=i>=shown});more.hidden=shown>=cards.length;};update();more.addEventListener('click',()=>{const first=shown;shown=Math.min(shown+12,cards.length);update();window.ScrollTrigger?.refresh();cards[first]?.querySelector('a').focus();},{signal:events.signal});
 let items=logos;
 const show=i=>{index=(i+items.length)%items.length;image.src=items[index].image;image.alt=items[index].name;title.textContent=items[index].name;};
 const websites=cards.map(card=>({image:card.querySelector('img').src,name:card.querySelector('img').alt}));
 cards.forEach((card,i)=>card.querySelector('a').addEventListener('click',e=>{e.preventDefault();opener=e.currentTarget;items=websites;show(i);previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();},{signal:events.signal}));
 root.querySelectorAll('[data-logo]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();opener=a;items=logos;show(Number(a.dataset.logo));previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();},{signal:events.signal}));
 dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close(),{signal:events.signal});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}},{signal:events.signal});dialog.addEventListener('close',()=>{document.documentElement.style.overflow=previousOverflow;opener?.focus();},{signal:events.signal});dialog.querySelector('[data-previous]').addEventListener('click',()=>show(index-1),{signal:events.signal});dialog.querySelector('[data-next]').addEventListener('click',()=>show(index+1),{signal:events.signal});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();return;}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}},{signal:events.signal});
 let media;const {gsap,ScrollTrigger}=window;if(gsap&&ScrollTrigger){gsap.registerPlugin(ScrollTrigger);media=gsap.matchMedia();media.add('(prefers-reduced-motion: no-preference)',()=>{const context=gsap.context(()=>{root.querySelectorAll('[data-portfolio-reveal]').forEach(e=>gsap.from(e,{y:28,opacity:0,duration:.85,ease:'power2.out',scrollTrigger:{trigger:e,start:'top 94%'}}));},root);return()=>context.revert();});}
 let disposed=false;document.fonts.ready.then(()=>{if(!disposed)window.ScrollTrigger?.refresh()});return()=>{disposed=true;if(dialog.open)dialog.close();events.abort();more.remove();cards.forEach(c=>{c.hidden=false});media?.revert();};
}
let cleanup=()=>{};const mount=()=>{cleanup();cleanup=initPortfolio(document.querySelector('.portfolio-page'));};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();window.addEventListener('pagehide',()=>cleanup());window.addEventListener('pageshow',e=>{if(e.persisted)mount()});
}
