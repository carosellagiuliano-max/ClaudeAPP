-- Migration 004: Appointments (Minimal)
-- SCHNITTWERK - Booking System Foundation
-- Creates: appointments, appointment_services, booking_rules
-- Purpose: Core booking functionality with double-booking prevention

-- ============================================================
-- ENUMS
-- ============================================================

-- Appointment status lifecycle
CREATE TYPE appointment_status AS ENUM (
  'reserved',    -- Temporary hold (15min default)
  'requested',   -- Customer requested, awaiting confirmation
  'confirmed',   -- Confirmed by staff or auto-confirmed
  'checked_in',  -- Customer arrived
  'in_progress', -- Service in progress
  'completed',   -- Service completed
  'cancelled',   -- Cancelled by customer or staff
  'no_show'      -- Customer did not show up
);

-- ============================================================
-- BOOKING_RULES TABLE
-- ============================================================
-- Per-salon booking configuration

CREATE TABLE booking_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Lead time and horizon
  min_lead_time_minutes INTEGER NOT NULL DEFAULT 60,
  max_booking_horizon_days INTEGER NOT NULL DEFAULT 90,

  -- Cancellation
  cancellation_cutoff_hours INTEGER NOT NULL DEFAULT 24,
  allow_customer_cancellation BOOLEAN DEFAULT true,
  allow_customer_reschedule BOOLEAN DEFAULT true,

  -- Slot settings
  slot_granularity_minutes INTEGER NOT NULL DEFAULT 15,
  default_visit_buffer_minutes INTEGER DEFAULT 0,

  -- Deposit and no-show
  deposit_required_percent NUMERIC(5,2) DEFAULT 0,
  no_show_policy TEXT DEFAULT 'none', -- 'none', 'charge_deposit', 'charge_full'

  -- Reservation timeout
  reservation_timeout_minutes INTEGER DEFAULT 15,

  -- Limits
  max_services_per_appointment INTEGER DEFAULT 5,
  max_concurrent_reservations_per_customer INTEGER DEFAULT 2,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT booking_rules_one_per_salon UNIQUE (salon_id),
  CONSTRAINT booking_rules_lead_time_positive CHECK (min_lead_time_minutes >= 0),
  CONSTRAINT booking_rules_horizon_positive CHECK (max_booking_horizon_days > 0),
  CONSTRAINT booking_rules_cutoff_positive CHECK (cancellation_cutoff_hours >= 0),
  CONSTRAINT booking_rules_granularity_valid CHECK (
    slot_granularity_minutes IN (5, 10, 15, 30, 60)
  ),
  CONSTRAINT booking_rules_deposit_range CHECK (
    deposit_required_percent >= 0 AND deposit_required_percent <= 100
  ),
  CONSTRAINT booking_rules_no_show_policy_valid CHECK (
    no_show_policy IN ('none', 'charge_deposit', 'charge_full')
  ),
  CONSTRAINT booking_rules_timeout_positive CHECK (reservation_timeout_minutes > 0)
);

-- Indexes
CREATE INDEX idx_booking_rules_salon ON booking_rules(salon_id);

-- Trigger for updated_at
CREATE TRIGGER booking_rules_updated_at
  BEFORE UPDATE ON booking_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
-- Core booking records

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Status
  status appointment_status NOT NULL DEFAULT 'reserved',
  reserved_until TIMESTAMPTZ, -- For 'reserved' status

  -- Pricing snapshot (total, calculated from services)
  total_price_chf NUMERIC(10,2),
  total_tax_chf NUMERIC(10,2),
  total_duration_minutes INTEGER,

  -- Deposit
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount_chf NUMERIC(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  deposit_payment_id UUID, -- References payments.id (will be added in Phase 5)

  -- Source
  booked_via TEXT DEFAULT 'online', -- 'online', 'phone', 'walk_in', 'admin'
  booked_by_profile_id UUID REFERENCES profiles(id),

  -- Notes
  customer_notes TEXT, -- Notes from customer
  staff_notes TEXT, -- Internal staff notes

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by_profile_id UUID REFERENCES profiles(id),
  cancellation_reason TEXT,

  -- Completion
  completed_at TIMESTAMPTZ,
  no_show_charged BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT appointments_time_order CHECK (ends_at > starts_at),
  CONSTRAINT appointments_reserved_until_logic CHECK (
    status != 'reserved' OR reserved_until IS NOT NULL
  ),
  CONSTRAINT appointments_deposit_logic CHECK (
    NOT deposit_required OR deposit_amount_chf IS NOT NULL
  ),
  CONSTRAINT appointments_booked_via_valid CHECK (
    booked_via IN ('online', 'phone', 'walk_in', 'admin')
  )
);

-- Indexes
CREATE INDEX idx_appointments_salon ON appointments(salon_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_starts ON appointments(salon_id, starts_at);
CREATE INDEX idx_appointments_status ON appointments(salon_id, status);

-- Critical index: Prevent double bookings
-- Unique constraint on (salon_id, staff_id, starts_at) for active appointments
CREATE UNIQUE INDEX idx_appointments_staff_time_unique ON appointments (
  salon_id, staff_id, starts_at
) WHERE status IN ('reserved', 'confirmed', 'checked_in', 'in_progress');

-- Index for finding overlapping appointments
CREATE INDEX idx_appointments_staff_overlap ON appointments (
  staff_id, starts_at, ends_at
) WHERE status IN ('reserved', 'confirmed', 'checked_in', 'in_progress');

-- Index for expired reservations cleanup
CREATE INDEX idx_appointments_reserved_until ON appointments(reserved_until)
  WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- APPOINTMENT_SERVICES TABLE
-- ============================================================
-- M:N relationship: One appointment can have multiple services

CREATE TABLE appointment_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  -- Price snapshot (at time of booking)
  snapshot_price_chf NUMERIC(10,2) NOT NULL,
  snapshot_tax_rate_percent NUMERIC(5,2),
  snapshot_tax_chf NUMERIC(10,2),
  snapshot_duration_minutes INTEGER NOT NULL,

  -- Service details snapshot
  snapshot_service_name TEXT NOT NULL,

  -- Order within appointment
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT appointment_services_price_positive CHECK (snapshot_price_chf >= 0),
  CONSTRAINT appointment_services_duration_positive CHECK (snapshot_duration_minutes > 0),
  CONSTRAINT appointment_services_tax_range CHECK (
    snapshot_tax_rate_percent IS NULL OR
    (snapshot_tax_rate_percent >= 0 AND snapshot_tax_rate_percent <= 100)
  )
);

-- Indexes
CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON appointment_services(service_id);
CREATE INDEX idx_appointment_services_salon ON appointment_services(salon_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Check for overlapping appointments
CREATE OR REPLACE FUNCTION has_overlapping_appointment(
  p_staff_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM appointments
    WHERE staff_id = p_staff_id
      AND status IN ('reserved', 'confirmed', 'checked_in', 'in_progress')
      AND (id != p_exclude_appointment_id OR p_exclude_appointment_id IS NULL)
      AND (
        -- New appointment starts during existing
        (p_starts_at >= starts_at AND p_starts_at < ends_at) OR
        -- New appointment ends during existing
        (p_ends_at > starts_at AND p_ends_at <= ends_at) OR
        -- New appointment completely contains existing
        (p_starts_at <= starts_at AND p_ends_at >= ends_at)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get active reservations count for customer
CREATE OR REPLACE FUNCTION get_customer_active_reservations_count(
  p_customer_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE customer_id = p_customer_id
    AND status = 'reserved'
    AND reserved_until > NOW();

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if appointment can be cancelled
CREATE OR REPLACE FUNCTION can_cancel_appointment(
  p_appointment_id UUID,
  p_current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_appointment RECORD;
  v_rules RECORD;
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Get appointment
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Already cancelled or completed
  IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN false;
  END IF;

  -- Get booking rules
  SELECT * INTO v_rules
  FROM booking_rules
  WHERE salon_id = v_appointment.salon_id
    AND is_active = true;

  IF NOT FOUND THEN
    -- No rules defined, allow cancellation
    RETURN true;
  END IF;

  -- Check if customer cancellation is allowed
  IF NOT v_rules.allow_customer_cancellation THEN
    RETURN false;
  END IF;

  -- Calculate cutoff time
  v_cutoff := v_appointment.starts_at - (v_rules.cancellation_cutoff_hours || ' hours')::INTERVAL;

  -- Check if we're before cutoff
  RETURN p_current_time <= v_cutoff;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate appointment total
CREATE OR REPLACE FUNCTION calculate_appointment_total(p_appointment_id UUID)
RETURNS TABLE(
  total_price NUMERIC(10,2),
  total_tax NUMERIC(10,2),
  total_duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(snapshot_price_chf)::NUMERIC(10,2),
    SUM(snapshot_tax_chf)::NUMERIC(10,2),
    SUM(snapshot_duration_minutes)::INTEGER
  FROM appointment_services
  WHERE appointment_id = p_appointment_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger: Update appointment totals when services change
CREATE OR REPLACE FUNCTION update_appointment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_totals RECORD;
BEGIN
  -- Calculate new totals
  SELECT * INTO v_totals
  FROM calculate_appointment_total(
    COALESCE(NEW.appointment_id, OLD.appointment_id)
  );

  -- Update appointment
  UPDATE appointments SET
    total_price_chf = v_totals.total_price,
    total_tax_chf = v_totals.total_tax,
    total_duration_minutes = v_totals.total_duration,
    ends_at = starts_at + (v_totals.total_duration || ' minutes')::INTERVAL
  WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_services_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON appointment_services
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_totals();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE booking_rules IS 'Per-salon booking configuration (lead time, cancellation, etc.)';
COMMENT ON TABLE appointments IS 'Core booking records with double-booking prevention';
COMMENT ON TABLE appointment_services IS 'M:N: Services included in each appointment with price snapshots';

COMMENT ON COLUMN appointments.reserved_until IS 'For status=reserved, when does the hold expire?';
COMMENT ON COLUMN appointments.booked_via IS 'How was this appointment created? (online, phone, walk_in, admin)';
COMMENT ON COLUMN appointment_services.snapshot_price_chf IS 'Price at time of booking (immutable)';
COMMENT ON COLUMN appointment_services.snapshot_service_name IS 'Service name at time of booking';

COMMENT ON INDEX idx_appointments_staff_time_unique IS 'CRITICAL: Prevents double bookings at same start time';
