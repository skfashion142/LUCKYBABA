# Commerce Pickup Platform — Real Working Build

Two separate native apps share one backend:
- `apps/customer` — customer-facing app
- `apps/admin` — dealer/admin app
- `backend` — Node.js + PostgreSQL API
- `modules/payment-evidence` — Android native evidence collector using explicit SMS/notification access

## Target stack

Expo SDK 57 / React Native 0.86.x, Node 22.13+, PostgreSQL. Expo SDK 57 targets Android API 36 and iOS 16.4+ in the current Expo documentation. The apps use a development/release native build; push notifications and native WebRTC are not Expo Go-only features.

## Important real-provider configuration

The project is intentionally **not fake**. It will refuse to pretend that OTP, Firebase identity, AI, object storage, push or payment verification are successful when the corresponding provider is not configured.

Required production configuration includes:
- PostgreSQL connection + versioned migrations
- Firebase Admin service account (`FIREBASE_SERVICE_ACCOUNT_JSON`) on the backend only
- long random `JWT_SECRET`
- Firebase Admin service account
- Firebase client config for phone auth / Google sign-in
- AI-compatible chat/STT/TTS provider
- S3-compatible storage
- FCM/APNs setup
- `UPI_ID` initial fallback (Admin can later manage it)
- `DEVELOPER_EARLY_UPI_KEY` only on the backend secret store

## Build

1. Copy `.env.example` files and configure the backend.
2. Run `npm install` at root. Local workspace packages use `file:` references so npm can resolve them without Yarn/PNPM-only `workspace:*` URLs.
3. Run `npm run backend:migrate` to apply versioned PostgreSQL migrations. The migration runner uses a PostgreSQL advisory lock so two deploys cannot migrate concurrently.
4. Configure Firebase client files/secrets required by the mobile apps.
5. Run `npx expo prebuild`/native builds from each app. The payment-evidence local module is included in the app workspace.
6. Use a development/release native build on physical Android/iOS devices for full feature testing.

## Current verification state

This bundle contains the integrated Customer App, Dealer/Admin App, backend, database schema, Android payment-evidence module, build configuration and final preflight checks. The repository has been frozen at source level before the consolidated release test. This container does not have Android SDK/Xcode, PostgreSQL, Firebase credentials, an AI provider account or a real UPI merchant account, so a signed APK and production-provider certification cannot be truthfully marked as built here. Run the consolidated matrix in `docs/FINAL_TEST_MATRIX.md` on the target services/devices before production release.

## Mobile Firebase files
Customer/admin builds require your real Firebase project configuration. Do not put service-account JSON, FCM private keys or the developer UPI unlock key into the mobile projects. Keep those server-side.

## Step 3
Customer app integration hardening and session/pickup continuity: see `docs/STEP3_CUSTOMER_APP_INTEGRATION.md`.


## Step 4
Admin App real backend integration and server-session boot validation: see `docs/STEP4_ADMIN_APP_INTEGRATION.md`.


## Step 7/8 hardening
Notifications, tutorial delivery, AI campaign scheduling, audit-log access, session hardening and final static certification are included. Run `npm run final:certify`.
