# Final Test Matrix — one consolidated test run

This project is intended to be tested as one integrated system after development is frozen.

## Customer
- Firebase phone OTP / one-number account
- 21+ server enforcement
- catalog/categories/search/details/media
- cart and idempotent checkout
- location permission and location-required ordering
- UPI QR with order-amount snapshot
- UTR + screenshot submission
- COD flow
- order status history
- pickup release, location start/stop, live location, verification code, completion
- AI chat with real catalog/order context
- AI STT/TTS
- human support call and consent flow
- notifications/marketing consent
- tutorial + guidance

## Admin
- authorized Gmail only
- product/category create/edit/hide/delete, images/videos
- orders and pickup transitions
- customer presence/chat takeover/return AI
- incoming support calls
- payment screenshot review
- Android SMS/UPI-notification evidence permission
- signed device evidence + UTR/amount/payee verification
- manual review/reject + stock restoration
- UPI settings and 90-day/early unlock rule
- pickup settings
- tutorials
- broadcasts
- audit/security logs

## Infrastructure
- PostgreSQL schema/migrations on a clean database
- API auth/session revocation
- CORS allowlist
- rate limits and timeouts
- object storage upload/download URLs
- AI provider error paths
- FCM/APNs
- WebSocket auth and scoped call signaling
- Android native payment evidence module

## Performance
- cold start/splash
- 60 FPS baseline and 120 Hz device behavior where supported
- scroll/list performance with large catalogs
- network retry/error UX
- memory/background/resume
- battery impact during pickup location tracking

## Release gate
No final PASS is issued until real Android/iOS devices, real PostgreSQL, Firebase, AI provider, object storage, push services, and a real UPI merchant flow have all been exercised end-to-end.
