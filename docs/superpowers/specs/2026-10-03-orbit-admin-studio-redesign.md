# ORBIT Movies and Admin Studio Redesign

**Date:** 2026-10-03  
**Status:** Draft for Titus to review  
**Direction:** Wix-inspired studio workspace, without copying Wix branding or assets

## Purpose

Make movie names readable over poster artwork, make the Movies page and its controls clear to use, and reorganize the admin into a focused workspace where each setting has an obvious effect. Protect all admin changes at the server as well as in the interface.

## Movies page

- Keep the existing ORBIT look and poster-first catalog.
- Add a clear black outline and soft shadow to titles shown over poster art, with a dark fade behind the title where needed. Keep title and metadata legible at narrow and wide screen sizes.
- Render genre choices as real keyboard-accessible buttons with a visible selected state. Filtering and search must update the result count and heading.
- Keep movie cards and Watch links pointed to the matching watch page. Search results and header links must lead to their matching destinations.
- When a genre or search has no matches, show a useful empty state and keep a clear way to reset to All Movies.
- Check all visible links and buttons for a real destination or action; do not leave placeholder links such as “#”.

## Admin workspace

### Layout

Use a simple editor shell inspired by Wix’s left-side feature menu and focused Inspector panel:

- **Left navigation:** Overview, Content, Website Design, Site Settings, and Accounts.
- **Top bar:** ORBIT identity, View Site, current admin access state, and the save/publish state.
- **Main workspace:** show the selected catalog, settings, or site preview.
- **Editing panel:** show the controls for the selected movie, show, or design section. On small screens, panels stack and navigation collapses into a menu.

Keep common actions visible and label them plainly. Avoid placing the entire content editor, design builder, site settings, and accounts list in one long page.

### Content library

- Show movie and TV-show items with type, status, title, and search/filter controls.
- Add Movie and Add TV Show open a clean editor with clear sections for details, artwork, video, and (for shows) seasons and episodes.
- Save, Save Draft, Publish, Delete, Refresh, genre creation, season/episode controls, and uploads must each show a success or error result.
- Empty catalog, season, and episode states must tell the admin what is missing and how to add it.
- Keep Delete confirmation and make the selected item clear before editing or deleting it.

### Website design

- Use one canonical set of site settings. Remove the duplicate Site Control Center inputs that currently overlap the builder.
- Keep a central preview and a focused panel for Brand, Colors, Hero, Sections, Layout, Footer, and supported creative effects.
- Every preview control must change the preview immediately. Theme presets must set all of their advertised fields. Reset Preview must reload the saved values and discard unsaved edits.
- Save Website Changes must persist the same values the preview displays. After saving, show a clear saved state and reload the public page to confirm the changes.
- Keep effect controls only when they visibly change the preview and have a real setting/runtime mapping. Persist their values if they are presented as site settings.
- Image upload status must appear next to the control that initiated it. Failed uploads must explain what to fix.

## Access and server behavior

- Keep the site preview and public settings read-only for visitors.
- Require an authenticated admin for every admin write: content create/update/delete, site settings, seasons, episodes, artwork uploads, and video imports. Keep admin-only reads such as catalog and accounts behind the same check.
- Show a useful sign-in/access message in the admin when the current session is missing or is not an admin. Link to the existing account sign-in page; do not expose forms that appear ready to save when access is denied.
- Return clear unauthorized responses from the server even if a visitor bypasses the admin interface. Do not rely on hidden buttons as security.

## Done when

1. Movie titles remain readable against both light and dark poster art on desktop and mobile.
2. Search, genre filters, navigation, movie cards, and empty states lead to the expected page or visible result.
3. Every visible admin button has a working action, destination, or clear access/empty/error state.
4. Theme presets and creative controls update the preview correctly; saved settings survive reload and affect the live pages they claim to control.
5. Admin writes are rejected without admin access and work with authorized admin access.
6. Content, settings, and media flows are checked in a non-production test setup where possible; production catalog data is not used as disposable test data.

## Boundaries

This work covers the Movies page and the admin workspace/settings flows needed to meet the requirements above. It does not add streaming content, new account roles, new payment features, or copy Wix’s branding.