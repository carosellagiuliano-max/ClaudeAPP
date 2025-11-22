-- Stripe Events Table
-- Infrastructure: Webhook event idempotency tracking

-- ============================================================================
-- STRIPE EVENTS
-- ============================================================================

-- Create stripe_events table for idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast event_id lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id
ON stripe_events(event_id);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_stripe_events_type
ON stripe_events(event_type, processed_at DESC);

-- Comments
COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN stripe_events.event_id IS 'Stripe event ID (evt_xxx)';
COMMENT ON COLUMN stripe_events.event_type IS 'Stripe event type (e.g., payment_intent.succeeded)';
COMMENT ON COLUMN stripe_events.processed_at IS 'When the event was successfully processed';

-- No RLS needed (internal table, accessed via service role)

-- ============================================================================
-- NOTIFICATION LOGS (if not exists from previous migrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),

  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  recipient_email TEXT,
  recipient_phone TEXT,

  subject TEXT,
  body TEXT,

  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),

  provider TEXT, -- 'resend', 'twilio', etc.
  provider_id TEXT, -- External provider's message ID

  error_message TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_salon
ON notification_logs(salon_id, created_at DESC)
WHERE salon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
ON notification_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_email
ON notification_logs(recipient_email, created_at DESC)
WHERE recipient_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_type
ON notification_logs(type, created_at DESC);

-- Comments
COMMENT ON TABLE notification_logs IS 'Tracks all outbound notifications (email, SMS, push)';
COMMENT ON COLUMN notification_logs.provider_id IS 'External provider message ID for tracking';

-- RLS (salon-scoped)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon staff can view notification logs"
ON notification_logs
FOR SELECT
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
  )
);

-- ============================================================================
-- CRON JOB TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),

  records_processed INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for job monitoring
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_name
ON cron_job_runs(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_status
ON cron_job_runs(status, started_at DESC);

-- Comments
COMMENT ON TABLE cron_job_runs IS 'Tracks cron job executions and status';
COMMENT ON COLUMN cron_job_runs.records_processed IS 'Number of records processed by this job run';

-- No RLS (internal table)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up old logs (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete notification logs older than 90 days
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete stripe events older than 90 days
  DELETE FROM stripe_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete cron job runs older than 30 days (except failures)
  DELETE FROM cron_job_runs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status != 'failed';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_logs IS 'Deletes old logs to prevent table bloat (run monthly via cron)';
