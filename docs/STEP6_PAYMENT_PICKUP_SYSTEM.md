# Step 6 — Real Payment + Pickup System

## Implemented
- Server-derived order total is used for UPI payment intent/QR.
- Dealer UPI is snapshotted onto the order so later UPI changes do not alter an existing order's payee.
- Customer submits UTR + payment screenshot; screenshot alone never verifies payment.
- Admin device evidence requires a registered device, signed challenge and deterministic UTR/amount/payee matching.
- Evidence mismatch remains manual-review state.
- UTR is now globally unique (case-insensitive) to prevent transaction-reference reuse.
- Successful UPI evidence verification starts the 15-minute processing window.
- COD orders also receive a 15-minute processing window from confirmation.
- Pickup location release is server-gated until payment is verified and the processing deadline has elapsed.
- Pickup verification cannot start until the pickup location has been released and the applicable payment is verified.
- Customer pickup endpoint exposes processing start/deadline state.
- Customer live location can only be written during the explicit pickup session.
- Customer completion closes the pickup location session.
- Rejected UPI payments cancel the order and restore reserved stock.

## Important deployment rule
The backend must run with a real PostgreSQL database. The source package is not a payment certification by itself. Real UPI transaction evidence, Android notification/SMS permissions, Firebase, storage and physical-device tests are required before production certification.
