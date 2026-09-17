-- Production DB hardening: indexes, session hygiene, and order/payment integrity.
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS payment_submissions_utr_idx ON payment_submissions(utr);
CREATE INDEX IF NOT EXISTS orders_customer_created_idx ON orders(customer_id, created_at DESC);

-- Prevent negative discounts at the database layer and prevent a discount larger than price.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_discount_not_above_price;
ALTER TABLE products ADD CONSTRAINT products_discount_not_above_price CHECK (discount_paise <= price_paise);

-- A payment submission can only exist for an order using UPI.
CREATE OR REPLACE FUNCTION enforce_payment_submission_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id AND payment_mode = 'UPI') THEN
    RAISE EXCEPTION 'PAYMENT_SUBMISSION_REQUIRES_UPI_ORDER';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_submission_mode_guard ON payment_submissions;
CREATE TRIGGER payment_submission_mode_guard
BEFORE INSERT OR UPDATE ON payment_submissions
FOR EACH ROW EXECUTE FUNCTION enforce_payment_submission_mode();
