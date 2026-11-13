# Uncle Tye Deal Desk — standalone Cloudflare deployment

Production: https://uncle-tye-deal-desk.titushafner238.workers.dev

Preserves the original Deal Desk React UI. All routes and assets require a signed, HttpOnly, SameSite session cookie. Password material and session signing key are Cloudflare runtime secrets; no credentials or brand/email data belong in this repository. D1 binding: DB. Login attempts are throttled in D1. Search engine indexing is disabled.

Build: npm install then npm run build. Test: npm test. Upload dist/worker.js as an ES-module Worker through Cloudflare, preserving the DB binding and secret_text bindings. Do not overwrite or redeploy the Orbit streaming Worker.

Automatic updates: the existing private Sites endpoints remain the protected ingestion source used by the authorized Sheet/Gmail automations. Those tasks mirror tracker_source, brand_profiles, and desk_settings into standalone D1 using the authorized Cloudflare connector with optimistic concurrency. Never mirror handoffs after initial migration; the standalone site owns handoff edits. Private source runtime data must never be committed.
