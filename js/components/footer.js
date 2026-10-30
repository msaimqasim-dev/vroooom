import { localNavigationURL } from '../utils/site-links.js';
const fragmentURL = new URL('../../components/footer.html', import.meta.url);

/** Shared across pages: module-relative fragment and shared local navigation destinations. */
export async function mountFooter(host) {
  if (!host) return () => {};
  try {
    const response = await fetch(fragmentURL);
    if (!response.ok) throw new Error(`Footer request failed: ${response.status}`);
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    host.replaceChildren(template.content);
    host.querySelectorAll('[data-footer-logo]').forEach(image => {
      image.src = new URL('../../assets/images/brand/final-logo_without-tag-27-2048x829.png', import.meta.url).href;
    });
    const aboutURL = new URL('../../about/', import.meta.url);
    const aboutRoutes = { '/about/':'team', '/our-history/':'history', '/our-awards/':'awards', '/testimonials/':'testimonials', '/faq/':'faqs' };
    host.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href.startsWith('#')) link.href = new URL(href, fragmentURL).href;
      const url = new URL(link.href);
      const local = localNavigationURL(link.href);
      if (local) link.href = local.href;
      if (url.hostname === 'www.vroooom.com' && aboutRoutes[url.pathname]) {
        link.href = `${aboutURL.href}#${aboutRoutes[url.pathname]}`;
      }
    });
    host.querySelector('[data-footer-year]').textContent = String(new Date().getFullYear());
    window.ScrollTrigger?.refresh();
    return () => host.replaceChildren();
  } catch (error) {
    host.textContent = 'Footer could not load. Please reload the page.';
    throw error;
  }
}

if (typeof document !== 'undefined') {
  mountFooter(document.querySelector('[data-site-footer]')).catch(error => console.error('Unable to load footer:', error));
}
