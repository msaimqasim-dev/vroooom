/** Shared destinations resolve from the site root, including subdirectory hosting. */
export const siteBase = new URL('../../', import.meta.url);
export const serviceRoutes = Object.freeze({
  services: 'services/',
  websiteDesign: 'website-design/',
  websiteMarketing: 'website-marketing/',
  websiteHosting: 'website-hosting/'
});
export const localURL = route => new URL(route, siteBase);
const originalRoutes = Object.freeze({
  '/': 'index.html',
  '/about/': 'about/#team',
  '/our-history/': 'about/#history',
  '/our-awards/': 'about/#awards',
  '/testimonials/': 'about/#testimonials',
  '/faq/': 'faq/',
  '/portfolio/': 'portfolio/#websites',
  '/logo-portfolio/': 'portfolio/#logos',
  '/what-we-offer/': serviceRoutes.services,
  '/website-design/': serviceRoutes.websiteDesign,
  '/website-marketing/': serviceRoutes.websiteMarketing,
  '/website-hosting/': serviceRoutes.websiteHosting,
  '/contact-us/': 'contact-us/',
  '/get-a-quote/': 'contact-us/#quote',
  '/blog/': 'blog/'
});
/** Apply only to navigation links; retain explicitly labeled editorial source links. */
export function localNavigationURL(href) {
  const url = new URL(href, siteBase);
  if (!['vroooom.com', 'www.vroooom.com'].includes(url.hostname)) return null;
  const route = originalRoutes[url.pathname.replace(/\/?$/, '/')];
  if (!route) return null;
  const target = localURL(route);
  target.search = url.search;
  if (url.hash) target.hash = url.hash;
  return target;
}
