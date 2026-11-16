# Vroooom HTML website

Plain HTML, CSS and vanilla JavaScript. Serve this directory over HTTP; module imports and shared fragments require a web server. No build step is required. The parent React/Vite project is a separate visual reference and is not part of deployment.

## Structure

- `index.html`: homepage.
- Each other page uses `<page>/index.html`, including `digital-marketing-packages/index.html`. Blog articles use `blog/posts/<slug>/index.html`.
- `css/pages/` and `js/pages/`: page-specific styles and interactions.
- `css/sections/` and `js/sections/`: homepage and shared section styles/interactions.
- `css/variables.css` and `styles/main.css`: shared palette and document styling.
- `sections/home/navigation/section.html`, `js/components/header.js`, `css/components/header.css`, `scripts/main.js`: shared navigation and startup.
- `components/footer.html`, `js/components/footer.js`, `css/components/footer.css`: shared footer.
- `js/data/`: active portfolio datasets. Blog and website project cards are authored directly in their HTML pages.
- `assets/` and `vendor/`: required images and local GSAP/ScrollTrigger, including license information.
- `qa/`: development-only reference audit, regression check, package-content fixture and latest results.

Use module-relative URLs for shared fragments and appropriate relative URLs for nested page assets. Keep package content directly in its HTML; there is no page generator to run.

## Verification

From this directory, run `node qa/audit-runtime.mjs` for a conservative unreferenced-file audit. Run `node qa/marketing-packages-check.mjs` with a headless Chromium instance exposing DevTools on port 9245. The check serves the site temporarily on port 5182, verifies all pages, local links/assets/anchors and package interactions, and writes one results JSON. It does not submit forms or generate screenshots.

## Publishing

Upload the root `index.html`, all public page folders, `assets/`, `components/`, `css/`, `js/`, `scripts/main.js`, `styles/`, `sections/home/navigation/section.html` and `vendor/`, preserving their paths. Exclude `.git/`, `qa/`, root Markdown documentation and page/asset provenance Markdown from the public upload. Keep vendor licensing notices. Configure the host to serve folder `index.html` files.

The packages URL is `/digital-marketing-packages/`. Shared navigation and contact links already use that URL. Nothing has been deployed as part of cleanup.

Contact delivery remains disabled until a verified endpoint is configured in `js/pages/contact-form-config.js`. Support also retains its original-form fallback pending its ticket adapter. Existing direct contact and live-form links remain available. See `QA_REPORT.md` for the current checks and limits; source/asset provenance documents are retained.
