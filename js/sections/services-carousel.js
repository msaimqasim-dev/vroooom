export function initServicesCarousel(section) {
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
