// Verified source: https://www.vroooom.com/portfolio/
export const portfolio = [
  {
    "name": "Shih Tzu Showoffs",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/08/Portfolio-MacBook-Cutout_Shi-Tzu-Show-Offs-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-1.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Larry Love's Diamond Exchange",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_Larry-Loves-Diamond-Exchange-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-2.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Columbus Cabinet",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_ColumbusCabinet-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-3.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Mark Post Law",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout-_Mark-Law-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-4.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "PR Gloss & Tint",
    "source": "https://www.vroooom.com/wp-content/uploads/2026/03/Portfolio-MacBook-Cutout_PR-Gloss-Tinit-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-5.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Shannon B Whittington",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/08/Portfolio-MacBook-Cutout_ShannonBW-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-6.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "City of Buena Vista",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/03/Portfolio-MacBook-Cutout_COBV-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-7.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Woodruff real estate",
    "source": "https://www.vroooom.com/wp-content/uploads/2023/12/macbook_woodruff-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-8.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Buena Vista Road Animal Hospital",
    "source": "https://www.vroooom.com/wp-content/uploads/2023/12/macbook_bvrah-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-9.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  },
  {
    "name": "Martin's Tree Services",
    "source": "https://www.vroooom.com/wp-content/uploads/2024/06/Portfolio-MacBook-Cutout_MartinTree-1024x651.png",
    "image": new URL('../../assets/images/portfolio/spiral-10.png', import.meta.url).href,
    "url": "https://www.vroooom.com/portfolio/"
  }
];

// Supplied dark-green lighting image, served directly from public/assets.
export const portfolioBackground = new URL('../../assets/images/portfolio/featured-work-background.png', import.meta.url).href;

// Approved geometry and scroll settings from React FeaturedWork/spiralConfig.js.
export const spiralConfig = {
  scrub: 0.7,
  cardsPerTurn: 4.8,
  leadingCards: 1.5,
  phaseOffset: 0.35,
  desktop: { radiusRatio: .24, maxRadius: 360, depthRatio: .16, maxDepth: 230, spacingRatio: .23, maxSpacing: 210, tiltX: 13, tiltY: 42, tiltZ: 12, minScale: .85, scaleRange: .18, scrollScreens: 2.8 },
  tablet: { radiusRatio: .23, maxRadius: 240, depthRatio: .12, maxDepth: 125, spacingRatio: .22, maxSpacing: 170, tiltX: 10, tiltY: 30, tiltZ: 9, minScale: .88, scaleRange: .14, scrollScreens: 2.4 },
  mobile: { radiusRatio: .23, maxRadius: 120, depthRatio: .15, maxDepth: 65, spacingRatio: .23, maxSpacing: 150, tiltX: 7, tiltY: 18, tiltZ: 5, minScale: .88, scaleRange: .12, scrollScreens: 2 },
};

export function getSpiralGeometry(width, height) {
  const profile = width < 768 ? spiralConfig.mobile : width < 1100 ? spiralConfig.tablet : spiralConfig.desktop;
  return {
    ...profile,
    radius: Math.min(width * profile.radiusRatio, profile.maxRadius),
    depth: Math.min(width * profile.depthRatio, profile.maxDepth),
    spacing: Math.min(height * profile.spacingRatio, profile.maxSpacing),
  };
}

export function getCardFocusProgress(index, count) {
  const travel = Math.max(1, count - 1 - spiralConfig.leadingCards * 2);
  return Math.max(0, Math.min(1, (index - spiralConfig.leadingCards) / travel));
}
