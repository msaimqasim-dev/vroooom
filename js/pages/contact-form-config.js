// Enable only AFTER Netlify form detection is enabled, the site is deployed,
// and an actual test submission is visible in the Forms dashboard.
export const inquiryConfig = Object.freeze({ enabled:false, endpoint:new URL('../../contact-us/',import.meta.url).href });
