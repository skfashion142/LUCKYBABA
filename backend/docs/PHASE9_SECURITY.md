# Phase 9 security notes

- The early UPI-change path uses a **server-side developer unlock key**.
- The dealer/admin app displays only “Developer se early-change unlock key lo”; the key is never hard-coded, returned by an API, written to the database, or included in the release archive.
- The ₹799 early-change charge is a policy gate tied to the developer unlock flow; it is **not** paid through the dealer's current customer-payment UPI, so no UTR/screenshot flow is used for this admin setting change.
- The **current active dealer UPI** remains the destination for normal customer UPI payments and order QR payloads.
- Unlock attempts are authenticated, rate limited and compared with a timing-safe check. Failed attempts do not reveal whether the key is close to correct.
- Successful early change runs in a PostgreSQL transaction protected by an advisory lock, updates the active UPI and resets the 90-day window atomically.
- The supplied unlock key is intentionally excluded from audit metadata and logs.
