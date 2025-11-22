-- =====================================================================
-- WAITLIST FEATURE
-- =====================================================================
-- Warteliste für ausgebuchte Termine
-- Features:
-- - Kunden können sich eintragen wenn kein Termin frei ist
-- - Benachrichtigung bei Verfügbarkeit (Storno, neue Slots)
-- - Auto-expire nach X Tagen
-- - Priorität nach Eintragungsdatum
-- =====================================================================

CREATE TYPE waitlist_status AS ENUM (
  'active',      -- Aktiv auf Warteliste
  'notified',    -- Kunde wurde benachrichtigt
  'booked',      -- Kunde hat Termin gebucht
  'expired',     -- Abgelaufen (zu lange nicht gebucht)
  'cancelled'    -- Von Kunde storniert
);

CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Kunde
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  guest_name TEXT, -- Falls kein registrierter Kunde
  guest_email TEXT,
  guest_phone TEXT,

  -- Gewünschter Termin
  desired_service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  preferred_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL, -- Optional

  -- Zeitfenster (flexibel)
  desired_date DATE, -- Bevorzugtes Datum (optional)
  date_range_start DATE, -- Frühestens ab
  date_range_end DATE,   -- Spätestens bis

  -- Zeitpräferenzen
  preferred_time_of_day TEXT[], -- z.B. ["morning", "afternoon", "evening"]
  preferred_weekdays INTEGER[], -- 1=Montag, 7=Sonntag

  -- Notizen
  customer_notes TEXT,
  internal_notes TEXT, -- Admin notes

  -- Status & Benachrichtigungen
  status waitlist_status NOT NULL DEFAULT 'active',
  notified_at TIMESTAMPTZ,
  notification_count INTEGER NOT NULL DEFAULT 0,
  last_notification_at TIMESTAMPTZ,

  -- Auto-Expiry
  expires_at TIMESTAMPTZ, -- Auto-expire nach X Tagen
  auto_expire_days INTEGER DEFAULT 30,

  -- Priorität
  priority INTEGER NOT NULL DEFAULT 0, -- Höher = wichtiger
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (
    (customer_id IS NOT NULL) OR
    (guest_email IS NOT NULL AND guest_name IS NOT NULL)
  ),
  CHECK (date_range_end IS NULL OR date_range_start <= date_range_end),
  CHECK (auto_expire_days > 0),
  CHECK (notification_count >= 0)
);

-- Indexes
CREATE INDEX idx_waitlist_salon ON waitlist_entries(salon_id, status, created_at);
CREATE INDEX idx_waitlist_customer ON waitlist_entries(customer_id);
CREATE INDEX idx_waitlist_service ON waitlist_entries(desired_service_id);
CREATE INDEX idx_waitlist_staff ON waitlist_entries(preferred_staff_id);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_expires ON waitlist_entries(expires_at) WHERE status = 'active';

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Kunden können ihre eigenen Einträge sehen
CREATE POLICY "waitlist_select_own" ON waitlist_entries
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

-- Staff können alle Einträge ihres Salons sehen
CREATE POLICY "waitlist_select_staff" ON waitlist_entries
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

-- Kunden können sich selbst eintragen
CREATE POLICY "waitlist_insert" ON waitlist_entries
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons) -- Jeder kann sich eintragen
    AND (
      customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
      OR customer_id IS NULL -- Guest entries
    )
  );

-- Kunden können ihre eigenen Einträge updaten (cancel)
CREATE POLICY "waitlist_update_own" ON waitlist_entries
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Staff können alle Einträge updaten
CREATE POLICY "waitlist_update_staff" ON waitlist_entries
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

-- Nur Staff kann löschen
CREATE POLICY "waitlist_delete" ON waitlist_entries
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Set expires_at on insert
CREATE OR REPLACE FUNCTION set_waitlist_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL AND NEW.auto_expire_days IS NOT NULL THEN
    NEW.expires_at := NOW() + (NEW.auto_expire_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_waitlist_expiry
  BEFORE INSERT ON waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_waitlist_expiry();

-- Function: Expire old waitlist entries (run via cron)
CREATE OR REPLACE FUNCTION expire_old_waitlist_entries()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE waitlist_entries
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE waitlist_entries IS 'Warteliste für ausgebuchte Termine';
COMMENT ON COLUMN waitlist_entries.preferred_time_of_day IS 'Array: morning, afternoon, evening';
COMMENT ON COLUMN waitlist_entries.preferred_weekdays IS 'Array: 1=Monday, 7=Sunday';
COMMENT ON FUNCTION expire_old_waitlist_entries() IS 'Setzt alte Wartelisten-Einträge auf expired (via Cron Job)';
