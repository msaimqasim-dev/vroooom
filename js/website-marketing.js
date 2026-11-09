export function initWebsiteMarketing(root) {
  if (!root) return () => {};
  const events = new AbortController();
  const buttons = [...root.querySelectorAll('[data-solution]')];
  const show = selected => buttons.forEach(button => {
    const active = button === selected;
    button.setAttribute('aria-expanded', String(active));
    root.querySelector('#' + button.getAttribute('aria-controls')).hidden = !active;
  });
  buttons.forEach(button => {
    button.addEventListener('click', () => show(button), { signal: events.signal });
    button.addEventListener('focus', () => show(button), { signal: events.signal });
    button.closest('.wm-row').addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') show(button);
    }, { signal: events.signal });
    button.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = buttons.indexOf(button);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    }, { signal: events.signal });
  });
  const { gsap, ScrollTrigger } = window;
  let media;
  let disposed = false;
  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        root.querySelectorAll('[data-wm-reveal]').forEach(element => gsap.from(element, {
          y: 26, opacity: 0, duration: .9, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 93%' }
        }));
        root.querySelectorAll('[data-wm-image]').forEach(figure => {
          gsap.from(figure, { opacity: 0, duration: 1, scrollTrigger: { trigger: figure, start: 'top 93%' } });
          gsap.fromTo(figure.querySelector('img'), { yPercent: -3, scale: 1.08 }, {
            yPercent: 3, scale: 1.08, ease: 'none', scrollTrigger: { trigger: figure, start: 'top bottom', end: 'bottom top', scrub: 1 }
          });
        });
        const timeline = root.querySelector('.wm-timeline');
        gsap.fromTo(timeline.querySelector('.wm-progress>span'), { scaleY: 0 }, {
          scaleY: 1, ease: 'none', scrollTrigger: { trigger: timeline, start: 'top 65%', end: 'bottom 65%', scrub: .5 }
        });
        timeline.querySelectorAll('li').forEach(step => ScrollTrigger.create({
          trigger: step, start: 'top 65%', end: 'bottom 65%', toggleClass: 'is-active'
        }));
      }, root);
      return () => { context.revert(); root.querySelectorAll('.is-active').forEach(step => step.classList.remove('is-active')); };
    });
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  }
  return () => { disposed = true; events.abort(); media?.revert(); };
}
let cleanup = () => {};
const mount = () => { cleanup(); cleanup = initWebsiteMarketing(document.querySelector('.wm-page')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
