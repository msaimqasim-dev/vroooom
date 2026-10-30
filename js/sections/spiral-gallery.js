import { portfolio, portfolioBackground, spiralConfig, getSpiralGeometry, getCardFocusProgress } from '../data/portfolio.js';
import { localNavigationURL } from '../utils/site-links.js';

// A pure position function: identical progress always produces identical transforms.
// Angle and height share the same path parameter, so cards follow one helix.
export function getSpiralPosition(index, count, progress, geometry) {
  const travel = Math.max(1, count - 1 - spiralConfig.leadingCards * 2);
  const parameter = index - spiralConfig.leadingCards - Math.max(0, Math.min(1, progress)) * travel;
  const angle = parameter * (Math.PI * 2 / spiralConfig.cardsPerTurn) + spiralConfig.phaseOffset;
  const depth = Math.cos(angle);
  return {
    x: Math.sin(angle) * geometry.radius,
    y: parameter * geometry.spacing,
    z: depth * geometry.depth,
    rotateX: depth * geometry.tiltX,
    // Unwrapped orientation follows the helix, exposing both faces smoothly.
    // Do not modulo by 360: a reset would introduce a discontinuity.
    rotateY: angle * 180 / Math.PI + Math.sin(angle) * geometry.tiltY * .1,
    rotateZ: Math.sin(angle + .6) * geometry.tiltZ,
    scale: geometry.minScale + (depth + 1) * geometry.scaleRange / 2,
    brightness: .78 + (depth + 1) * .11,
  };
}

export function getInitialCardPosition(index, width, height) {
  return getSpiralPosition(index, portfolio.length, 0, getSpiralGeometry(width, height));
}

function createCard(project) {
  const card = document.createElement('a');
  card.className = 'spiral-card';
  card.href = localNavigationURL(project.url)?.href || project.url;
  card.setAttribute('aria-label', `View ${project.name} in Vroooom's portfolio`);
  // The helix rotates these two faces together; no independent flip tween.
  for (const side of ['front', 'back']) {
    const face = document.createElement('span');
    face.className = `spiral-card-face spiral-card-${side}`;
    if (side === 'back') face.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = project.image;
    image.alt = side === 'front' ? `${project.name} — original Vroooom website design` : '';
    image.width = 1024;
    image.height = 651;
    image.loading = 'lazy';
    image.decoding = 'async';
    face.append(image);
    card.append(face);
  }
  return card;
}

export function initSpiralGallery(section) {
  if (!section) return () => {};
  const gallery = section.querySelector('.spiral-gallery');
  const light = section.querySelector('.featured-work-light');
  light.style.backgroundImage = `url("${portfolioBackground}")`;
  const cards = portfolio.map(createCard);
  gallery.replaceChildren(...cards);
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return () => gallery.replaceChildren();
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 1100px)',
    tablet: '(min-width: 768px) and (max-width: 1099px)',
    mobile: '(max-width: 767px)',
  }, ({ conditions }) => {
    if (!conditions.motion) return;
    const state = { progress: 0 };
    const previousStyles = cards.map(card => card.getAttribute('style'));
    const previousLightStyle = light.getAttribute('style');
    let geometry;
    const measure = () => { geometry = getSpiralGeometry(gallery.clientWidth, gallery.clientHeight); };
    const render = () => {
      cards.forEach((card, index) => {
        const p = getSpiralPosition(index, cards.length, state.progress, geometry);
        card.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rotateX}deg) rotateY(${p.rotateY}deg) rotateZ(${p.rotateZ}deg) scale(${p.scale})`;
        card.style.setProperty('--card-shade', String(1 - p.brightness));
      });
      light.style.transform = `translate3d(${-state.progress * 2}%, ${state.progress * 2}%, 0) scale(1.08)`;
    };
    let tween;
    const context = gsap.context(() => {
      measure();
      render();
      tween = gsap.fromTo(state, { progress: 0 }, {
        progress: 1, ease: 'none', onUpdate: render,
        scrollTrigger: {
          trigger: section, start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * geometry.scrollScreens)}`,
          pin: true, scrub: spiralConfig.scrub, anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onRefresh: trigger => { measure(); state.progress = trigger.progress; render(); },
        },
      });
    }, section);
    const focusCard = event => {
      const card = event.target.closest('.spiral-card');
      if (!card || !card.matches(':focus-visible')) return;
      const trigger = tween.scrollTrigger;
      const progress = getCardFocusProgress(cards.indexOf(card), cards.length);
      trigger.scroll(trigger.start + progress * (trigger.end - trigger.start));
      ScrollTrigger.update();
      tween.progress(progress);
    };
    gallery.addEventListener('focusin', focusCard);
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(frame);
      gallery.removeEventListener('focusin', focusCard);
      context.revert();
      cards.forEach((card, index) => previousStyles[index] === null ? card.removeAttribute('style') : card.setAttribute('style', previousStyles[index]));
      previousLightStyle === null ? light.removeAttribute('style') : light.setAttribute('style', previousLightStyle);
    };
  });
  // Keep native window scrolling; the HTML project has no Lenis instance.
  // Any future shared Lenis integration must own its ticker outside this section.
  const refresh = () => ScrollTrigger.refresh();
  const images = [...gallery.querySelectorAll('img')];
  images.forEach(image => image.addEventListener('load', refresh));
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) refresh(); });
  return () => {
    disposed = true;
    images.forEach(image => image.removeEventListener('load', refresh));
    media.revert();
    gallery.replaceChildren();
    light.style.removeProperty('background-image');
  };
}

const mount = () => initSpiralGallery(document.querySelector('.featured-work'));
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}

