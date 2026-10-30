# Task 15 - About Us QA

Passed in headless Edge at **1920, 1440, 1024, 768, and 390px**. One consolidated page contains all nine sections.

- Authenticity: five official pages inspected; two real staff portraits and a genuine Marquis badge downloaded unchanged. Source and asset mapping: `about/SOURCES.md`. Other awards remain text-only; no documentary agency photo or substitute badges are presented.
- Interactions: six-milestone timeline scroll progression, exact reverse path and stopping; four testimonial excerpts with wraparound, preview selection and arrow-key control; seven native FAQ disclosures with animated expansion, repeated reversal and Enter activation. No autoplay.
- Responsive/accessibility: no horizontal overflow, one H1, unique IDs, valid section anchors, image alt text, working nested navigation/mobile Escape, visible focus, and live reduced-motion behavior. Desktop/mobile screenshots inspected.
- Cleanup: page initialization releases its own ScrollTriggers, animations and event listeners; reduced motion removes triggers and animation. Native scrolling retained; no Lenis instance exists in this HTML site.
- Confirmed fix during QA: closed details can report intrinsic child height in Chromium; FAQ opening explicitly starts at zero. Supplemental tests sampled intermediate animation height and rapid direction reversal.
- Preservation: all 96 protected React/homepage/style/asset files match the pre-task hashes. Shared header/footer changed only destination resolution for the new page. Homepage regression passed again at all five widths.
- Checks: `qa/about-check.mjs`, `qa/about-interactions.mjs`, `qa/homepage-qa.mjs`; JSON results and screenshots in `qa/`. No runtime errors or failed local assets recorded. All five edited/added runtime modules pass syntax checks; 15 page-local references exist.
- Remaining: host-specific legacy URL redirects, physical-device/cross-browser/manual screen-reader validation. No hosting configuration has been selected. Original source links remain live destinations. The original Mike portrait is approximately 1 MiB; it was not recompressed.

# Purple rebrand QA ? 23 October 2026

Passed in headless Edge at 1920, 1440, 1024, 768, and 390px. Original React geometry, typography, content, and behavior remain the reference; the authorized purple theme intentionally replaces its green colors.

- Primary #6B0B8E is verified in the original site's published Elementor kit; supporting shades are derived. Tokens live in css/variables.css.
- All runtime stylesheets use shared color tokens. Decorative background filters affect only portfolio/services lighting; image files, client branding, runtime JS, and section markup are unchanged. No inner pages exist.
- Full homepage motion/navigation/image/overflow/reduced-motion checks passed; hover, keyboard, and synthetic touch swipe checks passed. Purple-specific checks passed at 1920/1440/768/390px, including representative 4.5:1 text/button contrast checks, identical eight-column gradients, light CTA, and unfiltered client images.
- All non-color CSS values agree with the backup; no geometry or animation settings changed. Backup: ../backups/vroooom-before-purple-2026-10-23/.
- Current checks: qa/homepage-qa.mjs, qa/homepage-interactions.mjs, qa/purple-theme-check.mjs. JSON results and purple-*.png screenshots are in qa/. Existing cross-browser/device/manual-screen-reader and deployment follow-up still apply.

The Task 14 report below records pre-rebrand findings; its green color assertions are historical.

# Homepage final QA — Task 14

Status: passed in headless Microsoft Edge at **1920, 1440, 1024, 768, and 390px**. The HTML homepage is ready for continued multipage development. No inner pages were created or React reference files changed.

## Confirmed issues fixed

- Mobile menu displayed both icons when closed. Corrected selector specificity so only the appropriate icon appears.
- The spiral heading reset suppressed its original 48px bottom margin in reduced-motion mode. Restored the approved grid spacing without changing animated geometry.
- The document palette was still an empty scaffold, leaving a white fallback behind transparent areas and overscroll. Restored the approved cream/ink document colors.
- Header fetch rejection could leave an empty header. Added a visible failure message for network errors, matching the existing non-OK response handling.
- Consolidated redundant footer padding/focus declarations without changing its approved compact layout.
- Updated stale architecture documentation. Removed four unused, empty `.gitkeep` files only from populated folders; retained future-page scaffolding and historical QA evidence.

## Verification

- Compared every rendered section's responsive dimensions, typography, effective background, color, and spacing against the existing React build. Differences approved in earlier tasks were preserved: 10s hero waves, seamless marquee coverage at the original pixel speed, service ordering/swipes, Why-row hover effects, contact-page CTA destination, and tighter footer wordmark spacing.
- Confirmed hero/footer waves, four floating agency cards, spiral pin/reverse/stop behavior, carousel forward/backward wraparound through all five positions, scroll reveals, hover/focus states, mobile menu/Escape, section anchors, touch-pointer swipe handling, and back-to-top.
- Reduced motion disables CSS motion and section ScrollTriggers and restores the spiral grid. Checked one H1, unique IDs, image alt attributes, valid local anchor targets, inert hidden navigation, and visible keyboard focus.
- All images decoded; all **49 local HTML/CSS/module/asset references** exist. No horizontal overflow, runtime/console errors, or failed local asset requests were recorded in the consolidated checks. All runtime JavaScript passed syntax checks.
- Verified original React source/assets/dependency/configuration hashes remain unchanged. Existing screenshots and section-level checks provide additional comparison evidence.

Current checks:

```powershell
node html-site/qa/homepage-qa.mjs
node html-site/qa/homepage-interactions.mjs
```

Both use headless Edge debugging on port 9223 and local test servers. Results: `qa/homepage-qa-results.json` and `qa/homepage-interactions-results.json`. Historical task scripts can contain superseded assertions; see `qa/README.md`.

## Remaining concerns and scope limits

- Original image payload totals **8.14 MiB across 21 assets**; two background PNGs account for about 3 MiB. No images were recompressed or replaced because appearance and original assets are approved. Responsive image formats/caching should be assessed before deployment.
- Historical QA artifacts occupy about **19 MiB** and must be excluded from published assets. They are not loaded by the homepage.
- Google Fonts remains an external dependency, with the existing system fallbacks. Font self-hosting can be considered before deployment.
- Testing covered Edge desktop emulation and synthetic touch input. Physical iOS/Android devices, Safari/Firefox, manual screen-reader operation, and a full WCAG audit were not performed.
- Link destinations match the approved source or explicit later instructions. External availability was not crawled; not-yet-built local pages remain planned work.
- Deployment and a production performance budget remain separate tasks. No blocking issue was found in the reviewed homepage scope.
