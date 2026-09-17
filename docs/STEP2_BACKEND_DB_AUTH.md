# Step 2 — Production Backend + PostgreSQL + Authentication

## Implemented
- Versioned PostgreSQL migrations under `backend/migrations/`.
- Migration runner with PostgreSQL advisory transaction lock.
- Idempotent migration tracking in `schema_migrations`.
- Database hardening indexes and payment-submission/order-mode guard.
- `/health` liveness and `/ready` readiness endpoint.
- Production JWT requirements: DB-backed sessions cannot be disabled in production and JWT secret must be at least 32 characters.
- Firebase Admin ID-token verification for customer phone identity and authorized admin identity.
- Server-side Firebase credentials separated as `FIREBASE_SERVICE_ACCOUNT_JSON`; legacy FCM credential variable remains accepted for compatibility.
- Existing customer/admin authorization, session revocation and role separation preserved.

## Real-provider boundary
The source is wired for real Firebase and PostgreSQL, but this build environment has no PostgreSQL service and no Firebase project credentials. Therefore no live provider PASS is claimed here.

## Target activation
1. Configure `backend/.env` with `DATABASE_URL`, a random `JWT_SECRET`, `AUTHORIZED_ADMIN_GMAIL`, and `FIREBASE_SERVICE_ACCOUNT_JSON`.
2. Run `npm install`.
3. Run `npm run backend:migrate`.
4. Run `npm run backend:build`.
5. Start with `npm --prefix backend run dev` (development) or `npm --prefix backend start` (production).
6. Verify `/health` and `/ready` from the target machine.
7. Configure the mobile Firebase client project for the same Firebase project and build a native development/release client; Expo Go is not the certification target for native Firebase/WebRTC/payment modules.
