/** Reproduce the approved reveal hook and desktop heading pin. */
export function initProcess(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px)' }, ({ conditions }) => {
    if (!conditions.motion) return;
    const context = gsap.context(() => {
      section.querySelectorAll('[data-reveal]').forEach(element => {
        gsap.from(element, {
          y: 35, opacity: 0, duration: .9,
          scrollTrigger: { trigger: element, start: 'top 91%' },
        });
      });
      if (conditions.desktop) {
        ScrollTrigger.create({
          trigger: section.querySelector('.process-layout'),
          start: 'top 120px', end: 'bottom 75%',
          pin: section.querySelector('.process-heading'), pinSpacing: false,
        });
      }
    }, section);
    return () => context.revert();
  });
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  return () => { disposed = true; media.revert(); };
}

const mount = () => initProcess(document.querySelector('.process'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
