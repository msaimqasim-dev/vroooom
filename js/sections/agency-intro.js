/** Each transform has its own wrapper: parallax > reveal > float > rotation. */
export function initAgencyIntro(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      const select = gsap.utils.selector(section);
      gsap.from(select('.agency-reveal'), {
        opacity: 0, y: 26, stagger: .12, duration: .85, ease: 'power3.out',
        scrollTrigger: { trigger: section.querySelector('.agency-copy'), start: 'top 85%' },
      });
      gsap.from(select('.agency-card-reveal'), {
        opacity: 0, y: 40, scale: .94, stagger: .1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 78%' },
      });
      const desktop = window.innerWidth >= 1024;
      select('.agency-card-float').forEach((card, index) => {
        gsap.to(card, { y: desktop ? -12 : -5, duration: 3.4 + index * .35, delay: index * .3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
      if (desktop) {
        select('.agency-card').forEach((card, index) => {
          gsap.fromTo(card, { y: 20 }, {
            y: index % 2 ? -32 : -54, ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
          });
        });
      }
    }, section);
    return () => context.revert();
  });
  const refresh = () => ScrollTrigger.refresh();
  const images = [...section.querySelectorAll('img')];
  images.forEach(image => image.addEventListener('load', refresh));
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) refresh(); });
  return () => {
    disposed = true;
    images.forEach(image => image.removeEventListener('load', refresh));
    media.revert();
  };
}

// Deferred vendor scripts finish before DOMContentLoaded; no global scroll owner.
const mount = () => initAgencyIntro(document.querySelector('.agency-intro'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
