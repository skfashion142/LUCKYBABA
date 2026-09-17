
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_e164 TEXT NOT NULL UNIQUE,
  mobile_verified_at TIMESTAMPTZ,
  name TEXT,
  dob DATE,
  age_verified BOOLEAN NOT NULL DEFAULT FALSE,
  notification_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_accounts(id) ON DELETE CASCADE,
  token_jti UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((customer_id IS NOT NULL) <> (admin_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  media_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('PLACED','CONFIRMED','READY_FOR_PICKUP','PICKUP_VERIFICATION','PICKED_UP','CUSTOMER_COMPLETED','COMPLETED','CANCELLED')),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('UPI','COD')),
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','SUBMITTED','VERIFIED','REJECTED')),
  processing_started_at TIMESTAMPTZ,
  processing_deadline_at TIMESTAMPTZ,
  pickup_location_released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pickup_session_started_at TIMESTAMPTZ,
  pickup_session_ended_at TIMESTAMPTZ,
  pickup_verification_code_hash TEXT,
  pickup_verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise BIGINT NOT NULL CHECK (line_total_paise >= 0)
);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  upi_id TEXT NOT NULL,
  amount_paise BIGINT NOT NULL,
  utr TEXT NOT NULL,
  screenshot_object_key TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES admin_accounts(id),
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS pickup_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  video_object_key TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_locations_order_time ON order_locations(order_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to TEXT NOT NULL DEFAULT 'AI' CHECK (assigned_to IN ('AI','ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER','AI','ADMIN')),
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages(conversation_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS presence (
  customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')) ,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_devices_customer ON customer_devices(customer_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  interval_days INTEGER NOT NULL DEFAULT 3 CHECK (interval_days BETWEEN 3 AND 4),
  last_sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('CUSTOMER','ADMIN','AI')),
  mode TEXT NOT NULL DEFAULT 'IN_APP' CHECK (mode IN ('IN_APP','AI_VOICE')),
  status TEXT NOT NULL DEFAULT 'RINGING' CHECK (status IN ('RINGING','ACTIVE','ENDED','REJECTED','MISSED','FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  recording_object_key TEXT,
  recording_mime_type TEXT,
  recording_size_bytes BIGINT,
  transcript_object_key TEXT,
  transcript TEXT,
  summary TEXT,
  consent_recorded_at TIMESTAMPTZ,
  consent_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calls_customer_time ON calls(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_status ON calls(status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS order_locations_customer_time ON order_locations(customer_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS orders_active_pickup ON orders(customer_id, status) WHERE status IN ('READY_FOR_PICKUP','PICKUP_VERIFICATION','PICKED_UP');

-- Phase 6: AI chat, admin takeover, delivery/read state, and conversation audit.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_admin_message_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS conversations_customer_updated ON conversations(customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;

-- Phase 7: Real AI Voice (STT/TTS). Raw audio is never persisted here — this
-- table stores only session/provider metadata for audit and per-customer
-- ownership checks. 'VOICE_ASK' is reserved for a future single-call combined
-- endpoint; Phase 7 records 'STT' and 'TTS' rows from the two discrete routes.
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('STT','TTS','VOICE_ASK')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_sessions_customer_time ON voice_sessions(customer_id, created_at DESC);

-- Phase 8: device registration, in-app call lifecycle, consent, recordings and notifications.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS initiated_by TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'IN_APP';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RINGING';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_mime_type TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_size_bytes BIGINT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS calls_customer_time ON calls(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_status ON calls(status, created_at DESC);

ALTER TABLE calls ALTER COLUMN started_at SET DEFAULT now();

-- Phase 9: dynamic UPI configuration, controlled UPI-change policy, tutorials and guide content.
CREATE TABLE IF NOT EXISTS app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  upi_id TEXT,
  upi_changed_at TIMESTAMPTZ,
  updated_by UUID REFERENCES admin_accounts(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS upi_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id),
  old_upi_id TEXT,
  requested_upi_id TEXT NOT NULL,
  fee_paise BIGINT NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAYMENT_SUBMITTED','APPROVED','REJECTED','CANCELLED')),
  utr TEXT,
  screenshot_object_key TEXT,
  payment_submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS upi_change_requests_admin_time ON upi_change_requests(admin_id, created_at DESC);
-- Keep only the newest pending request if an older deployment created duplicates before
-- this uniqueness guard existed; then enforce one active pending request per admin.
WITH ranked_pending AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY admin_id ORDER BY created_at DESC, id DESC) AS rn
  FROM upi_change_requests
  WHERE status = 'PENDING'
)
UPDATE upi_change_requests r
SET status = 'CANCELLED', rejection_reason = COALESCE(rejection_reason, 'Superseded during migration')
FROM ranked_pending x
WHERE r.id = x.id AND x.rn > 1;
CREATE UNIQUE INDEX IF NOT EXISTS upi_change_requests_one_pending_admin ON upi_change_requests(admin_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS tutorial_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('CUSTOMER','ADMIN')),
  title TEXT NOT NULL,
  video_object_key TEXT,
  video_url TEXT,
  voice_explanation TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (video_object_key IS NOT NULL OR video_url IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS tutorial_assets_active_audience ON tutorial_assets(audience) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS guide_configs (
  audience TEXT PRIMARY KEY CHECK (audience IN ('CUSTOMER','ADMIN')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES admin_accounts(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A controlled, auditable developer-unlock path for fee-based early UPI changes.
-- Legacy payment-submission columns remain additive for migration compatibility and are not required by the unlock flow.
CREATE TABLE IF NOT EXISTS developer_change_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES upi_change_requests(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- Phase 10.1: payment evidence from the dealer-owned Android device.
-- Evidence may originate from an SMS transaction message or a UPI-app notification.
-- The backend never treats a screenshot alone as proof.
CREATE TABLE IF NOT EXISTS payment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id UUID NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('SMS','UPI_NOTIFICATION')),
  utr TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  payee_upi_id TEXT,
  occurred_at TIMESTAMPTZ,
  raw_reference TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_evidence_submission ON payment_evidence(payment_submission_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_evidence_source_ref ON payment_evidence(payment_submission_id, source, utr);

-- Phase 10: production hardening, persistent sessions, cart/checkout, admin catalog,
-- payment-mode controls, call participant scoping, and safe idempotency.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS sessions_active_jti ON sessions(token_jti) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty > 0 AND qty <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS cart_items_customer ON cart_items(customer_id, updated_at DESC);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_longitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_accuracy_m DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_checkout_key
  ON orders(customer_id, checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS upi_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS cod_enabled BOOLEAN NOT NULL DEFAULT TRUE;
INSERT INTO app_settings(id,upi_enabled,cod_enabled) VALUES(TRUE,TRUE,TRUE)
  ON CONFLICT(id) DO NOTHING;

ALTER TABLE calls ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES admin_accounts(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS calls_assigned_admin ON calls(assigned_admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS products_published_created ON products(published, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_published ON products(category_id, published, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);


-- Phase 10.2: device-key attestation for payment evidence collected on the dealer device.
CREATE TABLE IF NOT EXISTS admin_evidence_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  public_key_base64 TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_id,key_id)
);
CREATE TABLE IF NOT EXISTS admin_evidence_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_evidence_challenges_active ON admin_evidence_challenges(admin_id,expires_at) WHERE used=false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_upi_id TEXT;

CREATE INDEX IF NOT EXISTS sessions_active_principal ON sessions(customer_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS sessions_active_admin ON sessions(admin_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_customer_created ON notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread ON notifications(customer_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_devices_customer_active ON customer_devices(customer_id, notifications_enabled, marketing_enabled);
CREATE UNIQUE INDEX IF NOT EXISTS customer_devices_fcm_unique ON customer_devices(fcm_token);


-- Autopsy 005 additions
CREATE TABLE IF NOT EXISTS admin_devices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE, fcm_token TEXT NOT NULL UNIQUE, platform TEXT NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')), notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE, last_seen_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS admin_devices_admin_active ON admin_devices(admin_id, notifications_enabled);
ALTER TABLE ai_campaign_settings ADD COLUMN IF NOT EXISTS last_sent_product_id UUID REFERENCES products(id);
