# Orbit X Streaming — Source-Level Security Review

**Review date:** 2026-10-13  
**Reviewed ref:** `main` (read-only source inspection)  
**Status:** Preliminary static review only. No live requests, exploit attempts, penetration test, or deployment changes were performed.

## Critical finding: management writes appear reachable without an admin check

In `src/index.js`, the Worker route dispatcher contains direct calls to privileged handlers without an explicit `requireAdmin(request, env)` guard in the route branch:

| Route | Handler | Source-level observation |
|---|---|---|
| `POST /api/site-settings` | `saveSiteSettings` | Direct call; handler writes allowlisted site settings to D1 |
| `POST /api/content` | `saveContent` | Direct call; handler inserts/updates catalog records |
| `POST /api/content/delete` | `deleteContent` | Direct call; handler deletes a content row by ID |
| `POST /api/seasons` | `saveSeason` | Direct call; inspect full handler and enforce admin authorization |
| `POST /api/episodes` | `saveEpisode` | Direct call; inspect full handler and enforce admin authorization |
| `POST /api/upload-url` | `uploadUrl` | Direct call; currently returns a generated key/path only, not an upload credential. Review whether it should be admin-only and rate-limited, but the stronger confirmed issue is the unguarded catalog/settings mutation routes. |

The neighboring `POST /api/upload` and `POST /api/import-url` branches do explicitly call `requireAdmin`, which makes the missing checks on the routes above especially important to resolve. The `GET /api/content` branch is also admin-guarded, while `GET /api/public/content` is intended to be public.

### Impact if confirmed

A remote caller may be able to change site settings, create or modify catalog entries, delete titles, or alter TV seasons/episodes without being an administrator. The upload-url route appears to only generate a random storage key/path; it is not evidence by itself that a caller can upload bytes. The exact impact depends on handler behavior and the live deployed version. Treat this as a **release-blocking authorization concern** until fixed and tested.

### Required remediation

1. Coordinate with the current streaming-site editor so the fix is made in the active source of truth, not as a competing edit from this planning branch.
2. Enforce server-side admin authorization on every management mutation route, including settings, content, delete, seasons, episodes, and upload URL creation where appropriate.
3. Prefer a shared route guard or authorization inside each privileged handler so a future route cannot accidentally omit the check.
4. Verify that only an authenticated account with `is_admin = 1` can invoke each privileged operation.
5. Test each route as: signed out, signed in as ordinary user, and signed in as admin. Expected result: signed-out and ordinary-user requests return 401/403 and cause no database or storage changes; admin request succeeds with valid input.
6. Check CSRF/origin protection for cookie-authenticated state-changing routes. `SameSite=Lax` is useful but should not be treated as a complete authorization or CSRF review.
7. Re-run the negative tests against a preview deployment, attach evidence to the PR, then merge/deploy only after owner approval.

## Other source-inspection observations

### Existing positive controls

- SQL queries in the inspected account handlers generally use D1 prepared statements and bound parameters.
- The account code hashes passwords with PBKDF2 and a per-password random salt.
- Session tokens are generated with a cryptographically secure random source; the database stores a token hash rather than the raw token.
- The session cookie is configured with `HttpOnly`, `Secure`, and `SameSite=Lax`; session lookup checks expiry and disabled-account state.
- Profile update/delete handlers check the profile's `user_id` against the authenticated account.

These controls are encouraging, but source inspection alone does not prove the full system is secure.

### Remaining items to verify

- Authentication/signup/login rate limiting and abuse controls.
- CSRF/origin checks on cookie-authenticated writes.
- Email verification and password-reset flow; account deletion and session revocation across devices.
- Input/body-size limits and consistent safe error responses.
- Correct authorization on every admin/catalog/media/settings endpoint, including less frequently used routes.
- Whether public media/upload URLs can expose unlisted content or allow abuse.
- Secrets are only in Cloudflare secrets/settings and are not committed to the public repository.
- Privacy disclosures reflect the actual data and ad/analytics SDKs.

## Important limitation

This review did not call the live Worker endpoints, inspect the live D1 data, or verify which commit is currently deployed. The active editor may already have changed the code since the reviewed `main` ref. Confirm the finding against the latest working tree and preview before taking action. No production files were modified by this review.
