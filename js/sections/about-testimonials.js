/** Manual-only, wraparound slider. Text and attribution stay together in each figure. */
export function initAboutTestimonials(section) {
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
