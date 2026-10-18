# Orbit X Streaming — Accounts, Intro Video, and Ads

Status: isolated preparation only. This file is on `prep/orbit-x-app-store-launch`; it is not wired into the live site and has not been deployed.

## Existing account system found in source

The current Worker already contains:
- Email/password signup and login endpoints.
- Password hashing using PBKDF2 with a per-password random salt.
- Random session tokens stored as hashes and sent in a Secure, HttpOnly, SameSite=Lax cookie.
- A D1-backed user, profile, and settings system.
- Multiple profiles per account and basic settings persistence.

The user-facing account system is therefore not starting from zero. However, do not assume it is production-ready solely from source inspection. Before app launch, test signup/login/logout, session expiry/revocation, brute-force protection/rate limits, password reset, email verification, CSRF/origin protections, account deletion, and behavior on iOS/Android/Roku. Email/password sessions that rely only on browser cookies will not automatically authenticate native apps or Roku; define a secure token/session exchange for each client.

## Cross-device personalization gap

The current shared `orbit-features.js` source uses browser `localStorage` for the saved collection, watch-later list, and Continue Watching data. This is local to one browser/device/profile and does not satisfy cross-device sync.

Required server-backed records, scoped by authenticated user AND selected profile:
- Playback progress: content ID, episode ID if applicable, current position seconds, duration seconds, updated timestamp, completion flag.
- Watchlist/saved titles.
- Favorites/likes.
- Optional thumbs-up/down and recommendation preferences.
- Device-independent settings.

Suggested API shape (not implemented in this plan-only branch):
- `GET /api/me/progress`
- `PUT /api/me/progress/:contentId`
- `GET /api/me/watchlist`
- `PUT /api/me/watchlist/:contentId`
- `DELETE /api/me/watchlist/:contentId`
- `GET /api/me/ratings`
- `PUT /api/me/ratings/:contentId`

Every endpoint must verify the session server-side and derive the account ID from the session, never trust a user ID supplied in the request body. Profile IDs must be checked against the authenticated account. Add rate limits, validation, ownership checks, and deletion behavior. For native apps, use short-lived access tokens and rotating/revocable refresh sessions or another secure platform-appropriate session design; do not expose the existing HttpOnly cookie to JavaScript.

## Intro video

A sample configuration lives in `config/streaming-experience.example.json` with validation rules in `config/streaming-experience.schema.json`.

Desired behavior:
- One short, branded Orbit X intro video can be added later by pasting an HTTPS media URL into configuration/admin settings; no source rewrite should be needed just to change the asset.
- The intro may play on first visit and before title playback, with a clear skip control.
- Keep intro URL blank and feature disabled until the owner supplies the final video and the URL has been tested on web, iOS, Android, and Roku.
- Store a stable intro version ID and per-profile preference if users can disable or skip repeated intros.
- Do not put a large video file in Git; host it on an appropriate streaming/CDN service with playback rights and caching configured.
- Do not play the intro again between ad pods and content; target sequence is intro (when enabled) → approved pre-roll ads (when enabled and returned) → movie/episode.

## Ads and revenue

Configuration intentionally defaults ads OFF. Set a maximum of three pre-roll ads per title, but do not force three ads if the provider returns fewer. When there is no fill, the video should start rather than showing fake ads or trapping the viewer. Provider policy, ad response, consent, content category, platform support, and user age/region may all limit what can play.

### First option to investigate

Google AdSense is free to join, but it is primarily a website advertising product and is not automatically a source of in-stream pre-roll video ads. Google says site owners need original, policy-compliant content and approval before ads serve. See:
- https://support.google.com/adsense/answer/32850
- https://support.google.com/adsense/answer/9724

For actual in-stream video, investigate Google Ad Manager / Interactive Media Ads (IMA) and approved VAST demand partners. Google documents video-ad eligibility and states publishers must have monetization rights or written permission for the content:
- https://support.google.com/admanager/answer/2554762

Important limitations:
- YouTube-hosted videos cannot simply have a third-party pre-roll inserted around a YouTube embed; YouTube content monetization must follow YouTube's own rules and eligible creator monetization path.
- The ad provider may reject a catalog dominated by public-domain content or content that the publisher cannot document rights to monetize.
- Ad networks are free to join in some cases, but acceptance and fill are not guaranteed; revenue may be zero until the site is approved and viewers generate eligible impressions.
- Do not insert random third-party ad scripts, popups, or forced redirects. They create security, store-review, and user-trust risks.
- Ad requests and tracking must honor applicable privacy/consent requirements and the platform's policies.
- For Apple/Google/Roku native apps, web ad tags cannot simply be copied across all platforms. Use each provider's supported SDK/IMA/VAST integration and test on each device type.

## Suggested release sequence

1. Fix server-side progress/watchlist/likes sync and verify account security.
2. Add an owner-editable intro video URL, preview, enable/disable switch, and skip behavior.
3. Add an ad-provider adapter with provider set to `none` until an account is approved and a valid test tag is available.
4. Test the full sequence on representative MP4/HLS streams: intro → zero-to-three real ads → content; include no-fill, ad timeout, offline, skip, captions, and resume.
5. Update the privacy policy and Apple App Privacy / Google Play Data safety disclosures after the real data and SDK behavior are known.
6. Do not deploy or merge until the active website changes are coordinated and a preview build passes tests.
