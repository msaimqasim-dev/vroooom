import { initAboutTimeline } from '../sections/about-timeline.js';
import { initAboutTestimonials } from '../sections/about-testimonials.js';

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

export function initAboutPage(root) {
  if (!root) return () => {};
  const cleanups = [initAboutTimeline(root.querySelector('#history')), initAboutTestimonials(root.querySelector('.about-review-slider')), initFAQs(root)];
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
