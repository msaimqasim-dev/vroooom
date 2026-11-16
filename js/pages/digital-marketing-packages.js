const root = document.querySelector('.dmp');
const tablist = root.querySelector('.dmp-tabs');
const tabs = [...tablist.querySelectorAll('a')];
const panels = [...root.querySelectorAll('.dmp-panel')];
tablist.setAttribute('role', 'tablist');
const activate = index => {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    panels[i].hidden = i !== index;
  });
};
tabs.forEach((tab, i) => {
  tab.id = `plan-tab-${i}`;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panels[i].id);
  panels[i].setAttribute('role', 'tabpanel');
  panels[i].setAttribute('aria-labelledby', tab.id);
  panels[i].tabIndex = 0;
  tab.addEventListener('click', event => { event.preventDefault(); activate(i); });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    activate(next); tabs[next].focus();
  });
});
const initial = panels.findIndex(panel => `#${panel.id}` === location.hash);
activate(initial < 0 ? 0 : initial);
window.addEventListener('hashchange', () => {
  const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
  if (index >= 0) activate(index);
});
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.animate([{ opacity: .35, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'ease-out' });
    observer.unobserve(entry.target);
  }), { threshold: .15 });
  root.querySelectorAll('[data-dmp-reveal]').forEach(item => observer.observe(item));
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
