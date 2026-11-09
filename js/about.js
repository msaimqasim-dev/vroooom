/* ===== about-testimonials ===== */
const aboutTestimonialsModule = (() => {
/** Manual-only, wraparound slider. Text and attribution stay together in each figure. */
function initAboutTestimonials(section) {
  if (!section) return () => {};
  const slides = [...section.querySelectorAll('[data-review]')];
  const previews = [...section.querySelectorAll('[data-review-goto]')];
  const previous = section.querySelector('[data-review-prev]');
  const next = section.querySelector('[data-review-next]');
  const count = section.querySelector('[data-review-count]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let index = 0;
  let tween;
  const clearMotion = () => {
    tween?.kill();
    slides.forEach(slide => { slide.style.removeProperty('opacity'); slide.style.removeProperty('transform'); });
  };
  const show = (requested, direction = 1) => {
    clearMotion();
    index = (requested + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    previews.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[index].querySelector('strong').textContent}`;
    if (!motion.matches && window.gsap) {
      tween = window.gsap.fromTo(slides[index], { opacity:0, y:direction * 14 }, {
        opacity:1, y:0, duration:.45, ease:'power2.out', clearProps:'opacity,transform',
      });
    }
  };
  [previous, next, ...previews].forEach(button => { button.disabled = false; });
  previous.addEventListener('click', () => show(index - 1, -1), { signal:events.signal });
  next.addEventListener('click', () => show(index + 1), { signal:events.signal });
  previews.forEach((button, i) => button.addEventListener('click', () => show(i, i < index ? -1 : 1), { signal:events.signal }));
  section.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    show(index + direction, direction);
  }, { signal:events.signal });
  motion.addEventListener('change', clearMotion);
  return () => {
    events.abort(); motion.removeEventListener('change', clearMotion); clearMotion();
    [previous, next, ...previews].forEach(button => { button.disabled = true; });
  };
}
return { initAboutTestimonials };
})();

/* ===== about ===== */
{

const { initAboutTestimonials } = aboutTestimonialsModule;

/** Enhance native details: all answers remain usable when JavaScript is unavailable. */
function initFAQs(root) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const states = [...root.querySelectorAll('.about-faq-list details')].map(details => ({
    details, answer:details.querySelector('.about-faq-answer'), open:details.open, animation:null,
  }));
  const refresh = () => window.ScrollTrigger?.refresh();
  const settle = state => {
    state.animation?.cancel(); state.animation = null;
    state.details.open = state.open;
    state.answer.style.removeProperty('overflow');
  };
  states.forEach(state => {
    state.details.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      // Closed details may still report an intrinsic child height in Chromium.
      const height = state.details.open ? state.answer.getBoundingClientRect().height : 0;
      state.animation?.cancel();
      state.open = !state.open;
      if (motion.matches || !state.answer.animate) { settle(state); refresh(); return; }
      state.details.open = true;
      state.answer.style.overflow = 'hidden';
      state.animation = state.answer.animate([
        { height:`${height}px`, opacity:state.open ? .3 : 1 },
        { height:`${state.open ? state.answer.scrollHeight : 0}px`, opacity:state.open ? 1 : 0 },
      ], { duration:300, easing:'cubic-bezier(.22,1,.36,1)' });
      state.animation.onfinish = () => { settle(state); refresh(); };
    }, { signal:events.signal });
  });
  const onMotion = () => { states.forEach(settle); refresh(); };
  motion.addEventListener('change', onMotion);
  return () => { events.abort(); motion.removeEventListener('change', onMotion); states.forEach(settle); };
}

function initAboutPage(root) {
  if (!root) return () => {};
  const cleanups = [initAboutTestimonials(root.querySelector('.about-review-slider')), initFAQs(root)];
  const { gsap, ScrollTrigger } = window;
  let disposed = false;
  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const hero = root.querySelector('.about-hero');
        gsap.from(hero.querySelectorAll('[data-about-reveal]'), { y:30, opacity:0, duration:1, stagger:.12, ease:'power3.out' });
        root.querySelectorAll('.about-section [data-about-reveal]').forEach(element => {
          gsap.from(element, { y:28, opacity:0, duration:.85, ease:'power2.out', scrollTrigger:{ trigger:element, start:'top 92%' } });
        });
        // Reveal the image wrapper; portrait hover keeps ownership of image scaling.
        root.querySelectorAll('[data-about-image]').forEach(figure => {
          gsap.from(figure, { clipPath:'inset(14% 0 0 0)', opacity:0, duration:1.1, ease:'power2.out',
            scrollTrigger:{ trigger:figure, start:'top 90%' },
          });
        });
      }, root);
      return () => context.revert();
    });
    cleanups.push(() => media.revert());
    const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
    document.fonts.ready.then(refresh);
    const images = [...root.querySelectorAll('img')];
    images.forEach(image => image.addEventListener('load', refresh));
    cleanups.push(() => images.forEach(image => image.removeEventListener('load', refresh)));
  }
  return () => { disposed = true; cleanups.reverse().forEach(cleanup => cleanup()); };
}

let cleanup = () => {};
const mount = () => { cleanup(); cleanup = initAboutPage(document.querySelector('.about-page')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
else mount();
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
}

// Keep the approved biography in the document; clone its complete content into the dialog.
const dialog=document.createElement('dialog');
dialog.className='team-dialog';
dialog.setAttribute('aria-labelledby','team-dialog-name');
dialog.innerHTML='<button type="button" class="team-dialog-close" aria-label="Close biography">×</button><div class="team-dialog-layout"></div>';
document.body.append(dialog);
let teamOpener,previousOverflow,closeAnimation;
const teamMotion=matchMedia('(prefers-reduced-motion: reduce)');
function closeTeam(){
  if(closeAnimation||!dialog.open)return;
  if(teamMotion.matches){dialog.close();return;}
  closeAnimation=dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:180,easing:'ease-in',fill:'forwards'});
  closeAnimation.finished.then(()=>{dialog.close();closeAnimation.cancel();closeAnimation=null;});
}
document.querySelectorAll('.about-person').forEach(person=>{
  const bio=person.querySelector('.team-biography'),button=person.querySelector('.team-more');
  if(!bio||!button)return;
  bio.classList.add('is-preview');
  button.setAttribute('aria-haspopup','dialog');
  button.addEventListener('click',()=>{
    teamOpener=button;
    const photo=person.querySelector('figure').cloneNode(true),name=document.createElement('h2'),copy=document.createElement('div');
    photo.removeAttribute('data-about-image');photo.removeAttribute('style');
    name.id='team-dialog-name';name.textContent=person.querySelector('h3').innerHTML.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    const full=bio.cloneNode(true);full.classList.remove('is-preview');
    full.querySelectorAll('p').forEach(p=>{if(p.querySelector('strong')?.textContent.trim()==='Expertise:')p.classList.add('biography-expertise');});
    copy.append(name,person.querySelector('.about-role').cloneNode(true),full);
    dialog.querySelector('.team-dialog-layout').replaceChildren(photo,copy);
    previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();dialog.scrollTop=0;dialog.querySelector('button').focus({preventScroll:true});
    if(!teamMotion.matches)dialog.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
  });
});
dialog.querySelector('button').addEventListener('click',closeTeam);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeTeam();});
dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(control=>!control.disabled&&!control.hidden);
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeTeam();}});
dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;teamOpener?.focus();});
