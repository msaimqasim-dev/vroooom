/** Preserve the approved testimonial's scoped, subtle reveal. */
export function initRecognition(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      section.querySelectorAll('[data-reveal]').forEach(element => {
        gsap.from(element, {
          y:35, opacity:0, duration:.9,
          scrollTrigger: { trigger:element, start:'top 91%' },
        });
      });
    }, section);
    return () => context.revert();
  });
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  return () => { disposed = true; media.revert(); };
}

const mount = () => initRecognition(document.querySelector('.recognition'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
else mount();
