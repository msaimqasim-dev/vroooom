# Contact inquiry setup and provenance

## Current state

Live submission is NOT configured. No Netlify project/account was available in this workspace, and no notifications or deployment were created. The form's JavaScript configuration defaults to enabled:false. Valid local submissions show an honest unavailable message, retain entered information, and offer the verified original quote form and email. No inquiry was sent during QA.

## Activate on Netlify

1. Publish html-site as the static site root. Enable automatic form detection in Netlify's Forms dashboard and redeploy. The static form is named vroooom-inquiry, with data-netlify=true, hidden form-name, and company-url honeypot.
2. Confirm vroooom-inquiry appears in the deployed Forms dashboard with every field. Before enabling the enhanced form, test the native submission on a preview deploy with JavaScript disabled. Confirm a real test submission is recorded; do not assume a generic HTTP 200 proves the form is registered.
3. In js/pages/contact-form-config.js set enabled:true, then redeploy. The module-relative endpoint works under the deployed site prefix. Localhost remains blocked to avoid confusing static-server responses with delivery.
4. Submit a real test through the enhanced form and verify receipt in the dashboard. Configure form submission email notifications in Netlify for the owner's chosen recipient, and verify that notification separately. No recipient is automatically configured by this code.
5. Test a rejected request/network failure: no success should appear and values must remain available. Set enabled:false again if form registration is uncertain or deployment moves away from Netlify. Review Forms usage/billing and spam handling in the owner dashboard.

Official setup: https://docs.netlify.com/manage/forms/setup/
Notifications: https://docs.netlify.com/manage/forms/notifications/

No-JavaScript users receive native browser validation and a standard form POST; actual processing still requires Netlify detection/deployment. On unsupported hosting they must use the visible original quote or mail links. There is no fake thank-you page or recreated support backend.

## Verified company sources

- https://www.vroooom.com/contact-us/ : Columbus location, Atlanta-area presence, national/international clients, phone, info email, sales email and Facebook link. No street address, current promotion, or response-time promise is added.
- https://www.vroooom.com/get-a-quote/ : name/email/phone, three Yes/No groups, budget and project requirements. The source marks the Yes/No groups and requirements as required; labels and validation retain those requirements. This new form does not claim to submit to the original WordPress backend.
- https://www.vroooom.com/support-ticket/ : existing client maintenance, technical support and billing categories. The CTA links to that verified page; no local support-ticket form is created.

The hero reuses the existing Services background and purple filter. No new image assets are needed. Shared navigation retains its appearance; only Contact and Get a Quote destination resolution now reaches the new local page/form. Existing page markup, styles and footer are unchanged.

## QA

qa/contact-check.mjs and contact-results.json cover five widths, empty/invalid/valid-but-unconfigured forms, focus and inline errors, preserved values, honeypot, menu, reduced motion, GSAP mode and overflow. They do NOT prove live Netlify delivery or notification receipt. Screenshots: qa/contact-1440.png and contact-390.png. Physical-device/cross-browser/manual screen-reader and actual Netlify deployment checks remain outstanding.
