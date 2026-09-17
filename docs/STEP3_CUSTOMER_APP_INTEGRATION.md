# Step 3 — Customer App Real Backend Integration

## Scope
Customer mobile app is wired to the Step 2 backend using the existing authenticated API surface. This step hardens session restoration/logout, customer payment-mode discovery, and pickup location continuity without replacing existing working features.

## Implemented
- Secure customer session restore via `GET /v1/auth/session` before entering the app.
- Invalid/expired session token is cleared locally and Firebase customer auth is signed out.
- Logout now clears both the backend session token and Firebase auth state.
- Push registration runs only after a verified backend customer session and only registers a non-empty FCM token.
- Checkout reads dealer-controlled payment modes from `GET /v1/customer/payment-modes` and hides disabled modes.
- Existing checkout still sends a server-validated idempotency key and current foreground location.
- Pickup screen restores an already-started pickup location session after reopening the order.
- Pickup verification no longer ends location sharing; the server ends it only when the customer completes the order.
- Customer location watcher is cleaned up on screen exit and after order completion.
- Existing OTP/Firebase authentication, catalog, cart, payment submission, AI, voice, calls, tutorial, notifications, and pickup APIs are preserved.

## Runtime activation
From the repository root:

```bash
npm install
npm run backend:migrate
npm run backend:build
npm run customer:android
```

Set `apps/customer/.env` (or the Expo public environment) with a reachable `EXPO_PUBLIC_API_BASE_URL`. For a physical Android device, use the PC's LAN address rather than `10.0.2.2`.

Firebase native configuration is still required for real phone OTP: Android `google-services.json` and iOS Firebase configuration must be supplied through the normal Expo/native Firebase setup. The backend also needs `FIREBASE_SERVICE_ACCOUNT_JSON` for production ID-token verification.

## Certification boundary
Static/source checks were performed in this environment. A live end-to-end PASS is **not** claimed because this build environment has no live PostgreSQL/Firebase credentials and no Android/iOS device runtime. Final certification requires a real device plus configured backend providers.
