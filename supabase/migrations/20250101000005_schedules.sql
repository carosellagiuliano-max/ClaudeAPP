-- Migration 005: Opening Hours & Schedules
-- SCHNITTWERK - Schedule Management for Slot Engine
-- Creates: opening_hours, staff_working_hours, staff_absences, blocked_times
-- Purpose: Define when salon and staff are available for bookings

-- ============================================================
-- ENUMS
-- ============================================================

-- Day of week (0 = Sunday, 6 = Saturday, ISO 8601)
CREATE TYPE day_of_week AS ENUM ('0', '1', '2', '3', '4', '5', '6');

-- Blocked time type
CREATE TYPE blocked_time_type AS ENUM (
  'salon_closed',    -- Entire salon closed (holiday, etc.)
  'staff_absence',   -- Specific staff unavailable
  'maintenance',     -- Salon maintenance
  'private_event',   -- Private event booking
  'other'
);

-- ============================================================
-- OPENING_HOURS TABLE
-- ============================================================
-- Regular weekly opening hours for each salon

CREATE TABLE opening_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  day_of_week INTEGER NOT NULL,

  -- Time ranges (stored as minutes since midnight to avoid DST issues)
  -- Multiple ranges per day supported via separate rows
  open_time_minutes INTEGER NOT NULL,  -- e.g., 540 = 09:00
  close_time_minutes INTEGER NOT NULL, -- e.g., 1080 = 18:00

  -- Metadata
  label TEXT, -- e.g., "Morning shift", "Afternoon shift"

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT opening_hours_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT opening_hours_time_range CHECK (
    open_time_minutes >= 0 AND
    open_time_minutes < 1440 AND
    close_time_minutes > 0 AND
    close_time_minutes <= 1440
  ),
  CONSTRAINT opening_hours_time_order CHECK (close_time_minutes > open_time_minutes)
);

-- Indexes
CREATE INDEX idx_opening_hours_salon ON opening_hours(salon_id);
CREATE INDEX idx_opening_hours_day ON opening_hours(salon_id, day_of_week);
CREATE INDEX idx_opening_hours_active ON opening_hours(salon_id, is_active)
  WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER opening_hours_updated_at
  BEFORE UPDATE ON opening_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAFF_WORKING_HOURS TABLE
-- ============================================================
-- Regular weekly working hours for each staff member

CREATE TABLE staff_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Day of week
  day_of_week INTEGER NOT NULL,

  -- Time ranges (minutes since midnight)
  start_time_minutes INTEGER NOT NULL,
  end_time_minutes INTEGER NOT NULL,

  -- Break (optional)
  break_start_minutes INTEGER,
  break_end_minutes INTEGER,

  -- Metadata
  label TEXT, -- e.g., "Regular shift", "Half day"

  -- Validity (for temporary schedule changes)
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_to DATE, -- NULL = permanent

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT staff_working_hours_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT staff_working_hours_time_range CHECK (
    start_time_minutes >= 0 AND
    start_time_minutes < 1440 AND
    end_time_minutes > 0 AND
    end_time_minutes <= 1440
  ),
  CONSTRAINT staff_working_hours_time_order CHECK (end_time_minutes > start_time_minutes),
  CONSTRAINT staff_working_hours_break_order CHECK (
    (break_start_minutes IS NULL AND break_end_minutes IS NULL) OR
    (break_start_minutes >= start_time_minutes AND
     break_end_minutes <= end_time_minutes AND
     break_end_minutes > break_start_minutes)
  ),
  CONSTRAINT staff_working_hours_valid_period CHECK (
    valid_to IS NULL OR valid_to >= valid_from
  )
);

-- Indexes
CREATE INDEX idx_staff_working_hours_staff ON staff_working_hours(staff_id);
CREATE INDEX idx_staff_working_hours_salon ON staff_working_hours(salon_id);
CREATE INDEX idx_staff_working_hours_day ON staff_working_hours(staff_id, day_of_week);
CREATE INDEX idx_staff_working_hours_valid ON staff_working_hours(staff_id, valid_from, valid_to)
  WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER staff_working_hours_updated_at
  BEFORE UPDATE ON staff_working_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAFF_ABSENCES TABLE
-- ============================================================
-- Specific date ranges when staff are unavailable

CREATE TABLE staff_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Time range (optional, for partial day absences)
  start_time_minutes INTEGER, -- NULL = full day
  end_time_minutes INTEGER,

  -- Reason
  reason TEXT NOT NULL, -- 'vacation', 'sick', 'training', 'personal', 'other'
  notes TEXT,

  -- Created by
  created_by_profile_id UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT staff_absences_date_order CHECK (end_date >= start_date),
  CONSTRAINT staff_absences_time_range CHECK (
    (start_time_minutes IS NULL AND end_time_minutes IS NULL) OR
    (start_time_minutes >= 0 AND start_time_minutes < 1440 AND
     end_time_minutes > 0 AND end_time_minutes <= 1440)
  ),
  CONSTRAINT staff_absences_time_order CHECK (
    start_time_minutes IS NULL OR
    end_time_minutes IS NULL OR
    end_time_minutes > start_time_minutes
  )
);

-- Indexes
CREATE INDEX idx_staff_absences_staff ON staff_absences(staff_id);
CREATE INDEX idx_staff_absences_dates ON staff_absences(staff_id, start_date, end_date);
CREATE INDEX idx_staff_absences_salon ON staff_absences(salon_id);

-- Trigger for updated_at
CREATE TRIGGER staff_absences_updated_at
  BEFORE UPDATE ON staff_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BLOCKED_TIMES TABLE
-- ============================================================
-- Specific time blocks when salon or staff are unavailable
-- (holidays, maintenance, private events, etc.)

CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE, -- NULL = salon-wide

  -- Type
  block_type blocked_time_type NOT NULL,

  -- Date and time
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,

  -- Details
  title TEXT NOT NULL,
  description TEXT,

  -- Recurrence (for holidays, etc.)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format (optional, for future)

  -- Created by
  created_by_profile_id UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT blocked_times_time_order CHECK (end_datetime > start_datetime),
  CONSTRAINT blocked_times_staff_logic CHECK (
    block_type != 'staff_absence' OR staff_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_blocked_times_salon ON blocked_times(salon_id);
CREATE INDEX idx_blocked_times_staff ON blocked_times(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_blocked_times_dates ON blocked_times(salon_id, start_datetime, end_datetime);
CREATE INDEX idx_blocked_times_type ON blocked_times(salon_id, block_type);

-- Trigger for updated_at
CREATE TRIGGER blocked_times_updated_at
  BEFORE UPDATE ON blocked_times
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Convert time to minutes since midnight
CREATE OR REPLACE FUNCTION time_to_minutes(p_time TIME)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM p_time)::INTEGER * 60 + EXTRACT(MINUTE FROM p_time)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Convert minutes since midnight to time
CREATE OR REPLACE FUNCTION minutes_to_time(p_minutes INTEGER)
RETURNS TIME AS $$
BEGIN
  RETURN (p_minutes || ' minutes')::INTERVAL::TIME;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get day of week (0 = Sunday) from date
CREATE OR REPLACE FUNCTION get_day_of_week(p_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(DOW FROM p_date)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get salon opening hours for a specific date
CREATE OR REPLACE FUNCTION get_salon_opening_hours(
  p_salon_id UUID,
  p_date DATE
)
RETURNS TABLE(
  open_time_minutes INTEGER,
  close_time_minutes INTEGER
) AS $$
DECLARE
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := get_day_of_week(p_date);

  RETURN QUERY
  SELECT oh.open_time_minutes, oh.close_time_minutes
  FROM opening_hours oh
  WHERE oh.salon_id = p_salon_id
    AND oh.day_of_week = v_day_of_week
    AND oh.is_active = true
  ORDER BY oh.open_time_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get staff working hours for a specific date
CREATE OR REPLACE FUNCTION get_staff_working_hours(
  p_staff_id UUID,
  p_date DATE
)
RETURNS TABLE(
  start_time_minutes INTEGER,
  end_time_minutes INTEGER,
  break_start_minutes INTEGER,
  break_end_minutes INTEGER
) AS $$
DECLARE
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := get_day_of_week(p_date);

  RETURN QUERY
  SELECT
    swh.start_time_minutes,
    swh.end_time_minutes,
    swh.break_start_minutes,
    swh.break_end_minutes
  FROM staff_working_hours swh
  WHERE swh.staff_id = p_staff_id
    AND swh.day_of_week = v_day_of_week
    AND swh.is_active = true
    AND swh.valid_from <= p_date
    AND (swh.valid_to IS NULL OR swh.valid_to >= p_date)
  ORDER BY swh.start_time_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if staff is absent on a specific date
CREATE OR REPLACE FUNCTION is_staff_absent(
  p_staff_id UUID,
  p_date DATE,
  p_time_minutes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff_absences sa
    WHERE sa.staff_id = p_staff_id
      AND sa.start_date <= p_date
      AND sa.end_date >= p_date
      AND (
        -- Full day absence
        (sa.start_time_minutes IS NULL AND sa.end_time_minutes IS NULL) OR
        -- Partial day absence, check time
        (p_time_minutes IS NOT NULL AND
         p_time_minutes >= sa.start_time_minutes AND
         p_time_minutes < sa.end_time_minutes)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if time is blocked (salon-wide or for specific staff)
CREATE OR REPLACE FUNCTION is_time_blocked(
  p_salon_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_datetime TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM blocked_times bt
    WHERE bt.salon_id = p_salon_id
      AND (bt.staff_id IS NULL OR bt.staff_id = p_staff_id OR p_staff_id IS NULL)
      AND bt.start_datetime <= p_datetime
      AND bt.end_datetime > p_datetime
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get all blocked time ranges for a date range
CREATE OR REPLACE FUNCTION get_blocked_times(
  p_salon_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  block_id UUID,
  block_type blocked_time_type,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bt.id,
    bt.block_type,
    bt.start_datetime,
    bt.end_datetime,
    bt.title
  FROM blocked_times bt
  WHERE bt.salon_id = p_salon_id
    AND (bt.staff_id IS NULL OR bt.staff_id = p_staff_id OR p_staff_id IS NULL)
    AND bt.start_datetime::DATE <= p_end_date
    AND bt.end_datetime::DATE >= p_start_date
  ORDER BY bt.start_datetime;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE opening_hours IS 'Regular weekly opening hours for each salon';
COMMENT ON TABLE staff_working_hours IS 'Regular weekly working hours for each staff member';
COMMENT ON TABLE staff_absences IS 'Specific date ranges when staff are unavailable (vacation, sick, etc.)';
COMMENT ON TABLE blocked_times IS 'Specific time blocks when salon or staff are unavailable';

COMMENT ON COLUMN opening_hours.open_time_minutes IS 'Opening time in minutes since midnight (e.g., 540 = 09:00)';
COMMENT ON COLUMN opening_hours.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN staff_working_hours.break_start_minutes IS 'Lunch/break start time (optional)';
COMMENT ON COLUMN blocked_times.recurrence_rule IS 'iCal RRULE format for recurring blocks (future feature)';
