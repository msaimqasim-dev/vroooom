# About page content provenance

Verified against these five official pages on 23 October 2026. Concise editorial paraphrases preserve their meaning; no additional company facts are introduced.

- [Our Team](https://www.vroooom.com/about/): supplied hero heading, introduction, mission, Angela Sears Wagenti (President & Owner), Mike Wagenti (Chief Technology Officer), biographies, and all seven named values. The two portraits are the backgrounds associated with their source biographies; see the image-folder README.
- [Our History](https://www.vroooom.com/our-history/): June 1999 Wagenti-family founding; 2001 Carmike partnership; 2006 RJS Networking/Thomas Management acquisitions; 2008 Entrepreneur recognition; 2019–2020 design recognition; 2023 hosting upgrades and 2024 Alpharetta expansion. The timeline is a selection, not a complete chronology. It preserves award years separately from the year an award was reported.
- [Our Awards](https://www.vroooom.com/our-awards/): Best of Columbus 2020, Ledger-Enquirer Readers' Choice 2019, Columbus Top 3 Website Designer, and Angela Wagenti's Marquis Who's Who Honored Listee recognition. No year is supplied for the last two. No substitute award badges are used.
- [Testimonials](https://www.vroooom.com/testimonials/): four independent short, verbatim excerpts, each with its original reviewer. Shannon B Whittington's profession is supplied by the source. The other reviewers have no invented employer or role. Ellipses mark excerpts taken within longer reviews; all four link to the full source page. No reviews are combined.
- [FAQs](https://www.vroooom.com/faq/): seven paraphrased questions/answers about design quality, project timing, SEO/SEM, hosting, domain registration, copywriting, and digital marketing. No fixed delivery time, price, or new guarantee is added.

## Routing

The consolidated local destinations are `/about/`, `#team`, `#history`, `#awards`, `#testimonials`, and `#faqs`. Shared navigation resolves them relative to its module, including deployments under a directory prefix. The shared footer maps existing About/awards destinations to these anchors; homepage section markup is unchanged. Unimplemented contact/service pages retain their existing official destinations where no homepage anchor applies.

The five existing official URLs remain online and are used for original-content links. This local project has no selected hosting platform or server routing configuration. When replacing the live website, configure host-level permanent redirects from `/our-history/`, `/our-awards/`, `/testimonials/`, and `/faq/` to their matching `/about/#…` anchors. No speculative server configuration or extra pages have been created.

## Runtime

Native window scrolling is retained: the existing HTML site has no Lenis instance. Page code adds no second scroll owner or animation ticker. GSAP contexts/matchMedia and native event cleanup are isolated; pagehide disposes page-specific behavior and a persisted pageshow remounts it. FAQs remain native details/summary controls without JavaScript. The testimonial slider has no autoplay and links to the source even without enhancement.
