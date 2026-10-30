/** Scroll owns the rail progress; no independent clock or scroll controller. */
export function initAboutTimeline(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const items = [...section.querySelectorAll('.about-timeline li')];
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      gsap.fromTo(section.querySelector('.about-timeline-rail > span'), { scaleY:0 }, {
        scaleY:1, ease:'none',
        scrollTrigger:{ trigger:section.querySelector('.about-timeline'), start:'top 65%', end:'bottom 65%', scrub:.5 },
      });
      items.forEach(item => {
        gsap.from(item, { y:22, opacity:0, duration:.7, scrollTrigger:{ trigger:item, start:'top 92%' } });
        ScrollTrigger.create({ trigger:item, start:'top 65%', end:'bottom 65%', toggleClass:'is-current' });
      });
    }, section);
    return () => { context.revert(); items.forEach(item => item.classList.remove('is-current')); };
  });
  return () => media.revert();
}
