# Phase 9 API

## Customer
- `GET /v1/customer/payment-settings` — returns the current active dealer UPI.
- `GET /v1/customer/orders/:orderId/payment-qr` — authenticated order-scoped UPI payment payload with the exact order amount; the mobile app renders the returned `upiUri` as a QR.
- `GET /v1/tutorials/CUSTOMER` — active customer tutorial.
- `GET /v1/guides/CUSTOMER` — customer interactive guide.

## Admin
- `GET /v1/admin/payment-settings` — current UPI + next free-change time + ₹799 early-change policy.
- `POST /v1/admin/payment-settings/upi/change` `{upiId}` — changes immediately only when the 90-day window is satisfied; otherwise creates/returns a pending early-change request.
- `POST /v1/admin/payment-settings/upi/change/:requestId/unlock` — authenticated dealer request; send the unlock key in `X-Developer-Early-UPI-Key` header. The server-side secret is never returned or stored. Successful unlock atomically changes the UPI and resets the 90-day window.
- `GET /v1/admin/payment-settings/upi/change-requests` — dealer-visible request status without any unlock key material.
- `POST /v1/admin/tutorials`
- `POST /v1/admin/guides/:audience`

### Important UPI distinction
The dealer's **active UPI is the customer payment destination**. Customer order QR/deep-link generation uses that active UPI and the exact order amount. The ₹799 early-change policy is an administrative unlock gate and does **not** use the dealer's customer-payment UPI, UTR or screenshot flow.


### Payment evidence (Phase 10)
- `POST /v1/admin/payment-evidence/device/register` registers the dealer-device public key.
- `POST /v1/admin/payment-evidence/device/challenge` creates a short-lived one-use nonce.
- `POST /v1/admin/payments/:orderId/evidence` accepts only a signed evidence record and then performs UTR + amount + payee-UPI matching.
