export function initWebsiteHosting(root) {
  if (!root) return () => {};
  const events = new AbortController();
  const buttons = [...root.querySelectorAll('[data-hosting-solution]')];
  const select = selected => buttons.forEach(button => {
    const active = button === selected;
    button.setAttribute('aria-expanded', String(active));
    root.querySelector('#' + button.getAttribute('aria-controls')).hidden = !active;
  });
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button), { signal: events.signal });
    button.addEventListener('focus', () => select(button), { signal: events.signal });
    button.closest('.wh-solution').addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') select(button);
    }, { signal: events.signal });
    button.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
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
        root.querySelectorAll('[data-wh-reveal]').forEach(element => gsap.from(element, {
          y: 24, opacity: 0, duration: .9, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 93%' }
        }));
        root.querySelectorAll('[data-wh-image]').forEach(figure => gsap.from(figure, {
          opacity: 0, duration: 1, scrollTrigger: { trigger: figure, start: 'top 93%' }
        }));
        const figure = root.querySelector('.wh-backup-image');
        gsap.fromTo(figure.querySelector('img'), { yPercent: -4, scale: 1.1 }, {
          yPercent: 4, scale: 1.1, ease: 'none',
          scrollTrigger: { trigger: figure, start: 'top bottom', end: 'bottom top', scrub: .5 }
        });
      }, root);
      return () => context.revert();
    });
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  }
  return () => { disposed = true; events.abort(); media?.revert(); };
}
let cleanup = () => {};
const mount = () => { cleanup(); cleanup = initWebsiteHosting(document.querySelector('.wh-page')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
