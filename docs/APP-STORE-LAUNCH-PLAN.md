# Orbit X Streaming — App Store Launch Plan

Status: planning only. This file is isolated on `prep/orbit-x-app-store-launch`; it does not change the live Cloudflare Worker or the `main` branch.

## Goal

Publish Orbit X Streaming as:
- iPhone/iPad app through Apple App Store
- Android app through Google Play
- Roku channel through Roku's publishing process

Brand: black + Lunar Purple, Orbit X wordmark. Keep this project separate from Orbit X Books, Music, AI, Gaming, and Hub.

## Current known deployment

- Website: https://orbitx.titushafner238.workers.dev/
- GitHub source repository: https://github.com/titushafner238-debug/orbitx
- Hosting: Cloudflare Workers
- Important: the GitHub repository is currently public. Never commit signing keys, store credentials, API secrets, or private user data. Consider making the repo private if public source code is not intentional; do not change visibility as part of this plan without owner approval.

## Recommended implementation approach

Do not submit a bare website wrapper as the final product. Store reviewers may expect a stable, useful app experience beyond a simple repackaged website, and Roku requires its own TV app model.

1. **Shared catalog/API contract**
   - First inspect the existing catalog and playback flow without changing production files.
   - Define a stable, read-only catalog feed for titles and episodes: stable ID, title, type, description, year, genres, poster/backdrop URLs, runtime, episode/season metadata, content rating where known, playback URL, and rights/territory notes.
   - Do not expose admin-only endpoints, credentials, or private data.
   - Ensure playback URLs are HTTPS, reliably reachable, and compatible with target devices; confirm range requests/streaming behavior and subtitle needs where applicable.
   - A feed should only include content Orbit X is legally allowed to distribute.

2. **iOS + Android**
   - Prefer a shared native codebase (for example, Expo / React Native) that consumes the catalog API and uses native video playback, rather than shipping a thin web wrapper.
   - Build the first usable version around Home, Search, title details, playback, watchlist/collections if the current backend supports them, and clear error/loading states.
   - Keep branding consistent with the website, but optimize touch targets, safe areas, orientation, accessibility, and app lifecycle.
   - Test playback, network loss, resume behavior, search, navigation, and multiple device sizes before store submission.

3. **Roku**
   - Build a separate Roku app using Roku's SceneGraph + BrightScript model.
   - Use a Roku-compatible JSON/XML catalog feed, large focusable poster cards, remote-control directional navigation, and Roku-supported video playback.
   - Add channel metadata/artwork and test on a Roku device or Roku testing environment.
   - Roku's own documentation says a channel needs original/licensed video content, web-hosted content, and a feed describing the catalog. Validate every title's distribution rights first.

## Account and submission checklist

### Apple App Store
- Sign in at https://developer.apple.com/account/ with the Apple Account used on the user's iPhone.
- Check whether Apple Developer Program membership is active.
- If not, enroll at https://developer.apple.com/programs/; current published individual membership price is USD $99/year. Individual enrollment lists the developer's legal name as the seller. Organization enrollment requires a legal entity and additional verification.
- Create the app record in App Store Connect after the bundle ID and app name are settled.
- Prepare screenshots, app description, support URL, privacy policy URL, age rating, privacy/data collection answers, export compliance answers if applicable, and review notes.
- Upload a signed build, test via TestFlight, then submit for review.

### Google Play
- Sign in at https://play.google.com/console/ and check whether a Play Console developer account already exists.
- If not, register and complete identity/contact verification; the published registration fee is USD $25 one-time.
- Create the app record, choose app name/default language/app type, complete the Data safety form, content rating, target audience, ads declaration, privacy policy, app access/reviewer instructions, store listing, screenshots, and required testing track.
- Build and sign an Android App Bundle (.aab), test on real devices, and follow any testing requirements shown for the specific account type.

### Roku
- Start at https://developer.roku.com/ and create/sign in to a Roku developer account.
- Review current channel requirements and publishing guide: https://developer.roku.com/dev/docs/channel-publishing-guide
- Create a Roku channel only after the catalog feed, playback compatibility, channel artwork, and content rights are ready.
- Test remote navigation, playback, back behavior, network failure, and resume/exit paths before submitting for certification.

## Privacy, rights, and review readiness (release blockers)

- Verify rights and public-domain status title-by-title for every movie/episode, including territory and source URL. Public-domain status can differ by work, version, and country.
- Ensure posters, backdrops, logos, fonts, trailers, and other artwork have a documented source/license. Do not assume a public-domain film makes its poster public domain.
- Publish an accurate privacy policy and support contact. The policy and store forms must reflect what the app actually collects and which third parties receive data.
- Do not add tracking, ads, accounts, subscriptions, or purchases until the implementation and disclosures are defined and tested.
- If accounts or personalized watchlists sync across devices, document what data is stored and how deletion works.
- Store names/icons must not imply official Apple, Google, or Roku affiliation.

## Phased work plan

- [ ] Phase 0 — Read-only audit: inspect existing site, catalog, player, privacy policy, hosting configuration, and rights records.
- [ ] Phase 1 — Define feed schema and identify broken/incompatible playback sources.
- [ ] Phase 2 — Build shared iOS/Android app in a separate directory/repository branch.
- [ ] Phase 3 — Build Roku channel separately.
- [ ] Phase 4 — Test with real devices / TestFlight / Google Play testing / Roku certification.
- [ ] Phase 5 — Submit only after rights, privacy, playback, support, and store metadata checks pass.

## Safety rules for active website work

- Do not edit or deploy the production Worker as part of app preparation.
- Do not merge this branch until the owner reviews the plan.
- Coordinate with the active website work before inspecting or changing files that another chat may be editing.
- Prefer a separate app directory or separate repository for native apps and Roku source.
- No store submission can be completed until the owner signs in, accepts platform agreements, and completes required identity/payment steps.
