# ORBIT Movies Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make movie titles easy to read over poster art and make every Movies page control and destination work.

**Architecture:** Make the repository's movies.html the served source by routing the page through the Worker ASSETS binding. Move the catalog filtering and card rendering into a small JavaScript module with pure functions that Node can test. Keep poster and title presentation in the existing ORBIT page styles and verify the real page in a browser.

**Tech Stack:** Cloudflare Worker and ASSETS binding, HTML, CSS, browser JavaScript modules, Node 22 built-in node:test, Wrangler local preview.

**Spec:** docs/superpowers/specs/2026-10-03-orbit-admin-studio-redesign.md — Movies page

## Global Constraints

- Keep the existing ORBIT look and poster-first catalog.
- Add a clear black outline and soft shadow to titles shown over poster art, with a dark fade behind the title where needed. Keep title and metadata legible at narrow and wide screen sizes.
- Render genre choices as real keyboard-accessible buttons with a visible selected state. Filtering and search must update the result count and heading.
- Keep movie cards and Watch links pointed to the matching watch page. Search results and header links must lead to their matching destinations.
- When a genre or search has no matches, show a useful empty state and keep a clear way to reset to All Movies.
- Check all visible links and buttons for a real destination or action; do not leave placeholder links such as “#”.
- Keep this work on the existing feature branch; do not deploy it to production.

## Review Focus

- Long or Unicode titles over bright and dark poster images stay readable and do not overflow at 320px and 1280px viewport widths. Test in the browser with both poster types and a deliberately long title.
- A catalog load failure and a genuinely empty catalog show distinct, understandable states with an accurate count. Test by making the API fail and by returning an empty list.
- A search or genre with no matches reports zero results and offers a working All Movies reset. Test an impossible search string and an unmatched genre.
- Search and genre matching handle capitalization, partial title/description matches, and missing genre values without a browser error. Cover these cases in the pure filter tests.
- Movie titles and slugs containing HTML punctuation cannot inject markup or create a wrong watch URL. Cover escaping and URL encoding in module tests, then confirm the rendered card in the browser.

---

### Task 1: Serve the Movies page from the repository asset

**Files:**
- Modify: src/index.js, Movies route and embedded MOVIES_HTML constant
- Test: tests/movies-page.test.mjs

**Interfaces:**
- Consumes: existing default Worker fetch(request, env) handler and env.ASSETS.fetch(request)
- Produces: GET /movies.html serves the repository movies.html asset and adds the existing catalog.js enhancement once

- [ ] **Step 1: Write the failing Worker route test**

Add a node:test case that calls the Worker with GET /movies.html and a fake ASSETS binding returning a recognizable movies.html body. Assert the response uses that body, preserves the HTML content type, and includes exactly one catalog.js script reference.

- [ ] **Step 2: Run the route test and confirm the current embedded page fails it**

Run: node --test tests/movies-page.test.mjs  
Expected: FAIL because the route returns embedded MOVIES_HTML instead of the supplied asset.

- [ ] **Step 3: Route Movies through ASSETS**

In src/index.js, fetch /movies.html through env.ASSETS, inject the catalog.js script before the closing body tag once, and return the asset response with no-store caching. Remove the obsolete MOVIES_HTML constant so movies.html is the only page source.

- [ ] **Step 4: Run the route test**

Run: node --test tests/movies-page.test.mjs  
Expected: PASS for the asset body, content type, and single script injection.

- [ ] **Step 5: Commit the task**

Commit message: refactor: serve movies page from assets

### Task 2: Make catalog filtering and card destinations testable

**Files:**
- Create: movies.js
- Modify: movies.html
- Create: tests/movies-logic.test.mjs

**Interfaces:**
- Consumes: movies array objects returned by GET /api/public/content?type=movie, with title, description, genres, and slug fields
- Produces: filterMovies(items, query, activeGenre), escapeHTML(value), and watchHref(slug) exports; movies.html loads movies.js as a module

- [ ] **Step 1: Write failing tests for the movie logic**

Test that filterMovies searches title and description case-insensitively, matches a genre case-insensitively, returns all items for All Movies, and safely handles missing genres. Test escapeHTML with markup punctuation and watchHref with spaces and reserved characters in a slug.

- [ ] **Step 2: Run the logic tests and confirm they fail**

Run: node --test tests/movies-logic.test.mjs  
Expected: FAIL because movies.js and its exports do not exist.

- [ ] **Step 3: Implement the pure movie helpers and browser initialization**

Implement the three named exports in movies.js. Load the movie list from the existing public endpoint, render each card as one real link to /watch.html?slug= with an explicit Watch call-to-action, and use the helpers for filtering, encoding, and escaped text. Remove the five fake Coming Soon cards and their href="#" links from movies.html.

- [ ] **Step 4: Run the logic and Worker route tests**

Run: node --test tests/movies-logic.test.mjs tests/movies-page.test.mjs  
Expected: PASS; movie matching, escaping, URL encoding, and asset serving all pass.

- [ ] **Step 5: Commit the task**

Commit message: feat: make movie catalog controls reliable

### Task 3: Improve title contrast, genre controls, and empty states

**Files:**
- Modify: movies.html and movies.js

**Interfaces:**
- Consumes: the movie helpers and public content endpoint from Task 2
- Produces: poster cards with readable titles, real genre buttons, live result count, loading/error/no-match states, and a keyboard-operable reset

- [ ] **Step 1: Record the browser acceptance failures before editing**

Open the local Movies page at 320px and 1280px widths. Check a bright poster and a dark poster, select genres with mouse and keyboard, search for an impossible title, and inspect the visible links. Record which approved behaviors fail.

- [ ] **Step 2: Implement the Movies page presentation and controls**

Give titles a black text outline and soft shadow, add a dark fade behind overlaid titles where needed, and allow long titles to wrap. Replace clickable genre divs with button elements that maintain aria-pressed and selected styling. Add distinct loading, API-error, empty-catalog, and zero-match states; zero-match state includes an All Movies button. Make the result count and heading update with each search and filter change.

- [ ] **Step 3: Verify the complete Movies flow in the local browser**

Run: npx wrangler dev --local  
Expected: /movies.html loads without console errors. At 320px and 1280px, titles remain readable; genre buttons work by mouse, Enter, and Space; search updates heading and count; empty results reset to All Movies; movie cards and Watch, Home, Movies, TV, Account, and search-result controls reach their intended destinations. No visible placeholder link uses #.

- [ ] **Step 4: Re-run automated tests and commit**

Run: node --test tests/movies-logic.test.mjs tests/movies-page.test.mjs  
Expected: PASS. Commit message: feat: improve movies page readability and navigation
