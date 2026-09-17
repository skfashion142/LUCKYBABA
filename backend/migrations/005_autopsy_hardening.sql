-- Autopsy hardening: admin push registration and new-product campaign deduplication.
CREATE TABLE IF NOT EXISTS admin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_devices_admin_active ON admin_devices(admin_id, notifications_enabled);
ALTER TABLE ai_campaign_settings ADD COLUMN IF NOT EXISTS last_sent_product_id UUID REFERENCES products(id);
