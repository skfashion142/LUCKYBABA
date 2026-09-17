# Phase 9 — Dynamic UPI, tutorials and interactive guidance

## UPI policy
- The authorized dealer/admin enters the store UPI ID from the Admin App.
- A normal UPI change is allowed once per 90 days.
- If a change is requested before 90 days, the backend creates an early-change request with a fixed fee of ₹799.
- The early fee is paid to the currently active UPI using the existing manual UPI flow (UTR + screenshot).
- Early changes remain `PAYMENT_SUBMITTED` until the protected developer review endpoint approves them.
- The developer approval secret is a server environment variable (`DEVELOPER_CHANGE_KEY`) and is never exposed to the dealer app, API responses, logs, or mobile source.
- The backend uses a timing-safe comparison for the protected review key.
- No claim is made that a UTR/screenshot proves payment automatically; human/developer review is required.

## Tutorials
- Separate CUSTOMER and ADMIN tutorial records.
- Active version can be replaced without rebuilding the apps.
- Tutorial metadata and audit trail are persisted.

## Interactive guidance
- Customer and Admin guides have real UI target IDs.
- The app can highlight the target control and step through the guide.
- Guide content is fetched from the backend so it can evolve without an app rebuild.

## Production requirements
- Set `DEVELOPER_CHANGE_KEY` only in the server secret manager/environment.
- Configure object storage if tutorial videos are stored as objects.
- The early-change payment still requires independent payment verification.
