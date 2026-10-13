# Orbit X Streaming — Cross-Device Data Contract (Proposal)

**Status:** Design only; not implemented. Keep on `prep/orbit-x-app-store-launch` until coordinated with the active streaming-site edits.

## Why this is needed

The current database schema already has accounts, sessions, profiles, and user settings, but the current `orbit-features.js` stores Continue Watching, Watch Later, saved collection, and custom playlists in browser `localStorage`. Browser-local state cannot follow a signed-in account to another device.

The contract below is intentionally profile-scoped. The authenticated account owns the data; the selected profile is only accepted after the server confirms that it belongs to that account.

## Preference scope decision

The current `user_settings` table is keyed by `user_id`, so its language, sound, volume, and blind-mode preferences are account-level, not profile-specific. The current account page also keeps dark mode in browser `localStorage`, so dark mode does not sync across devices today. Before implementing sync, explicitly decide which settings belong to the whole account and which belong to an individual viewer profile. If the UI intends each profile to have its own preferences, add a `profile_settings` table keyed by `profile_id`; do not silently change the meaning of existing account-wide settings.

## Proposed tables

Add these only through a reviewed, versioned migration after checking the live D1 schema and taking a recoverable backup. Do not replace or re-import `schema.sql` into the production database.

### `profile_playback_progress`

- `profile_id TEXT NOT NULL`
- `content_id TEXT NOT NULL` — movie/show identifier
- `episode_id TEXT` — nullable for a movie; use the stable episode ID for episodes
- `position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0)`
- `duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`
- `completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- Unique key should distinguish movie progress from each episode, e.g. `(profile_id, content_id, COALESCE(episode_id, ''))` via a unique expression index, or use a non-null normalized media-item key.
- Foreign keys should cascade on profile deletion and content/episode deletion where appropriate.

### `profile_watchlist`

- `profile_id TEXT NOT NULL`
- `content_id TEXT NOT NULL`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- Primary key `(profile_id, content_id)`
- Foreign keys to profiles/content; cascade on delete.

### `profile_ratings` (optional, only if likes/ratings are actually part of the UI)

- `profile_id TEXT NOT NULL`
- `content_id TEXT NOT NULL`
- `rating INTEGER NOT NULL CHECK (rating IN (-1, 1))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- Primary key `(profile_id, content_id)`

### `profile_collections` and `profile_collection_items`

Use a separate collection table and join table rather than trusting a JSON playlist passed by the browser:
- Collection: `id`, `profile_id`, `name`, `created_at`, `updated_at`
- Item: `collection_id`, `content_id`, `position INTEGER NOT NULL DEFAULT 0`, `created_at`
- Unique collection name per profile (case-insensitive if supported safely) and unique item per collection.
- Sharing links should use an explicit share token with a revocation/expiry policy; do not serialize an arbitrary playlist as an unbounded URL query parameter.

## Proposed endpoints

All paths below are proposals, not existing API routes.

| Method and path | Behavior |
|---|---|
| `GET /api/me/progress?profileId=...` | List progress for one owned profile |
| `PUT /api/me/progress` | Upsert progress for one media item |
| `DELETE /api/me/progress` | Remove progress for one media item |
| `GET /api/me/watchlist?profileId=...` | List Watch Later entries |
| `PUT /api/me/watchlist` | Add a content item idempotently |
| `DELETE /api/me/watchlist/:contentId?profileId=...` | Remove an item |
| `GET /api/me/collections?profileId=...` | List collections and their items |
| `POST /api/me/collections` | Create a collection |
| `PATCH /api/me/collections/:id` | Rename/reorder owned collection |
| `DELETE /api/me/collections/:id` | Delete owned collection |
| `PUT /api/me/ratings` | Upsert a permitted rating if the UI supports it |

### Example progress request

```json
{
  "profileId": "profile_...",
  "contentId": "content_...",
  "episodeId": null,
  "positionSeconds": 125,
  "durationSeconds": 1800,
  "completed": false
}
```

### Validation rules

- Parse JSON safely and reject malformed JSON with a 400 response.
- Enforce integer ranges, reasonable body sizes, valid IDs, and boolean/enum values.
- Reject negative positions, durations, and positions that exceed a known duration by an unreasonable tolerance.
- Verify that the media item exists and is published/available to the user before returning or accepting progress.
- Never accept `userId` or account ownership from the client body. Resolve account identity from the current server-validated session.
- Verify `profileId` belongs to the authenticated user on every request. A profile ID is not authorization.
- Use prepared statements with bound parameters. Use a fixed allowlist for any dynamic identifiers/sort fields.
- Return no-store cache headers for account-specific data.
- Make PUT operations idempotent. Avoid logging passwords, cookies, session tokens, or sensitive request bodies.
- Add server-side throttling to write endpoints and authentication endpoints; choose limits after observing expected playback heartbeat frequency.
- Keep playback writes lightweight. Do not write on every video frame; debounce client writes (e.g. every 15–30 seconds and on pause/exit) and still save progress on lifecycle events where possible.
- Resolve concurrent device writes deterministically: accept only valid updates and compare server timestamps; consider client session IDs only for diagnostics, not authorization.

## Existing local data migration

When signed-in sync ships:
1. Read existing localStorage data defensively; malformed or missing JSON must not break the page.
2. Offer a one-time import into the selected profile, with de-duplication and validation.
3. Do not silently merge one device's local data into every profile.
4. After a confirmed server save, keep a temporary local cache for offline resilience if useful, but treat the server as the source of truth.
5. If signed out, keep local-only behavior or ask the viewer to sign in; never attach anonymous local data to a different account automatically.
6. Test migration twice to prove it is idempotent.

## Native clients

Cookie sessions work naturally for the current same-origin website, but native iOS/Android/Roku clients need a deliberate authentication design. Do not put an existing HttpOnly cookie into JavaScript storage. Prefer platform-secure credential storage, short-lived access credentials, revocable/rotating refresh sessions, and a documented logout/revocation path. The implementation must be reviewed before native apps share the account backend.

## Acceptance criteria

- A progress update from device A appears on device B after authentication and selecting the same profile.
- Two profiles on the same account never share progress/watchlists/collections unless an explicit product feature says otherwise.
- A user cannot read or mutate another account's profile by changing a profile ID, content ID, collection ID, or episode ID.
- Signed-out requests return 401 and do not leak stored data.
- Removing an item on one device removes it on the other after refresh.
- No duplicate watchlist items or collection items after retries.
- Network failure preserves local playback behavior and retries safely.
- Large or malformed requests fail safely without breaking playback.
- Database migration is reversible or has a documented restore procedure and is tested against a non-production D1 database first.
