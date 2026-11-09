import { localNavigationURL } from './site.js';

/* ===== portfolio-data ===== */
const portfolioDataModule = (() => {
// Verified source: https://www.vroooom.com/portfolio/
const portfolio = [
  {
    "name": "Shih Tzu Showoffs",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/08/Portfolio-MacBook-Cutout_Shi-Tzu-Show-Offs-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-1.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Larry Love's Diamond Exchange",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_Larry-Loves-Diamond-Exchange-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-2.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Columbus Cabinet",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_ColumbusCabinet-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-3.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Mark Post Law",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout-_Mark-Law-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-4.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "PR Gloss & Tint",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_PR-Gloss-Tinit-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-5.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Shannon B Whittington",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/08/Portfolio-MacBook-Cutout_ShannonBW-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-6.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "City of Buena Vista",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/03/Portfolio-MacBook-Cutout_COBV-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-7.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Woodruff real estate",
    "source": "https://www.vroooom.com/wp-content/uploads/2023/12/macbook_woodruff-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-8.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Buena Vista Road Animal Hospital",
    "source": "https://www.vroooom.com/wp-content/uploads/2023/12/macbook_bvrah-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-9.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Martin's Tree Services",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/06/Portfolio-MacBook-Cutout_MartinTree-1024x651.png",
    "image": new URL('../assets/images/portfolio/spiral-10.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  }
];

// Supplied dark-green lighting image, served directly from public/assets.
const portfolioBackground = new URL('../assets/images/portfolio/featured-work-background.png', import.meta.url).href;

// Approved geometry and scroll settings from React FeaturedWork/spiralConfig.js.
const spiralConfig = {
  scrub: 0.7,
  cardsPerTurn: 4.8,
  leadingCards: 1.5,
  phaseOffset: 0.35,
  desktop: { radiusRatio: .24, maxRadius: 360, depthRatio: .16, maxDepth: 230, spacingRatio: .23, maxSpacing: 210, tiltX: 13, tiltY: 42, tiltZ: 12, minScale: .85, scaleRange: .18, scrollScreens: 2.8 },
  tablet: { radiusRatio: .23, maxRadius: 240, depthRatio: .12, maxDepth: 125, spacingRatio: .22, maxSpacing: 170, tiltX: 10, tiltY: 30, tiltZ: 9, minScale: .88, scaleRange: .14, scrollScreens: 2.4 },
  mobile: { radiusRatio: .23, maxRadius: 120, depthRatio: .15, maxDepth: 65, spacingRatio: .23, maxSpacing: 150, tiltX: 7, tiltY: 18, tiltZ: 5, minScale: .88, scaleRange: .12, scrollScreens: 2 },
};

function getSpiralGeometry(width, height) {
  const profile = width < 768 ? spiralConfig.mobile : width < 1100 ? spiralConfig.tablet : spiralConfig.desktop;
  return {
    ...profile,
    radius: Math.min(width * profile.radiusRatio, profile.maxRadius),
    depth: Math.min(width * profile.depthRatio, profile.maxDepth),
    spacing: Math.min(height * profile.spacingRatio, profile.maxSpacing),
  };
}

function getCardFocusProgress(index, count) {
  const travel = Math.max(1, count - 1 - spiralConfig.leadingCards * 2);
  return Math.max(0, Math.min(1, (index - spiralConfig.leadingCards) / travel));
}
return { portfolio, portfolioBackground, spiralConfig, getSpiralGeometry, getCardFocusProgress };
})();

/* ===== agency-intro ===== */
{
/** Each transform has its own wrapper: parallax > reveal > float > rotation. */
function initAgencyIntro(section) {
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
}

/* ===== spiral-gallery ===== */
{
const { portfolio, portfolioBackground, spiralConfig, getSpiralGeometry, getCardFocusProgress } = portfolioDataModule;

// A pure position function: identical progress always produces identical transforms.
// Angle and height share the same path parameter, so cards follow one helix.
function getSpiralPosition(index, count, progress, geometry) {
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

function getInitialCardPosition(index, width, height) {
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

function initSpiralGallery(section) {
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
}

/* ===== why-vroooom ===== */
{
/** Match the approved useSectionAnimation hook within this section's scope. */
function initWhyVroooom(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      section.querySelectorAll('[data-reveal]').forEach(element => {
        gsap.from(element, {
          y: 35, opacity: 0, duration: .9,
          scrollTrigger: { trigger: element, start: 'top 91%' },
        });
      });
    }, section);
    return () => context.revert();
  });
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  return () => { disposed = true; media.revert(); };
}

const mount = () => initWhyVroooom(document.querySelector('.why'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
}

/* ===== services-carousel ===== */
{
function initServicesCarousel(section) {
  const gsap = window.gsap;
  if (!section || !gsap) return () => {};
  const stage = section.querySelector('.services-stage');
  const carousel = section.querySelector('.services-carousel');
  const cards = [...stage.querySelectorAll('.services-slide')];
  const [previousButton, nextButton] = section.querySelectorAll('.services-control');
  const progress = section.querySelector('.services-progress span');
  const status = section.querySelector('.services-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const count = cards.length;
  let current = 0;
  let locked = false;
  let animation;
  let positions;
  const slotFor = (index, active) => ((index - active + 2 + count) % count) - 2;
  const setMoving = moving => {
    locked = moving;
    previousButton.disabled = nextButton.disabled = moving;
  };
  const update = () => {
    cards.forEach((card, index) => { card.dataset.active = String(index === current); });
    progress.style.left = `${current * 20}%`;
    status.textContent = `${String(current + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')} — ${cards[current].querySelector('h3').textContent}`;
  };
  const measure = () => {
    const width = stage.clientWidth;
    const mobile = width < 768;
    const gap = mobile ? 12 : 16;
    const cardWidth = mobile ? Math.min(width * .72, 370) : Math.min((width - gap * 4) / 3.52, 380);
    const height = mobile ? Math.min(cardWidth * 1.35, 420) : Math.min(cardWidth * 1.3, 465);
    stage.style.setProperty('--service-card-width', `${cardWidth}px`);
    stage.style.setProperty('--stage-height', `${height}px`);
    const near = mobile ? cardWidth * .85 : cardWidth * .88 + gap;
    const far = mobile ? cardWidth * 1.55 : near + cardWidth * .63 + gap;
    positions = { 0: { x: 0, scale: 1 }, 1: { x: near, scale: .76 }, 2: { x: far, scale: .5 }, 3: { x: far + cardWidth, scale: .4 } };
  };
  const position = slot => ({ xPercent: -50, x: Math.sign(slot) * positions[Math.abs(slot)].x, scale: positions[Math.abs(slot)].scale, opacity: Math.abs(slot) > 2 ? 0 : 1 });
  const place = () => cards.forEach((card, index) => {
    const slot = slotFor(index, current);
    gsap.set(card, position(slot));
    card.style.zIndex = String(10 - Math.abs(slot));
  });
  const resize = () => {
    animation?.kill();
    setMoving(false);
    measure();
    place();
  };
  const move = direction => {
    if (locked) return;
    const previous = current;
    current = (current + direction + count) % count;
    update();
    if (reduced.matches) { place(); return; }
    setMoving(true);
    animation = gsap.timeline({ onComplete: () => setMoving(false) });
    cards.forEach((card, index) => {
      const oldSlot = slotFor(index, previous);
      const newSlot = slotFor(index, current);
      card.style.zIndex = String(10 - Math.abs(newSlot));
      if (Math.abs(newSlot - oldSlot) > 1) {
        animation.to(card, { ...position(-direction * 3), duration: .35, ease: 'power2.in' }, 0)
          .set(card, position(direction * 3), .35)
          .to(card, { ...position(newSlot), duration: .35, ease: 'power2.out' }, .35);
      } else {
        animation.to(card, { ...position(newSlot), duration: .7, ease: 'power3.inOut' }, 0);
      }
    });
  };
  previousButton.addEventListener('click', () => move(-1), { signal: events.signal });
  nextButton.addEventListener('click', () => move(1), { signal: events.signal });
  carousel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  }, { signal: events.signal });
  // Horizontal swipes share the same controller; vertical page scrolling stays native.
  let gesture;
  let suppressClick = false;
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    suppressClick = false;
  }, { signal: events.signal });
  stage.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      suppressClick = true;
      move(dx < 0 ? 1 : -1);
    }
  }, { signal: events.signal });
  stage.addEventListener('pointercancel', () => { gesture = null; }, { signal: events.signal });
  stage.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, { capture: true, signal: events.signal });
  const observer = new ResizeObserver(resize);
  resize();
  update();
  observer.observe(stage);
  reduced.addEventListener('change', resize);
  return () => {
    observer.disconnect();
    events.abort();
    reduced.removeEventListener('change', resize);
    animation?.kill();
    gsap.killTweensOf(cards);
    setMoving(false);
  };
}

const mount = () => initServicesCarousel(document.querySelector('.services-showcase'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
}

/* ===== process ===== */
{
/** Reproduce the approved reveal hook and desktop heading pin. */
function initProcess(section) {
  const { gsap, ScrollTrigger } = window;
  if (!section || !gsap || !ScrollTrigger) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px)' }, ({ conditions }) => {
    if (!conditions.motion) return;
    const context = gsap.context(() => {
      section.querySelectorAll('[data-reveal]').forEach(element => {
        gsap.from(element, {
          y: 35, opacity: 0, duration: .9,
          scrollTrigger: { trigger: element, start: 'top 91%' },
        });
      });
      if (conditions.desktop) {
        ScrollTrigger.create({
          trigger: section.querySelector('.process-layout'),
          start: 'top 120px', end: 'bottom 75%',
          pin: section.querySelector('.process-heading'), pinSpacing: false,
        });
      }
    }, section);
    return () => context.revert();
  });
  let disposed = false;
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  return () => { disposed = true; media.revert(); };
}

const mount = () => initProcess(document.querySelector('.process'));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
}

/* ===== recognition ===== */
{
/** Preserve the approved testimonial's scoped, subtle reveal. */
function initRecognition(section) {
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
}
