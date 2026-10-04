# ORBIT Admin Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Turn Admin into a clear, Wix-inspired workspace where catalog and design edits work, show understandable status, and require admin access on the server.

**Architecture:** Make admin.html and admin.js the single served sources by routing Admin through the ASSETS binding. Build the left-navigation workspace around the existing content and design flows, then make settings use one API mapping that the preview and public pages both read. Add server-side authorization to every write endpoint and verify changes in a local D1 setup.

**Tech Stack:** Cloudflare Worker, D1, Wrangler local preview, HTML/CSS/JavaScript, Node 22 built-in node:test, browser acceptance checks.

**Spec:** docs/superpowers/specs/2026-10-03-orbit-admin-studio-redesign.md — Admin workspace, Content library, Website design, Access and server behavior

## Global Constraints

- Use one canonical set of site settings. Remove the duplicate Site Control Center inputs that currently overlap the builder.
- Keep a central preview and a focused panel for Brand, Colors, Hero, Sections, Layout, Footer, and supported creative effects.
- Every preview control must change the preview immediately. Theme presets must set all of their advertised fields. Reset Preview must reload the saved values and discard unsaved edits.
- Save Website Changes must persist the same values the preview displays. After saving, show a clear saved state and reload the public page to confirm the changes.
- Keep effect controls only when they visibly change the preview and have a real setting/runtime mapping. Persist their values if they are presented as site settings.
- Image upload status must appear next to the control that initiated it. Failed uploads must explain what to fix.
- Require an authenticated admin for every admin write: content create/update/delete, site settings, seasons, episodes, artwork uploads, and video imports. Keep admin-only reads such as catalog and accounts behind the same check.
- Show a useful sign-in/access message in the admin when the current session is missing or is not an admin. Link to the existing account sign-in page; do not expose forms that appear ready to save when access is denied.
- Return clear unauthorized responses from the server even if a visitor bypasses the admin interface. Do not rely on hidden buttons as security.
- Keep the implementation on the existing feature branch. Use local D1 and test content; do not use production catalog records as disposable test data or deploy to production.

## Review Focus

- Missing, expired, or non-admin sessions never show usable editor forms; direct mutation requests return a clear 403 response. Test missing-session reads and every write route.
- Invalid JSON, missing fields, and out-of-range creative values do not corrupt site settings or produce an unhandled error. Test each settings mapper and malformed API input.
- HTML punctuation in titles, descriptions, logo text, and artwork URLs is shown as text or a safe image URL; it cannot execute as markup. Test escaping and URL validation.
- A failed image upload or video import reports failure next to the control and does not show a false saved state. Test a failed service response, then verify success in local storage when credentials are available.
- At 320px wide and with keyboard-only navigation, every workspace section and important action remains reachable and focus is visible. Verify Overview, Content, Website Design, Site Settings, and Accounts in the browser.

---

### Task 1: Protect every Admin write and admin-only read

**Files:**
- Modify: src/index.js, API route guards around /api/site-settings, /api/content, /api/content/delete, /api/seasons, /api/episodes, /api/upload, /api/upload-url, and /api/import-url
- Create: tests/admin-api-auth.test.mjs

**Interfaces:**
- Consumes: existing requireAdmin(request, env) helper and authJson response helper
- Produces: unauthenticated or non-admin requests to protected writes and admin-only reads receive HTTP 403 with the JSON error Admin access required.; public settings and public catalog reads remain readable

- [ ] **Step 1: Write failing Worker authorization tests**

Invoke the exported Worker fetch handler with requests that have no session cookie. Assert 403 and the exact JSON error for POST /api/site-settings, /api/content, /api/content/delete, /api/seasons, /api/episodes, /api/upload, /api/upload-url, and /api/import-url. Assert GET /api/content and GET /api/admin/users also return 403. Assert GET /api/site-settings and GET /api/public/content remain readable using a minimal D1 mock. Use an env without a database on protected requests so any attempted write or admin read fails the test.

- [ ] **Step 2: Run the authorization tests and confirm current gaps**

Run: node --test tests/admin-api-auth.test.mjs  
Expected: FAIL for currently unguarded mutations and pass only for routes already protected.

- [ ] **Step 3: Add the missing requireAdmin checks at the route boundary**

Guard every listed write before parsing its body or calling a handler. Preserve the existing public GET /api/site-settings and /api/public/content routes. Search all /api routes for other POST, PUT, PATCH, or DELETE handlers and add each state-changing route to the same test.

- [ ] **Step 4: Run the authorization tests**

Run: node --test tests/admin-api-auth.test.mjs  
Expected: PASS for every protected write and admin-only read, with public GET routes left accessible.

- [ ] **Step 5: Commit the task**

Commit message: fix: require admin access for all writes

### Task 2: Serve the Admin app from assets and build the workspace shell

**Files:**
- Modify: admin.html, admin.js, src/index.js
- Create: tests/admin-assets.test.mjs

**Interfaces:**
- Consumes: /api/auth/me returning authenticated and user.is_admin; /account as the existing sign-in page; existing content and settings API paths
- Produces: /admin, /admin/, and /admin.html serve admin.html from ASSETS; /admin.js serves admin.js from ASSETS; an authenticated admin sees the workspace; visitors see a sign-in or access-denied view without editable forms

- [ ] **Step 1: Write the failing asset routing tests**

Call the Worker with /admin, /admin.html, and /admin.js requests and a fake ASSETS binding. Assert it serves the matching repository asset and that the HTML loads /admin.js once.

- [ ] **Step 2: Run the routing tests and confirm the embedded response fails**

Run: node --test tests/admin-assets.test.mjs  
Expected: FAIL because the Worker currently returns ADMIN_HTML and ADMIN_JS constants.

- [ ] **Step 3: Switch Admin routes to ASSETS and remove duplicate templates**

Map /admin and /admin/ to the /admin.html asset. Serve /admin.html and /admin.js from ASSETS. Remove the embedded ADMIN_HTML and ADMIN_JS constants from src/index.js.

- [ ] **Step 4: Build the responsive workspace shell**

In admin.html, add the five left navigation views named Overview, Content, Website Design, Site Settings, and Accounts; add the ORBIT, View Site, admin-access, and save-state top bar; make the content workspace and contextual editor panel responsive. In admin.js, query /api/auth/me before loading protected data, display the access state and /account link, and keep all editing forms hidden until is_admin is true. Make the selected item visible before edit or delete.

- [ ] **Step 5: Run route tests and browser access checks**

Run: node --test tests/admin-assets.test.mjs tests/admin-api-auth.test.mjs  
Expected: PASS. In a browser, /admin aliases render the new shell, anonymous and non-admin sessions see no editable form and a working sign-in link, and an admin can open all five views at 320px and desktop widths.

- [ ] **Step 6: Commit the task**

Commit message: feat: build responsive admin workspace shell

### Task 3: Make content, season, episode, and media actions report results

**Files:**
- Modify: admin.html and admin.js
- Test: local browser flow against Wrangler and local D1

**Interfaces:**
- Consumes: authenticated workspace from Task 2 and the existing content, genre, season, episode, upload, and import API routes
- Produces: visible success, error, loading, and empty states for every catalog action; upload feedback appears beside its initiating control

- [ ] **Step 1: Run the current content flow locally and record broken actions**

Initialize the Wrangler local D1 database with schema.sql. Create a local-only account using orbit-admin-test@example.invalid and password OrbitTest!2026, promote that user to admin in local D1, then open /admin and exercise Add Movie, Add TV Show, Refresh, search, type filter, genre creation, Save, Save Draft, Publish, Delete, season, episode, artwork upload, video upload, and video import. Record each action's visible result.

- [ ] **Step 2: Implement content library and editor states**

Keep movie and show rows searchable and filterable by type, with title, status, and type visible. Group editor fields into details, artwork, video, and show season/episode sections. Provide distinct Save, Save Draft, and Publish actions. Add empty instructions for catalog, seasons, and episodes. Route each action through one status area with clear in-progress/success/error text; keep delete confirmation; show image and video upload results next to their own controls. Do not report success until the API confirms it.

- [ ] **Step 3: Re-run the local browser flow**

Run: npx wrangler dev --local  
Expected: Local test content can be created, edited, published, refreshed, searched, filtered, and deleted; a TV show can receive a season and episode; every action shows its result. In the absence of local object-storage credentials, upload/import failure must identify the problem and preserve the form. With test storage credentials, verify one successful image upload and one successful video import, then delete only the local test records.

- [ ] **Step 4: Commit the task**

Commit message: feat: improve admin content editing feedback

### Task 4: Make design settings canonical, persistent, and visible on the site

**Files:**
- Modify: admin.html, admin.js, src/index.js, index.html, movies.html, tv.html, watch.html
- Create: site-theme.js and tests/site-theme.test.mjs
- Test: tests/site-theme.test.mjs and local browser flow

**Interfaces:**
- Consumes: existing /api/site-settings GET and POST payloads; public page documents from ASSETS
- Produces: one design-settings editor and one Site Settings view for non-design options; normalizeSiteTheme(settings) returns the CSS variables and safe text/image values used by both preview and public pages

- [ ] **Step 1: Write failing theme mapping tests**

Test normalizeSiteTheme(settings) for documented defaults, all supported design keys, numeric bounds, missing values, and unsafe image URLs. Using a fake admin session and D1 binding, test that malformed JSON and a non-object POST /api/site-settings payload return HTTP 400 with a clear error. Test that each supported creative effect maps to a CSS variable and that saved data reloads to the same normalized values.

- [ ] **Step 2: Run the theme tests and confirm they fail**

Run: node --test tests/site-theme.test.mjs  
Expected: FAIL because the shared mapper does not exist.

- [ ] **Step 3: Implement one design-settings mapping**

Create normalizeSiteTheme(settings) in site-theme.js and use these persisted keys: logo_text, logo_url, logo_size, background_color, header_background, card_background, accent, text_color, muted_color, button_color, button_hover, watch_button_text, hero_title, hero_description, hero_backdrop, featured_title, recent_title, watch_now_title, tv_title, max_width, footer_about, footer_contact, footer_copyright, footer_privacy, ad_enabled, ad_text, card_radius, card_shadow, hero_overlay, poster_height, section_gap, and page_glow. Validate numbers against the input ranges and accept only safe HTTPS image URLs for logo_url and hero_backdrop. Extend the Worker allowlist for missing supported keys and return a clear 400 for malformed or non-object settings payloads.

- [ ] **Step 4: Rebuild the design and site-settings views**

Remove the duplicate Site Control Center design inputs. Keep Brand, Colors, Hero, Sections, Layout, Footer, and mapped creative effects in Website Design; keep blocked-search terms and catalog ordering IDs in Site Settings. Fix theme preset IDs and map Midnight, Neon, Cinema, and Clean to the intended color inputs. Connect Reset Preview to reload saved values, every editor field to the preview, and Save Website Changes to persist the exact normalized payload and show saved/error status.

- [ ] **Step 5: Apply saved settings to public pages**

Apply the shared theme CSS variables and safe text/image settings on Home, Movies, TV, and Watch pages. Make the page styles consume the mapped color, width, radius, shadow, hero overlay, poster height, section gap, and glow variables. Give each design-controlled text field an explicit setting target so settings update the matching logo, hero, section heading, button, ad, or footer. Refactor the Worker /watch.html route to serve watch.html through ASSETS so it can load site-theme.js; keep the existing public content and watch APIs unchanged.

- [ ] **Step 6: Run theme tests and the local save/reload flow**

Run: node --test tests/site-theme.test.mjs tests/admin-api-auth.test.mjs tests/admin-assets.test.mjs  
Expected: PASS. In local D1, edit each design section, confirm the preview changes immediately, choose each theme preset, reset and confirm unsaved values disappear, save, reload Admin, and confirm values persist. Reload Home, Movies, TV, and a Watch page and confirm the saved fields and visual effects appear there.

- [ ] **Step 7: Commit the task**

Commit message: feat: make admin site design settings persistent

### Task 5: Review every visible control and page transition

**Files:**
- Review: admin.html, admin.js, movies.html, tv.html, watch.html, src/index.js
- Test: local browser acceptance on desktop and mobile

**Interfaces:**
- Consumes: completed Admin and Movies flows from Tasks 1–4
- Produces: an acceptance record showing each visible control has an action, destination, or clear access/empty/error result

- [ ] **Step 1: Audit each visible button, link, form, and navigation entry**

For each control, confirm a real click or submit handler, a valid destination, or an intentional disabled/access state. Search the rendered Admin views for href="#" and inert buttons. Check Overview, Content, Website Design, Site Settings, Accounts, View Site, catalog CRUD, genre, season/episode, reset, preset, save, and uploads.

- [ ] **Step 2: Exercise the full local flow from a fresh page load**

Run: npx wrangler dev --local  
Expected: Both desktop and mobile flows load without console errors; keyboard focus remains visible; refresh and navigation preserve only saved state; no production catalog records are changed; no visible placeholder action remains.

- [ ] **Step 3: Re-run the complete automated suite and commit the review**

Run: node --test tests/*.test.mjs  
Expected: PASS. Commit message: test: verify orbit movies and admin flows
