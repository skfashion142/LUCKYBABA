# Post-Autopsy Status — 2026-09-17

The repository has undergone a full source/config/schema/security autopsy and targeted hardening pass. See `AUTOPSY_REPORT.md`. Static verification passed; live production certification remains pending external infrastructure/device tests.

# Real Build Status — 2026-09-17

The current release is the integrated source bundle for two separate native apps plus one backend.

## Customer App
- Firebase phone OTP path and 21+ DOB enforcement
- Catalog/categories/search/product details/media
- Persistent cart and idempotent checkout
- Location-required ordering and active pickup location sharing
- UPI QR/deep-link using order-scoped dealer UPI and exact amount
- UTR + screenshot payment submission
- Order history/status and pickup completion
- AI chat and provider-backed STT/TTS
- Customer-to-dealer support call lifecycle
- Push-token registration and tutorial gate
- 3D-style startup and native-driver touch interaction

## Dealer/Admin App
- Authorized Google/Firebase identity path
- Product/category create/edit/hide/delete and image/video media
- Orders, payment review, pickup release/verification/completion and live location
- SMS/UPI notification evidence permission screen and attested evidence flow
- Customer chat with AI takeover/return
- Incoming support calls and call history/transcripts
- UPI settings with 90-day rule + developer unlock policy
- Payment mode settings
- Pickup location/instruction video settings
- Customer/admin tutorial configuration
- Broadcast notifications

## Backend
- PostgreSQL schema with order/payment/pickup/chat/call/audit tables
- Session-scoped JWT authentication and revocation checks
- Idempotent checkout and stock reservation/release
- Deterministic payment evidence verification
- Secure object storage presign/download paths
- AI chat/STT/TTS provider adapters
- WebSocket realtime authorization
- CORS allowlist, rate limiting, timeout/size controls
- Persistent audit logging

## What is not falsely certified
A signed APK/IPA, physical-device performance result, live Firebase/AI/S3/FCM/APNs behavior, real UPI transaction verification, PostgreSQL runtime, and end-to-end WebRTC audio have not been certified in this container because the required external accounts/services/devices/toolchains are not present.
