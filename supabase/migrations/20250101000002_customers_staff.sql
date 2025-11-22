-- Migration 002: Customers & Staff
-- SCHNITTWERK - User Management
-- Creates: customers, staff, staff_service_skills
-- Purpose: Salon-scoped customer and staff management

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
-- Salon-scoped customer records

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Customer-specific data
  customer_number TEXT, -- Optional internal customer number
  birthday DATE,
  gender TEXT, -- 'male', 'female', 'other', 'prefer_not_to_say'

  -- Preferences
  preferred_staff_id UUID, -- Self-reference, set later
  preferred_services JSONB DEFAULT '[]'::jsonb, -- Array of service IDs
  notes TEXT, -- Internal staff notes

  -- Marketing
  source TEXT, -- How did they find us? (google, instagram, referral, etc.)
  referral_code TEXT, -- If referred by someone
  marketing_consent BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_vip BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT customers_unique_profile_per_salon UNIQUE (salon_id, profile_id),
  CONSTRAINT customers_birthday_reasonable CHECK (
    birthday IS NULL OR
    (birthday >= '1900-01-01' AND birthday <= CURRENT_DATE)
  )
);

-- Indexes
CREATE INDEX idx_customers_salon ON customers(salon_id);
CREATE INDEX idx_customers_profile ON customers(profile_id);
CREATE INDEX idx_customers_number ON customers(salon_id, customer_number) WHERE customer_number IS NOT NULL;
CREATE INDEX idx_customers_active ON customers(salon_id, is_active) WHERE is_active = true;
CREATE INDEX idx_customers_last_visit ON customers(salon_id, last_visit_at DESC NULLS LAST);

-- Trigger for updated_at
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAFF TABLE
-- ============================================================
-- Salon staff members (stylists, assistants, etc.)

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Staff info
  staff_number TEXT, -- Internal employee number
  position TEXT, -- 'stylist', 'senior_stylist', 'assistant', 'manager'
  bio TEXT, -- Public bio for website/booking

  -- Scheduling
  employment_type TEXT, -- 'full_time', 'part_time', 'freelance'
  default_working_hours JSONB DEFAULT '{}'::jsonb, -- Will be detailed in migration 005

  -- Display
  display_name TEXT, -- Name shown to customers (may differ from profile)
  display_order INTEGER DEFAULT 0, -- Sort order in lists
  photo_url TEXT,

  -- Settings
  accepts_online_bookings BOOLEAN DEFAULT true,
  show_in_team_page BOOLEAN DEFAULT true, -- Show on public website

  -- Compensation (optional, for future reporting)
  commission_rate NUMERIC(5,2), -- e.g., 40.00 for 40%

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  hired_at DATE,
  terminated_at DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT staff_unique_profile_per_salon UNIQUE (salon_id, profile_id),
  CONSTRAINT staff_commission_range CHECK (
    commission_rate IS NULL OR
    (commission_rate >= 0 AND commission_rate <= 100)
  ),
  CONSTRAINT staff_dates_logical CHECK (
    terminated_at IS NULL OR
    hired_at IS NULL OR
    terminated_at >= hired_at
  )
);

-- Indexes
CREATE INDEX idx_staff_salon ON staff(salon_id);
CREATE INDEX idx_staff_profile ON staff(profile_id);
CREATE INDEX idx_staff_active ON staff(salon_id, is_active) WHERE is_active = true;
CREATE INDEX idx_staff_bookable ON staff(salon_id, accepts_online_bookings)
  WHERE is_active = true AND accepts_online_bookings = true;
CREATE INDEX idx_staff_display_order ON staff(salon_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAFF_SERVICE_SKILLS TABLE
-- ============================================================
-- M:N relationship: Which services can each staff member perform?
-- Will reference services table (created in migration 003)

CREATE TABLE staff_service_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL, -- References services(id), constraint added in migration 003

  -- Skill level (optional, for future filtering)
  proficiency_level TEXT, -- 'junior', 'regular', 'senior', 'master'

  -- Custom duration override (if this staff needs more/less time)
  custom_duration_minutes INTEGER,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT staff_skills_unique UNIQUE (staff_id, service_id),
  CONSTRAINT staff_skills_duration_positive CHECK (
    custom_duration_minutes IS NULL OR custom_duration_minutes > 0
  )
);

-- Indexes
CREATE INDEX idx_staff_skills_staff ON staff_service_skills(staff_id);
CREATE INDEX idx_staff_skills_service ON staff_service_skills(service_id);
CREATE INDEX idx_staff_skills_active ON staff_service_skills(staff_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER staff_service_skills_updated_at
  BEFORE UPDATE ON staff_service_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CUSTOMER ADDRESSES TABLE
-- ============================================================
-- Multiple addresses per customer (shipping, billing)

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Address type
  address_type TEXT NOT NULL, -- 'shipping', 'billing', 'both'
  label TEXT, -- e.g., 'Home', 'Work'

  -- Address fields
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  street TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'CH',
  phone TEXT,

  -- Flags
  is_default BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT customer_addresses_type_valid CHECK (
    address_type IN ('shipping', 'billing', 'both')
  )
);

-- Indexes
CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_default ON customer_addresses(customer_id, is_default)
  WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Get customer ID for a profile in a salon
CREATE OR REPLACE FUNCTION get_customer_id(
  p_profile_id UUID,
  p_salon_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id
  FROM customers
  WHERE profile_id = p_profile_id
    AND salon_id = p_salon_id
    AND is_active = true;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get staff ID for a profile in a salon
CREATE OR REPLACE FUNCTION get_staff_id(
  p_profile_id UUID,
  p_salon_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_staff_id
  FROM staff
  WHERE profile_id = p_profile_id
    AND salon_id = p_salon_id
    AND is_active = true;

  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if profile is staff in salon
CREATE OR REPLACE FUNCTION is_staff_member(
  p_profile_id UUID,
  p_salon_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE profile_id = p_profile_id
      AND salon_id = p_salon_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if staff can perform service
CREATE OR REPLACE FUNCTION staff_can_perform_service(
  p_staff_id UUID,
  p_service_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff_service_skills
    WHERE staff_id = p_staff_id
      AND service_id = p_service_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADD FOREIGN KEY FOR preferred_staff_id
-- ============================================================
-- Now that staff table exists, add the self-reference

ALTER TABLE customers
  ADD CONSTRAINT customers_preferred_staff_fk
  FOREIGN KEY (preferred_staff_id)
  REFERENCES staff(id)
  ON DELETE SET NULL;

CREATE INDEX idx_customers_preferred_staff ON customers(preferred_staff_id)
  WHERE preferred_staff_id IS NOT NULL;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE customers IS 'Salon-scoped customer records';
COMMENT ON TABLE staff IS 'Salon staff members (stylists, assistants, managers)';
COMMENT ON TABLE staff_service_skills IS 'M:N: Which services can each staff member perform?';
COMMENT ON TABLE customer_addresses IS 'Multiple addresses per customer (shipping, billing)';

COMMENT ON COLUMN customers.customer_number IS 'Optional internal customer number';
COMMENT ON COLUMN customers.preferred_services IS 'Array of service IDs the customer frequently books';
COMMENT ON COLUMN customers.notes IS 'Internal staff notes (not visible to customer)';
COMMENT ON COLUMN staff.display_name IS 'Name shown to customers (may differ from profile name)';
COMMENT ON COLUMN staff.display_order IS 'Sort order when listing staff';
COMMENT ON COLUMN staff_service_skills.custom_duration_minutes IS 'Override default service duration for this staff member';
