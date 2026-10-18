# Orbit X Streaming — Read-only App Readiness Audit

Audit date: 2026-10-13
Scope: GitHub `main` source inspection only. No production deployment, database mutation, or website file edits were performed during this audit.

## What the source currently indicates

- Cloudflare Worker configuration is in `wrangler.jsonc`; Worker name is `orbitx`, entry point is `src/index.js`, static assets are served from the repository root, and a D1 database binding named `DB` is configured.
- The source contains public catalog API usage at `/api/public/content` and a site settings endpoint at `/api/site-settings`.
- Catalog fields include type, title, slug, description, year, runtime, rating, poster/backdrop/trailer URLs, video URL, captions URL, and featured status.
- TV seasons and episodes are represented separately; episode records include title, description, runtime, thumbnail, video URL, captions URL, publication status, and release time.
- The web player supports YouTube embed URLs and direct video URLs in an HTML video element. Native app and Roku implementations must test these formats independently; a YouTube embed URL is not the same thing as a direct media stream URL.
- The current privacy page calls itself an early project page and says it should be reviewed for production launch. It mentions email address, derived password hash, family profile names/avatar choices, viewing preferences, and HTTP-only session cookies. Store privacy disclosures must be reconciled against actual API/database behavior and any analytics, advertising, or third-party services before submission.
- The repository is public at the time of this audit. Never put credentials, signing keys, store access tokens, or user data in it. Owner should decide whether the source is intentionally public or should be made private; this audit does not change repository visibility.

## App implementation recommendation

### Shared phone apps
Use a separate app workspace (e.g. `apps/mobile`) or, preferably, a separate private repository if the current repository should remain a public website source. Use Expo/React Native for shared iOS/Android UI and native playback. Treat the Worker API as a read-only catalog backend initially; do not add or alter production endpoints until the contract and auth model are understood.

Minimum API contract to verify before app coding:
- List published catalog titles, with stable IDs/slugs and explicit pagination.
- Fetch one title's full metadata.
- Fetch seasons and published episodes for a show.
- Return only titles available in the viewer's region and permitted to be streamed.
- Define consistent errors, cache headers, CORS behavior if required, and HTTPS media URL expectations.
- Never return draft/scheduled titles, admin-only fields, or private account information to unauthenticated catalog clients.

### Roku app
Create a fully separate Roku source tree/repository using SceneGraph + BrightScript. Add a Roku feed adapter that maps approved catalog fields to a Roku-friendly JSON/XML feed. Roku UI must support remote focus, back/exit, loading/error states, and native Roku playback. Validate media formats and hosting limits before committing to a playback architecture.

## Blocking checks before a store build

1. **Live API verification:** confirm current deployed endpoints match the inspected source and return a stable schema; the source may differ from the current live deployment.
2. **Playback matrix:** test representative direct MP4/HLS URLs, YouTube URLs, subtitles, seek/resume, and failure cases on iOS, Android, and Roku. YouTube embed-based items may not be suitable for every platform; confirm terms and platform compatibility.
3. **Rights ledger:** for each title/episode and asset, record the rights basis, source, territory, and allowed distribution/platforms. Do not treat a title's public-domain status as proof that its poster/trailer is also free to use.
4. **Privacy/data safety:** map actual data flows (accounts, profiles, viewing history, cookies, analytics, ads, crash reports, third-party video players) to the privacy policy and store forms. Add account/data deletion behavior if required by the actual account functionality and platform policies.
5. **App-store quality:** create useful app-specific navigation and playback; do not submit only a thin wrapper of the existing site.
6. **Testing:** real-device tests, Apple TestFlight, Google Play test track, Roku device/test tooling, screenshots, support contact, reviewer notes, and accessibility checks.
7. **Signing and release access:** store accounts, identity verification, signing certificates/keys, and final agreements must be completed by the owner. Keep secrets outside GitHub source.

## Safe next steps

- Keep this work on `prep/orbit-x-app-store-launch` until reviewed.
- Before changing code, coordinate with the active streaming-site work in the other chat.
- Build native clients separately from the live website and use a preview/staging API if any backend changes are needed.
- Do not deploy to production or submit an app until the blockers above are cleared.
