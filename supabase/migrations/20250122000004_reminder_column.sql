-- Add reminder tracking to appointments
-- Infrastructure: Email reminder system

-- ============================================================================
-- APPOINTMENTS - Add reminder tracking
-- ============================================================================

-- Add column for tracking when reminder was sent
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Index for finding appointments needing reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_pending
ON appointments(starts_at, reminder_sent_at)
WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Comments
COMMENT ON COLUMN appointments.reminder_sent_at IS 'When the 24-hour reminder email was sent to the customer';

-- ============================================================================
-- SALON SETTINGS - Add reminder configuration (if not exists)
-- ============================================================================

-- These columns should already exist from previous migration
-- Adding here as a safety check with IF NOT EXISTS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salon_settings' AND column_name = 'send_reminders'
  ) THEN
    ALTER TABLE salon_settings ADD COLUMN send_reminders BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salon_settings' AND column_name = 'reminder_hours_before'
  ) THEN
    ALTER TABLE salon_settings ADD COLUMN reminder_hours_before INT DEFAULT 24;
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN salon_settings.send_reminders IS 'Whether to send appointment reminder emails';
COMMENT ON COLUMN salon_settings.reminder_hours_before IS 'How many hours before appointment to send reminder (default: 24)';
