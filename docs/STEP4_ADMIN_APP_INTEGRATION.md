# Step 4 — Admin App Real Backend Integration

## Scope
The dealer/admin mobile app is integrated against the authenticated backend and preserves the existing admin features.

## Hardened in Step 4
- Server-side `/v1/auth/session` is checked on every app boot before treating a cached token as authenticated.
- Only an active `ADMIN` session can enter the dealer console.
- Invalid/expired/revoked sessions are cleared locally.
- Logout revokes the backend session and signs out Firebase before local token removal.
- Existing admin flows remain backend-driven: products/categories, orders/pickup, payment review/evidence, chat takeover, calls, broadcasts, UPI/payment modes, pickup settings and tutorials.
- Payment evidence remains explicit-permission based; screenshot alone is not treated as genuine payment proof.

## Live certification boundary
Source-level integration can be audited here, but real Firebase/Google sign-in, PostgreSQL, object storage, FCM, payment evidence, WebRTC and physical Android/iOS device behavior require the real provider credentials and devices. No live production PASS is claimed without those tests.
