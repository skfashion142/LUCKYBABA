-- Step 6: payment + pickup lifecycle hardening.
-- UTRs are transaction references and must not be reusable across orders.
CREATE UNIQUE INDEX IF NOT EXISTS payment_submissions_utr_unique_ci
  ON payment_submissions (lower(utr));

CREATE INDEX IF NOT EXISTS orders_processing_deadline_idx
  ON orders (processing_deadline_at)
  WHERE processing_deadline_at IS NOT NULL;

-- A pickup location may only be released after the server-side 15-minute
-- processing window has elapsed. The API enforces the transition; these
-- indexes support the time-based query efficiently.
CREATE INDEX IF NOT EXISTS orders_pickup_release_idx
  ON orders (status, processing_deadline_at, pickup_location_released_at);
