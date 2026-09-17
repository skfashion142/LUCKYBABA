# Final Phase 10 Completion / Integration Report

## Included in the current source release
- Complete Expo/React Native Customer App project tree under `apps/customer`.
- Complete Expo/React Native Dealer/Admin App project tree under `apps/admin`.
- Shared mobile package under `packages/mobile-core` with 3D-style startup and native-driver press animation primitives.
- Node.js/TypeScript backend under `backend` with PostgreSQL schema.
- Android `payment-evidence` native module with explicit SMS permission and notification-listener access, local payment evidence parsing, Android Keystore signing and server attestation.
- Catalog/category management, product media upload, product edit/hide/delete, cart, idempotent checkout, UPI/COD, order state machine, pickup release, live pickup location, pickup verification and completion.
- Private customer-to-AI/customer-to-authorized-admin chat, presence/read/delivery events, AI STT/TTS path and WebRTC call signaling/lifecycle.
- Admin payment review with protected screenshot URL and signed device-evidence verification.
- Correct UPI early-change policy: free change once per 90-day window; earlier change uses a ₹799 developer-unlock policy and does not ask the dealer to pay the current customer-payment UPI.
- Order-scoped UPI snapshot so a customer order continues to reference the UPI presented when that order was created, even if the dealer later changes the active UPI.
- Payment Done starts a 15-minute verification/preparation window. Expired unpaid/submitted UPI orders release reserved stock and cancel safely. Manual payment rejection also restores reserved stock and cancels the order.
- Pickup settings, customer/admin tutorials, notification broadcasts and customer push-token registration.

## Payment evidence behavior
The customer submits UTR plus a payment screenshot. The screenshot alone never auto-verifies payment.

On the dealer's Android device, after explicit permission/access, the app can use either:
1. relevant SMS payment evidence, or
2. UPI-app notification evidence.

The evidence is parsed locally and signed with an Android Keystore key. The backend validates the signature and deterministically compares the supplied UTR and amount, with payee UPI matched when the source exposes it. Missing or conflicting evidence remains manual review.

## Platform constraint
A normal third-party Android app cannot directly open another UPI app's private transaction history. The supported evidence path is dealer SMS access and/or Android Notification Listener access. iOS does not provide equivalent arbitrary access to another app's SMS/private notification history, so iOS needs the manual-review fallback or a supported payment-provider/bank integration.

## Verification status
- Source structure/preflight: PASS.
- All 22 TypeScript/TSX source files parse with zero syntax diagnostics in this container.
- JSON configuration files parse successfully.
- Secret isolation scan passed; developer unlock secret is not embedded in mobile source/build config.
- No remaining Yarn/PNPM-only `workspace:*` dependency strings; mobile workspace dependencies use npm-compatible local `file:` references.
- Signed APK/IPA and real-provider/device certification are NOT claimed here because this container has no Android SDK/Gradle/ADB, no Xcode/macOS, no real PostgreSQL instance, Firebase project credentials, AI provider credentials, object storage, push credentials, or UPI merchant account.

The source is therefore an integrated build-ready project, not a device-certified binary. The final release gate is the consolidated matrix in `docs/FINAL_TEST_MATRIX.md`.
