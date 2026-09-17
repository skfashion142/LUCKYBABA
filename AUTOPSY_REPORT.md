# COMMERCE/PICKUP PLATFORM — FULL AUTOPSY REPORT

Date: 2026-09-17
Scope: `commerce_pickup_platform_STEP7_8_FINAL.zip`
Method: repository-wide source/config/schema/security review, cross-file consistency checks, targeted defect reproduction by static analysis, and post-fix preflight/syntax checks.

## 1. Executive conclusion

The original ZIP was an integrated source bundle, not a fully production-certified release.

The original repository contained substantial real implementation across the two mobile apps and backend, but it also had security/correctness defects and several release gaps. The existing `FINAL_CERTIFICATION.json` was static/source certification only, while `LIVE_CERTIFICATION.json` was explicitly skipped because no live API URL was configured.

The patched tree preserves the existing architecture, package IDs, main routes, database model, authentication model, payment flow, AI/voice/call modules, and UI modules. Fixes were applied as additive/hardening changes rather than a rewrite.

## 2. Repository inventory

Original extracted source files: 77
Post-autopsy working-tree files: 84 (82 project files + 2 audit deliverables)
New project files: 5

Two mobile applications:
- Customer: `com.pickup.customer`
- Admin/Dealer: `com.pickup.admin`

Backend:
- Node.js/Express/TypeScript
- PostgreSQL
- Firebase Admin verification path
- S3-compatible storage adapter
- FCM adapter
- AI/STT/TTS provider adapters
- WebSocket realtime/call signaling

## 3. Findings from the original source

### P0/P1 correctness and security defects found and addressed

1. **Disabled admin could be re-enabled during login.**
   Original login used an upsert that set `enabled=true` on conflict. A previously disabled authorized-admin row could therefore be re-enabled by logging in.
   Fix: login no longer auto-enables an existing row; it selects and rejects disabled accounts.

2. **Admin authorization was not continuously tied to the single configured admin identity.**
   Fix: admin session authorization now checks the configured `AUTHORIZED_ADMIN_GMAIL` in middleware in addition to the enabled account state.

3. **Admin Firebase sign-in did not require verified email.**
   Fix: Firebase admin identity must contain `email_verified=true`.

4. **Production readiness endpoint did not require Firebase configuration.**
   Fix: `/ready` now treats Firebase as a required production dependency.

5. **Payment screenshot object ownership was not enforced.**
   A customer could submit a payment screenshot object key not scoped to that customer.
   Fix: payment submission only accepts `customer/<authenticated-customer-id>/...` objects.

6. **Payment evidence challenge use was not fully transactional.**
   Fix: evidence challenge is locked and consumed inside a transaction; invalid signatures consume the challenge and commit safely; transaction early-return paths now roll back.

7. **Manual payment approval/rejection was not atomic.**
   Fix: admin payment decisions now use a DB transaction, lock the order, require an actual UPI submission in `SUBMITTED` state, update payment/order state together, and restore stock on rejection.

8. **Verified-paid orders could be cancelled without a refund path.**
   Fix: cancellation of `VERIFIED` payment returns `REFUND_REQUIRED_BEFORE_CANCELLATION`. Non-paid cancellation restores reserved stock transactionally.

9. **Pickup video URL call had a real TypeScript compile defect.**
   Fix: corrected the storage signed-URL call to the provider's actual one-argument signature.

10. **Admin could receive historical customer location outside an active pickup session.**
    Fix: latest-location API now returns data only for an active authorized pickup lifecycle. Completing/cancelling/rejecting an order deletes customer location data.

11. **Location history was unnecessarily retained as multiple rows.**
    Fix: active order keeps only the latest location row; old row is replaced on each update. This reduces retained sensitive history.

12. **Pickup verification lacked its own brute-force rate limit.**
    Fix: customer/order verification attempts are rate-limited.

13. **Pickup verification code generation used a non-cryptographic random helper.**
    Fix: uses `crypto.randomInt` for the 6-digit code.

14. **Expired UPI payment orders did not explicitly terminate/delete live location state.**
    Fix: expiry sweep now ends the pickup session and deletes order location data when an expired payment is cancelled.

15. **Admin category delete route was missing.**
    Fix: added server-side category deletion with product-category reference cleanup.

16. **Admin/customer push infrastructure was incomplete for admin devices.**
    Fix: added `admin_devices` persistence, registration endpoint, and admin FCM token registration path.

17. **Notification delivery/read state was only partially represented.**
    Fix: customer notification retrieval now records `delivered_at`; existing read endpoint records `read_at`.

18. **Admin broadcast had no backend anti-spam guard.**
    Fix: added an admin-scoped broadcast rate limit of 3 requests/hour per API instance.

19. **AI new-product campaign could repeatedly select the same newest product.**
    Fix: added `last_sent_product_id` and migration 005 so a previously sent product is excluded from the next campaign.

20. **Production mobile API configuration could silently retain emulator fallback.**
    Fix: `10.0.2.2` fallback is development-only; production builds require an HTTPS `EXPO_PUBLIC_API_BASE_URL`.

21. **Presigned uploads had no server-enforced declared object size.**
    Fix: presign request now requires `sizeBytes`, applies per-MIME limits, and signs the exact `ContentLength`; mobile upload sends the same size.

22. **Customer/admin realtime presence was not being updated from WebSocket lifecycle.**
    Fix: customer WebSocket connect/disconnect now updates `presence` and emits `presence.updated` events.

23. **The Android payment-evidence Kotlin implementation required by the certification script was absent.**
    Fix: added an Android Expo module implementation, notification-listener service, Android manifest, and Gradle library configuration. UTR/amount/payee parsing is intentionally limited to evidence collected through permitted device APIs.

24. **Native payment evidence implementation had a duplicate-UTR collection bug during the patching pass.**
    Fix: incoming records are now compared against the existing record UTR rather than against themselves.

25. **The project's preflight script itself referenced missing `.env.example` files and failed before performing its actual checks.**
    Fix: environment examples are now optional; the preflight validates them only when present.

## 4. Database/migration autopsy

Migrations 001–004 already covered the core model. The autopsy found duplicate schema snapshots; `backend/src/schema.sql` was aligned with `backend/schema.sql` so the checked-in snapshots agree with the final-state schema.

Added:
- `005_autopsy_hardening.sql`
- `admin_devices` table with unique FCM token
- `ai_campaign_settings.last_sent_product_id`

Existing database protections retained:
- customer/admin session ownership constraint
- positive quantities and non-negative monetary values
- discount <= price
- unique UTR index (case-insensitive)
- scoped session revocation
- unique pending UPI change request per admin
- audit tables

## 5. Authentication/security status

Present and retained:
- Firebase identity verification on production auth paths
- customer phone identity check
- 21+ DOB enforcement on server
- signed JWT session
- database-backed session records
- expiration/revocation
- server-side admin authorization
- CORS allowlist requirement in production
- security headers
- error sanitization
- rate limiting
- signed private object URLs
- developer UPI unlock secret kept server-side
- timing-safe secret comparison
- audit logging

## 6. Payment status

Implemented in source:
- UPI URI/QR generation using exact order amount
- merchant UPI snapshot on order
- customer UTR submission
- customer screenshot submission
- ownership guard for payment screenshot
- manual admin verification/rejection
- signed Android device evidence
- UTR + amount + payee matching when evidence supplies it
- duplicate UTR database protection
- 15-minute payment window
- stock restoration on rejection/expiry
- no Razorpay dependency

Important release limitation:
The source contains a payment-evidence implementation, but no real dealer Android device was available in this environment to prove that GPay/PhonePe/BHIM notification/SMS evidence works on the target devices. Screenshot evidence is never treated as proof by itself.

## 7. Pickup/location status

Implemented/hardened:
- location permission flow
- explicit location rationale in app copy
- location-required pickup start
- active-session server checks
- latest-location sharing only
- admin active-order location gate
- completion/cancellation cleanup
- pickup verification code + rate limit

No secret/background tracking behavior was introduced.

## 8. AI/voice/chat status

Implemented in source:
- provider-backed AI adapter
- grounded catalog/order/pickup context
- customer AI conversation
- admin AI assistant
- STT/TTS provider adapters
- AI fallback/error paths
- prompt-injection/data fencing
- customer request for human takeover path
- admin TAKE OVER / RETURN TO AI
- AI conversation/call summaries paths

Remaining verification/gap:
Provider credentials and real external calls are not configured in this environment, so real-model output, latency, quota behavior, and failure recovery cannot be live-certified here.

## 9. Chat/realtime status

Backend routes support:
- Customer -> AI/admin conversation
- delivered/read fields
- read endpoint
- takeover/return-to-AI
- authenticated WebSocket
- presence
- call signaling

Remaining UX gap:
The admin chat screen still primarily refreshes by polling and the mobile UI does not yet expose a polished realtime delivered/seen indicator. Backend state support exists, but the complete UX needs a real-device pass.

## 10. WebRTC/call status

Source contains:
- call create/answer/reject/end lifecycle
- authorized signaling
- customer/admin scoping
- microphone permission paths
- consent record path
- recording upload endpoint with size limit
- transcription endpoint
- transcript/summary persistence paths

Not live-certified:
- STUN/TURN connectivity across different NATs
- Wi-Fi-to-4G and 4G-to-5G calls
- reconnect/network change behavior
- real microphone audio path
- actual automatic call recording capture

## 11. Tutorial / "Show me how" status

Source contains:
- updateable customer/admin tutorial assets
- signed/private storage path support
- first-open customer tutorial gate
- reopen "How to use"
- default guide configuration with UI test IDs

Remaining gap:
The requested fully interactive overlay that dynamically measures and highlights the live UI control is not fully implemented. Existing guide definitions and target IDs are present, but this should not be marked as a complete interactive-guidance implementation yet.

## 12. Android payment-evidence / Play distribution note

The Android native module uses `READ_SMS` and notification-listener access only through explicit device permissions/settings. Google Play treats SMS access as a sensitive/restricted permission and requires the use case to fit an allowed/approved category and to complete the applicable declaration/review process. For this project, the SMS-based financial-transactions use case must therefore be handled as a Play policy/release gate rather than assumed to be automatically publishable.

## 13. Major remaining production blockers

### P0 — must be completed before production certification

1. Clean production PostgreSQL instance + execute all migrations from a clean database.
2. Real Firebase project + Android Firebase configuration + phone OTP + Google admin identity test.
3. Real object storage bucket + private ACL policy + signed URL verification.
4. Real FCM configuration and physical notification tests.
5. Real AI/STT/TTS provider credentials and quota/error-path tests.
6. Real dealer UPI account and controlled real payment verification test.
7. Physical Android device tests for both apps.
8. Different-network WebRTC test including TURN.
9. Production domain/TLS/reverse proxy.
10. Backup/restore and monitoring.
11. Signed release build and Play/App Store compliance review.

### P1 — release-hardening items

1. Pin dependency versions and commit a lockfile. The repository still contains `latest`/`*` ranges. An offline/network-constrained lockfile generation attempt could not complete, so no versions were guessed.
2. Replace the process-local rate limiter with a shared store or gateway-backed limiter before multi-instance scaling.
3. Move WebSocket authentication away from the URL query parameter to a short-lived WebSocket ticket or authenticated handshake strategy.
4. Perform a real Android build of the new payment-evidence native module.
5. Implement actual automatic call recording capture only where consent/legal requirements are satisfied.
6. Complete realtime chat UI with immediate delivered/seen rendering instead of relying mainly on polling.
7. Complete the real interactive guided-overlay system for "Show me how".
8. Add token-refresh registration for FCM and verify Android 13+ notification permission behavior on the target devices.
9. Add production upload malware/content inspection appropriate to the chosen storage/deployment environment.

## 14. What was NOT changed

No package ID was changed.
No customer/admin separation was removed.
No working architecture was replaced with a different stack.
No Razorpay integration was added.
No developer unlock secret was moved into the mobile apps.
No localhost/10.0.2.2 URL is accepted for production builds.
No fake AI response was introduced as a production fallback.
No historical customer-location retention was expanded.

## 15. Verification evidence after fixes

- FINAL PREFLIGHT: PASS
- TypeScript/TSX syntax parse: 23 files scanned, 0 syntax errors
- Node script syntax checks: pass for migration runner, preflight, final certification, live certification
- Static final certification: PASS_STATIC_CERTIFICATION
- Live certification: SKIPPED_NO_API_URL (correctly not claimed as live)
- Dependency lockfile generation: not completed because dependency resolution could not complete in the available environment

## 16. Release decision

The patched source is **autopsy-hardened and statically verified**, but it is **not yet a live production-certified release**. The remaining P0 items are external infrastructure/device/service validation gates, not evidence to justify declaring the system fully live.

The fixed ZIP is the correct working baseline for the next phase: real environment setup followed by end-to-end certification.
