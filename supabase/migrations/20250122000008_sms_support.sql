-- =====================================================================
-- SMS NOTIFICATIONS SUPPORT
-- =====================================================================
-- Erweitert das Notification-System um SMS-Unterstützung
-- =====================================================================

-- Erweitere notification_logs.type um 'sms'
-- (Die Tabelle hat bereits ein CHECK constraint auf type)

-- Drop existing constraint
ALTER TABLE notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_type_check;

-- Recreate mit SMS
ALTER TABLE notification_logs
  ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN ('email', 'sms', 'push'));

-- Füge SMS-spezifische Felder hinzu
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_segments INTEGER, -- Anzahl SMS-Teile (> 160 chars)
  ADD COLUMN IF NOT EXISTS sms_provider TEXT; -- z.B. 'twilio', 'vonage'

-- Index für Phone-Suche
CREATE INDEX IF NOT EXISTS idx_notification_logs_phone
  ON notification_logs(recipient_phone)
  WHERE type = 'sms';

-- =====================================================================
-- SMS TEMPLATES (ähnlich wie Email Templates)
-- =====================================================================

CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Template Details
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- z.B. 'booking_confirmation', 'reminder'
  description TEXT,

  -- Content (max 160 chars für standard SMS)
  message_template TEXT NOT NULL,

  -- Variables (JSON Array)
  -- z.B. ["customer_name", "service_name", "date", "time"]
  variables JSONB DEFAULT '[]'::JSONB,

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(salon_id, slug),
  CHECK (length(message_template) <= 480) -- Max 3 SMS segments
);

CREATE INDEX idx_sms_templates_salon ON sms_templates(salon_id, active);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_templates_select" ON sms_templates
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "sms_templates_insert" ON sms_templates
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "sms_templates_update" ON sms_templates
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "sms_templates_delete" ON sms_templates
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE sms_templates IS 'SMS-Vorlagen für automatisierte Benachrichtigungen';
COMMENT ON COLUMN sms_templates.message_template IS 'SMS-Text mit Platzhaltern (max 480 chars = 3 SMS)';
COMMENT ON COLUMN sms_templates.variables IS 'JSON Array von verfügbaren Variablen';
