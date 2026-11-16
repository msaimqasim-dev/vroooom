# Current cleanup verification — 2026-11-16

- All 18 public HTML pages passed at 320, 768 and 1440px with one H1, shared header/footer and no horizontal overflow. Checked 220 local links, assets and fragment destinations. No captured browser runtime or console errors.
- Packages passed at 320, 390, 768, 1024, 1440 and 1920px for all three tabs. Verified all 90 source table cells, 30 scope rows, four workflow stages, arrow/End keyboard behavior, mobile Services dropdown/Escape, reduced-motion rendering and Basic/Advanced/Premium contact prefills. No form submissions performed.
- Folder migration: `digital-marketing-packages/index.html`, `css/pages/digital-marketing-packages.css`, `js/pages/digital-marketing-packages.js`. All navigation, service-page and quote references updated. No root-level duplicate page remains.
- Removed obsolete QA scripts/screenshots/results, one-time package generator, empty scaffold directories and two unimported datasets (`blog-posts.js`, `website-projects.js`). Their rendered cards and required images remain. Retained active JavaScript datasets, GSAP, shared fragments, all referenced images and provenance/license documentation. Removed a duplicated Services stylesheet include and redundant package CSS overrides; package CSS/HTML are formatted for editing.
- Run `node qa/audit-runtime.mjs` and `node qa/marketing-packages-check.mjs` from the site directory. Browser check requires Chromium DevTools on port 9245 and uses temporary HTTP port 5182. Latest results: `qa/marketing-packages-results.json`. The source fixture is development-only.

## Existing limits before publication

Contact delivery needs a verified endpoint; Support needs its ticket adapter. Existing fallback links remain. Basic/Advanced AEO/GEO execution descriptions conflict with excluded deliverables; exclusions and a visible clarification are preserved. Physical-device, cross-browser and screen-reader checks were not performed in this cleanup. Historical animation-specific test artifacts were removed; animation modules and libraries were preserved. No deployment was performed.
