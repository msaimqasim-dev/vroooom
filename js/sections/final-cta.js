/** Original 0.9s headline reveal; the decorative glow remains CSS-owned. */
export function initFinalCTA(section) {
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
