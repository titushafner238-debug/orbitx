# Orbit X Streaming — Release Acceptance Checklist

**Status:** Test plan only. No live site behavior changed by this document. The app-store release is blocked until all applicable P0 items are tested on a preview deployment and evidence is recorded.

## Evidence rules

For each check, record: date, commit SHA, preview URL/build number, device/browser, exact steps, expected result, actual result, and screenshot/log reference. Use a disposable test account. Never paste passwords, session cookies, ad tokens, signing credentials, or private viewer data into an issue or PR.

Status labels: `NOT TESTED`, `PASS`, `FAIL`, `BLOCKED`. Source inspection is not a runtime pass.

## P0 — Required before real viewers or store submission

### Accounts and sessions

- [ ] New account can be created with valid input.
- [ ] Invalid email, empty password, and passwords failing current policy are rejected with understandable messages.
- [ ] Duplicate email is handled safely without an unhandled server error.
- [ ] Login works with correct credentials and rejects wrong credentials without revealing whether a particular email exists.
- [ ] Logout invalidates the server session and clears the cookie.
- [ ] Expired, revoked, malformed, and unknown session tokens are rejected.
- [ ] Disabled account cannot authenticate or use an existing session.
- [ ] Session lifetime and session cleanup are documented and tested.
- [ ] Authentication and account mutation endpoints have server-side rate limits or a documented, approved mitigation.
- [ ] Cookie flags are correct for HTTPS deployment; account responses are not cached.
- [ ] CSRF/origin protections are evaluated for every cookie-authenticated state-changing endpoint.
- [ ] Email verification, password reset, account deletion, and recovery requirements are decided before public launch. Any feature not implemented is not advertised as available.
- [ ] Account endpoints do not leak password hashes, raw tokens, admin-only fields, or other users' data.

### Profiles and authorization

- [ ] A new account gets the expected default profile.
- [ ] Profile create/edit/delete behavior respects the documented profile limit.
- [ ] Profile IDs are checked against the signed-in account on every read and write.
- [ ] A deliberately forged profile ID from a second test account returns 403/404 and changes no data.
- [ ] Deleting a profile has documented effects on progress, lists, ratings, and collections.
- [ ] Account-specific API responses use `Cache-Control: no-store`.

### Cross-device behavior (currently a known gap)

- [ ] Playback progress persists server-side per account and profile.
- [ ] Watch Later, saved titles, collections/playlists, and ratings (if offered) persist server-side.
- [ ] Device A → device B sync works for the same profile.
- [ ] Profile A data never appears in Profile B by default.
- [ ] Offline playback and temporary local cache do not overwrite newer server data unexpectedly.
- [ ] Repeated retries do not duplicate saved titles or collection items.
- [ ] Existing localStorage state is imported only through a safe, idempotent migration flow.

### Public API content visibility

- [ ] `GET /api/seasons` and `GET /api/episodes` never expose draft/scheduled seasons or episodes, future release metadata, or unreleased media URLs to public callers.
- [ ] A draft show with draft episodes, a published show with a future-scheduled episode, and a published episode are tested separately.
- [ ] Admin editing can still view drafts through a separate server-authorized path if that is required.

### Playback and content rights

- [ ] Every published movie/episode has a working, authorized playback URL and correct metadata.
- [ ] MP4 and HLS are tested separately where used; range requests/seek, pause/resume, errors, and captions are checked.
- [ ] YouTube embeds work on supported web clients and follow YouTube's own playback/monetization rules.
- [ ] Do not wrap YouTube-hosted content in third-party pre-roll ads.
- [ ] Captions, subtitles, aspect ratios, full-screen, audio, and resume behavior are tested.
- [ ] Continue Watching appears where specified and opens the correct movie/episode at the saved position.
- [ ] No unlicensed source, inaccessible media, broken poster, placeholder button, or misleading availability claim remains in the release catalog.
- [ ] Rights and monetization permissions are documented per title, not assumed from the words “public domain.”

### Intro and ads (intentionally disabled until real providers/assets are configured)

- [ ] Intro remains disabled while URL is blank, invalid, or untested.
- [ ] Owner can change the intro URL without source edits once an approved settings workflow is implemented.
- [ ] Intro can be skipped as specified and does not repeat unexpectedly.
- [ ] Ad integration uses a real approved provider and valid test tag/SDK; no simulated ad countdowns or fake ad cards.
- [ ] Maximum three ads is a cap, not a guarantee. Provider responses may return zero, one, two, or three.
- [ ] No-fill, timeout, blocked ad, offline, invalid tag, and SDK error all fall through to playback instead of trapping the viewer.
- [ ] Ad frequency, content category, region/age requirements, consent, and rights rules are satisfied.
- [ ] No ad provider approval or revenue is promised before approval and eligible impressions.
- [ ] Intro → real ads (zero to three) → content sequence is tested; intro does not play again between ad pod and content.

### Privacy and legal

- [ ] Privacy policy accurately lists the real account data, playback history, analytics, ad SDKs, and sharing behavior.
- [ ] Data retention, deletion, account deletion, support contact, and rights/licensing statements are complete.
- [ ] Apple App Privacy and Google Play Data safety declarations match actual app behavior and SDKs.
- [ ] Consent and child/family audience requirements are reviewed before enabling tracking or ads.
- [ ] Public repository and build artifacts contain no secrets, signing keys, store credentials, private tokens, or user data.
- [ ] Production secrets are stored in platform secret storage, not committed to Git.

## P1 — Device and store readiness

### Web

- [ ] Current iOS Safari, Android Chrome, and desktop Chromium/Firefox/Safari where supported.
- [ ] Narrow mobile width, tablet, desktop, keyboard navigation, focus states, screen readers, and reduced-motion behavior.
- [ ] Slow network, API errors, blocked storage, expired login, and browser refresh are handled.

### iOS and Android native apps

- [ ] App is not merely an unmodified thin website wrapper; platform review requirements and user value are documented.
- [ ] Secure login, logout, token refresh/revocation, and profile switching work.
- [ ] Playback, captions, background/foreground transitions, rotation/full-screen, audio interruptions, and network changes are tested on physical devices.
- [ ] In-app account deletion and support paths meet current store requirements.
- [ ] SDK inventory, privacy manifests/declarations, data safety details, age rating, screenshots, app icons, and store listing are ready.
- [ ] Store developer accounts, agreements, identity checks, and fees are completed by the owner.

### Roku

- [ ] Separate Roku-native client uses supported Roku playback/UI APIs; do not assume web HTML/JavaScript will run as-is.
- [ ] Remote-control navigation, focus, back behavior, playback, captions, and network failures are tested on a physical Roku or supported test environment.
- [ ] Channel packaging, privacy/support links, content ratings, screenshots, and certification checklist are complete.

## P2 — Observability and operations

- [ ] Error logs are structured and redact credentials, tokens, emails where feasible, and playback URLs containing secrets.
- [ ] Alerts/monitoring exist for elevated auth failures, playback failures, and API 5xx responses.
- [ ] Database backup/restore and rollback procedure is tested before schema changes.
- [ ] Content upload/publish workflow validates URLs and metadata and clearly distinguishes draft, scheduled, and published states.
- [ ] A documented rollback path exists for each production release.
- [ ] A named owner can respond to copyright complaints, security reports, and account-support requests.

## Immediate P0 security blocker found by source inspection

The current `main` branch route dispatcher appears to expose state-changing management endpoints without calling `requireAdmin` in the route handler:

- `POST /api/site-settings` calls `saveSiteSettings` directly.
- `POST /api/content` calls `saveContent` directly.
- `POST /api/content/delete` calls `deleteContent` directly.
- `POST /api/seasons` calls `saveSeason` directly.
- `POST /api/episodes` calls `saveEpisode` directly.
- `POST /api/upload-url` calls `uploadUrl` directly (confirm whether this endpoint is intended to be public and whether it can create or expose privileged storage operations).

This is a **source-inspection finding, not a live exploit test**. It must be verified against the current deployment and the active editor's latest code. If confirmed, it could allow unauthenticated visitors to alter catalog/settings or delete content; therefore, do not open the site to a wider audience or submit apps until the routes are protected and negative authorization tests pass. The admin check should be enforced server-side in the route handler (and/or in each privileged handler), not merely by hiding admin UI. For all management routes, test signed-out, ordinary-user, and admin sessions. Review CSRF/origin protection for cookie-authenticated writes at the same time.

Do **not** patch these production routes from this prep branch while another chat is actively editing them. Coordinate the finding with that editor, make the fix in the active workstream, and verify on a preview deployment before merge/deploy.

## Current source-inspection notes (not runtime verification)

- The repository's `wrangler.jsonc` declares Worker `orbitx`, entrypoint `src/index.js`, static assets directory `.`, and D1 binding `DB`.
- `schema.sql` defines `users`, `sessions`, `profiles`, and `user_settings`; it does not currently define server-backed playback progress, watchlists, or collections.
- `orbit-features.js` currently uses browser `localStorage` for Continue Watching and collection/watch-later data.
- Source contains a password-hashing and cookie-session implementation, but that is not proof of complete production security. Rate limiting and CSRF/origin protections were not found by the source searches performed for this plan; confirm against the full current source before treating them as absent.
- `config/streaming-experience.example.json` has ads disabled and an empty intro URL by default. It is an example config only and is not wired into the Worker.

## Safe release order

1. Coordinate with the active website editor; avoid concurrent changes to the same production files.
2. Build and test on a preview/staging environment with a separate test database.
3. Add a versioned migration for cross-device data; verify rollback/restore.
4. Run P0 checks and attach evidence to the pull request.
5. Add intro and provider-specific ad integration only after the asset/provider is approved and real test credentials are available.
6. Review privacy/store declarations against the exact shipped SDKs and data flows.
7. Obtain explicit owner approval before merging/deploying to production or submitting apps.
