/** Native details retain keyboard and no-JavaScript support. */
export function initFAQs(root) {
  if (!root) return () => {};
  const events = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = [...root.querySelectorAll('.faq-group details')].map(details => ({
    details, answer: details.querySelector('.faq-answer'), open: details.open, animation: null
  }));
  const settle = state => {
    state.animation?.cancel();
    state.animation = null;
    state.details.open = state.open;
    state.answer.style.removeProperty('overflow');
    state.answer.inert = !state.open;
    window.ScrollTrigger?.refresh();
  };
  for (const state of states) {
    state.answer.inert = !state.open;
    state.details.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      const height = state.details.open ? state.answer.getBoundingClientRect().height : 0;
      state.animation?.cancel();
      state.open = !state.open;
      state.answer.inert = !state.open;
      if (motion.matches || !state.answer.animate) { settle(state); return; }
      state.details.open = true;
      state.answer.style.overflow = 'hidden';
      state.animation = state.answer.animate([
        {height: `${height}px`, opacity: state.open ? .3 : 1},
        {height: `${state.open ? state.answer.scrollHeight : 0}px`, opacity: state.open ? 1 : 0}
      ], {duration: 300, easing: 'cubic-bezier(.22,1,.36,1)'});
      state.animation.onfinish = () => settle(state);
    }, {signal: events.signal});
  }
  const onMotion = () => states.forEach(settle);
  motion.addEventListener('change', onMotion);
  return () => {
    events.abort();
    motion.removeEventListener('change', onMotion);
    states.forEach(state => { settle(state); state.answer.inert = false; });
  };
}
let cleanup = () => {};
const mount = () => { cleanup(); cleanup = initFAQs(document.querySelector('.faq-page')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
else mount();
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
