# Vroooom HTML website

The homepage uses semantic HTML, section-scoped CSS, native JavaScript modules, and the existing local GSAP/ScrollTrigger distribution. The root React/Vite project remains the approved reference and is not part of this site's runtime.

Serve this directory over HTTP. Opening index.html directly as a file does not support module imports and shared fragment requests. Root npm commands still run the React reference.

## Runtime structure

- `index.html`: homepage markup and shared component mounts.
- `about/index.html`: consolidated About page; content provenance is in `about/SOURCES.md`.
- `css/pages/about.css`, `js/pages/about.js`: page-owned layout and initialization, with separate timeline/testimonial modules in `js/sections/`.
- `css/variables.css`: shared purple palette; load before component/page styles.
- `css/sections/`, `js/sections/`: independent section styles and behavior. Do not merge them.
- `styles/main.css`: approved document palette.
- `scripts/main.js`: header startup.
- `sections/home/navigation/section.html`, `js/components/header.js`, `css/components/header.css`: reusable header.
- `components/footer.html`, `js/components/footer.js`, `css/components/footer.css`: reusable footer.
- `js/data/portfolio.js`: portfolio records and configurable geometry. Card orientation lives in `js/sections/spiral-gallery.js`.
- `assets/images/`: unchanged copies of approved imagery.
- `vendor/gsap/`: existing GSAP/ScrollTrigger 3.15.0 distribution with license notices.

For future nested pages, load shared component stylesheets and modules using appropriate relative URLs, and provide `[data-site-header]` / `[data-site-footer]` mounts. Module-relative fragment URLs work from nested pages. About navigation resolves to the consolidated page. Work, Services, and Process link to homepage anchors from nested pages. Footer team/awards links target About anchors; other unimplemented pages retain official destinations. Empty scaffold directories remain reserved for future work.

## QA and publishing

Run the current complete check from the repository root with headless Edge debugging at port 9223:

```powershell
node html-site/qa/homepage-qa.mjs
node html-site/qa/about-check.mjs
node html-site/qa/about-interactions.mjs
```

The check uses Node's built-in HTTP server and Chrome DevTools Protocol, serving this site and the existing React dist reference on local ports 5182/5183. See `QA_REPORT.md` for findings and remaining limits.

The qa directory contains historical development scripts and screenshots, including superseded stages. Keep these as evidence and exclude qa, documentation, and .gitkeep files from published website assets. Production runtime consists of index.html, about/index.html, css, styles, js, scripts, components, the navigation fragment under sections, assets, and vendor. No bundler is required for this HTML site.

Legacy About URL redirects depend on the deployment host; proposed mappings and source assets are documented in `about/SOURCES.md`.
