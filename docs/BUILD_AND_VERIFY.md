# Build + Verification Gate

## Customer production path
1. Phone number -> Firebase phone verification -> backend `/v1/auth/customer/verify` with Firebase ID token.
2. DOB is collected and server-enforced at 21+.
3. Catalog -> product -> cart -> checkout.
4. Location permission is requested only when required by ordering/pickup.
5. UPI QR uses the current server UPI and exact order amount.
6. Customer uploads screenshot and submits UTR.
7. Admin device evidence collector supplies a matching SMS or UPI notification record; backend requires UTR + amount + current payee UPI match.
8. Confirmed payment starts the 15-minute processing window.
9. Admin releases pickup. Customer starts active location session.
10. Pickup verification + completion closes location sharing.

## Admin payment evidence
The admin device has an explicit opt-in permission screen. SMS access and notification-listener access are never silently requested. The Android collector filters payment-like records locally and returns only structured evidence needed for verification.

The backend has device-key attestation endpoints. Evidence payloads are signed by an Android Keystore RSA key; the server verifies the signature before evaluating the UTR/amount/payee match. This protects the evidence path from simple API spoofing.

## Performance target
The app prioritizes native-driver transforms, stable list rows, bounded render windows and low React rerender pressure. “1000 touch pointer” is not a literal guarantee; the actual device input pipeline and refresh rate define the ceiling. The app targets 60 FPS and takes advantage of 120 Hz devices where the platform supports it.

## Source preflight
Run `node scripts/final-preflight.mjs` from the repository root before installing mobile/native dependencies. This is a static/source gate, not a device or production-provider certification.
