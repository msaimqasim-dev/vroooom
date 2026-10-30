# QA records

Use `homepage-qa.mjs` for the current complete homepage. Historical scripts/results preserve individual task stages. The original header, seven-card agency, static portfolio, dark CTA, and original footer-spacing assertions have been superseded by later approved changes.

Do not deploy this directory. Scripts, results, and screenshots are development artifacts, not homepage runtime assets. Current results are in `homepage-qa-results.json`; review scope and limitations are in `../QA_REPORT.md`.

The purple rebrand intentionally supersedes historical green color expectations. Current homepage checks compare React geometry/typography/content, while `purple-theme-check.mjs` validates the new palette, representative contrast, eight identical wave gradients, unchanged client-image filters, and light CTA at four widths. Run it after the two homepage scripts, using the same Edge port. New results/screenshots use the `purple-` prefix.

About Us checks: `about-check.mjs` validates all nine sections, timeline, slider, FAQs, navigation, motion cleanup and five viewport widths. `about-interactions.mjs` samples actual FAQ expansion/reversal and values focus/reduced-motion behavior at 1440/390px. Results use the `about-` prefix. Run sequentially because the CDP tab and port 5182 are shared.

Task 16 shared navigation supersedes older header/link-label assertions. Current checks: `navbar-v2-check.mjs` and `portfolio-page-check.mjs` (run sequentially). They cover all three existing pages and five widths, full portfolio image decoding, dropdowns and lightbox interactions. Results/screenshots use `portfolio-page-`. Older full-page tests retain their earlier-stage expectations.

Task 17: `blog-check.mjs` verifies nine-to-twelve Load More, responsive columns, image decoding, nested article routes and back links at five widths. `blog-visual.mjs` verifies normal-motion entrance and captures desktop/mobile previews. The six local articles are labeled condensed editions; see ../blog/ASSET-MAP.md.
