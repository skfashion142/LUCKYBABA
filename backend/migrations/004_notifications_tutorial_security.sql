-- Step 7/8 hardening
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS sessions_active_principal ON sessions(customer_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS sessions_active_admin ON sessions(admin_id, expires_at DESC) WHERE revoked_at IS NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE broadcast_campaigns ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS notifications_customer_created ON notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread ON notifications(customer_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_devices_customer_active ON customer_devices(customer_id, notifications_enabled, marketing_enabled);
WITH ranked AS (SELECT id,ROW_NUMBER() OVER (PARTITION BY fcm_token ORDER BY updated_at DESC,id DESC) rn FROM customer_devices) DELETE FROM customer_devices d USING ranked r WHERE d.id=r.id AND r.rn>1;
CREATE UNIQUE INDEX IF NOT EXISTS customer_devices_fcm_unique ON customer_devices(fcm_token);
