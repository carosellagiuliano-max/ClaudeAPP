-- Migration 003: Services & Tax Rates
-- SCHNITTWERK - Service Catalog & Pricing
-- Creates: tax_rates, service_categories, services, service_prices
-- Purpose: Configuration-driven service management with temporal pricing

-- ============================================================
-- TAX_RATES TABLE
-- ============================================================
-- Temporal tax rates (Swiss VAT, etc.)

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Tax info
  code TEXT NOT NULL, -- e.g., 'VAT_STANDARD', 'VAT_REDUCED', 'VAT_ZERO'
  description TEXT NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL, -- e.g., 8.10 for 8.1%

  -- Temporal validity
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE, -- NULL means currently valid

  -- Category
  applies_to TEXT, -- 'services', 'products', 'both'

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tax_rates_rate_range CHECK (rate_percent >= 0 AND rate_percent <= 100),
  CONSTRAINT tax_rates_valid_period CHECK (
    valid_to IS NULL OR valid_to >= valid_from
  ),
  CONSTRAINT tax_rates_applies_to_valid CHECK (
    applies_to IN ('services', 'products', 'both')
  ),
  CONSTRAINT tax_rates_unique_code_period UNIQUE (salon_id, code, valid_from)
);

-- Indexes
CREATE INDEX idx_tax_rates_salon ON tax_rates(salon_id);
CREATE INDEX idx_tax_rates_valid ON tax_rates(salon_id, valid_from, valid_to)
  WHERE is_active = true;
CREATE INDEX idx_tax_rates_code ON tax_rates(salon_id, code);

-- Trigger for updated_at
CREATE TRIGGER tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SERVICE_CATEGORIES TABLE
-- ============================================================
-- Hierarchical service categories

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Display
  icon TEXT, -- Icon name or URL
  color TEXT, -- Hex color for UI
  image_url TEXT,
  display_order INTEGER DEFAULT 0,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_online BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT service_categories_unique_slug UNIQUE (salon_id, slug),
  CONSTRAINT service_categories_no_self_parent CHECK (id != parent_id)
);

-- Indexes
CREATE INDEX idx_service_categories_salon ON service_categories(salon_id);
CREATE INDEX idx_service_categories_parent ON service_categories(parent_id);
CREATE INDEX idx_service_categories_active ON service_categories(salon_id, is_active)
  WHERE is_active = true;
CREATE INDEX idx_service_categories_display ON service_categories(salon_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SERVICES TABLE
-- ============================================================
-- Service catalog (haircuts, coloring, etc.)

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,

  -- Basic info
  internal_name TEXT NOT NULL, -- Internal reference
  public_title TEXT NOT NULL, -- Customer-facing name
  slug TEXT NOT NULL,
  description TEXT,

  -- Pricing (base values, can be overridden in service_prices)
  base_price_chf NUMERIC(10,2) NOT NULL,
  base_duration_minutes INTEGER NOT NULL,

  -- Buffers (padding before/after appointments)
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,

  -- Tax
  tax_rate_id UUID REFERENCES tax_rates(id),

  -- Booking settings
  online_bookable BOOLEAN DEFAULT true,
  requires_deposit BOOLEAN DEFAULT false,
  deposit_amount_chf NUMERIC(10,2),

  -- Display
  image_url TEXT,
  display_order INTEGER DEFAULT 0,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Metadata
  tags TEXT[], -- Array of tags for filtering
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT services_unique_slug UNIQUE (salon_id, slug),
  CONSTRAINT services_price_positive CHECK (base_price_chf >= 0),
  CONSTRAINT services_duration_positive CHECK (base_duration_minutes > 0),
  CONSTRAINT services_buffers_positive CHECK (
    buffer_before_minutes >= 0 AND buffer_after_minutes >= 0
  ),
  CONSTRAINT services_deposit_logic CHECK (
    NOT requires_deposit OR deposit_amount_chf IS NOT NULL
  ),
  CONSTRAINT services_deposit_range CHECK (
    deposit_amount_chf IS NULL OR
    (deposit_amount_chf >= 0 AND deposit_amount_chf <= base_price_chf)
  )
);

-- Indexes
CREATE INDEX idx_services_salon ON services(salon_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(salon_id, is_active) WHERE is_active = true;
CREATE INDEX idx_services_bookable ON services(salon_id, online_bookable)
  WHERE is_active = true AND online_bookable = true;
CREATE INDEX idx_services_featured ON services(salon_id, is_featured)
  WHERE is_active = true AND is_featured = true;
CREATE INDEX idx_services_display ON services(salon_id, display_order);
CREATE INDEX idx_services_tags ON services USING GIN(tags);

-- Trigger for updated_at
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SERVICE_PRICES TABLE
-- ============================================================
-- Temporal pricing (price changes over time)
-- Allows for seasonal pricing, promotions, etc.

CREATE TABLE service_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tax_rate_id UUID REFERENCES tax_rates(id),

  -- Pricing
  price_chf NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER, -- Optional override

  -- Temporal validity
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE, -- NULL means currently valid

  -- Metadata
  description TEXT, -- e.g., "Summer Special", "Regular Price"

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT service_prices_price_positive CHECK (price_chf >= 0),
  CONSTRAINT service_prices_duration_positive CHECK (
    duration_minutes IS NULL OR duration_minutes > 0
  ),
  CONSTRAINT service_prices_valid_period CHECK (
    valid_to IS NULL OR valid_to >= valid_from
  )
);

-- Indexes
CREATE INDEX idx_service_prices_service ON service_prices(service_id);
CREATE INDEX idx_service_prices_valid ON service_prices(service_id, valid_from, valid_to)
  WHERE is_active = true;
CREATE INDEX idx_service_prices_salon ON service_prices(salon_id);

-- Trigger for updated_at
CREATE TRIGGER service_prices_updated_at
  BEFORE UPDATE ON service_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADD FOREIGN KEY TO staff_service_skills
-- ============================================================
-- Now that services table exists, add the foreign key constraint

ALTER TABLE staff_service_skills
  ADD CONSTRAINT staff_service_skills_service_fk
  FOREIGN KEY (service_id)
  REFERENCES services(id)
  ON DELETE CASCADE;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Get current price for a service
CREATE OR REPLACE FUNCTION get_service_price(
  p_service_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC(10,2);
BEGIN
  -- Try to find temporal price first
  SELECT price_chf INTO v_price
  FROM service_prices
  WHERE service_id = p_service_id
    AND is_active = true
    AND valid_from <= p_date
    AND (valid_to IS NULL OR valid_to >= p_date)
  ORDER BY valid_from DESC
  LIMIT 1;

  -- Fallback to base price
  IF v_price IS NULL THEN
    SELECT base_price_chf INTO v_price
    FROM services
    WHERE id = p_service_id;
  END IF;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get current duration for a service (with optional staff override)
CREATE OR REPLACE FUNCTION get_service_duration(
  p_service_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  -- Check for staff-specific override first
  IF p_staff_id IS NOT NULL THEN
    SELECT custom_duration_minutes INTO v_duration
    FROM staff_service_skills
    WHERE service_id = p_service_id
      AND staff_id = p_staff_id
      AND is_active = true
      AND custom_duration_minutes IS NOT NULL;

    IF v_duration IS NOT NULL THEN
      RETURN v_duration;
    END IF;
  END IF;

  -- Try temporal price with duration override
  SELECT duration_minutes INTO v_duration
  FROM service_prices
  WHERE service_id = p_service_id
    AND is_active = true
    AND valid_from <= p_date
    AND (valid_to IS NULL OR valid_to >= p_date)
    AND duration_minutes IS NOT NULL
  ORDER BY valid_from DESC
  LIMIT 1;

  -- Fallback to base duration
  IF v_duration IS NULL THEN
    SELECT base_duration_minutes INTO v_duration
    FROM services
    WHERE id = p_service_id;
  END IF;

  RETURN v_duration;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get effective duration including buffers
CREATE OR REPLACE FUNCTION get_service_effective_duration(
  p_service_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER;
  v_buffer_before INTEGER;
  v_buffer_after INTEGER;
BEGIN
  -- Get base duration
  v_duration := get_service_duration(p_service_id, p_staff_id, p_date);

  -- Get buffers
  SELECT buffer_before_minutes, buffer_after_minutes
  INTO v_buffer_before, v_buffer_after
  FROM services
  WHERE id = p_service_id;

  RETURN v_duration + COALESCE(v_buffer_before, 0) + COALESCE(v_buffer_after, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get current tax rate
CREATE OR REPLACE FUNCTION get_current_tax_rate(
  p_tax_rate_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC(5,2);
BEGIN
  SELECT rate_percent INTO v_rate
  FROM tax_rates
  WHERE id = p_tax_rate_id
    AND is_active = true
    AND valid_from <= p_date
    AND (valid_to IS NULL OR valid_to >= p_date);

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE tax_rates IS 'Temporal tax rates for Swiss VAT compliance';
COMMENT ON TABLE service_categories IS 'Hierarchical service categories (e.g., Haircuts, Coloring)';
COMMENT ON TABLE services IS 'Service catalog with base pricing and duration';
COMMENT ON TABLE service_prices IS 'Temporal pricing - allows price changes over time';

COMMENT ON COLUMN services.internal_name IS 'Internal reference name (not shown to customers)';
COMMENT ON COLUMN services.public_title IS 'Customer-facing service name';
COMMENT ON COLUMN services.buffer_before_minutes IS 'Padding time before appointment';
COMMENT ON COLUMN services.buffer_after_minutes IS 'Padding time after appointment (cleanup)';
COMMENT ON COLUMN service_prices.valid_from IS 'Price is valid from this date (inclusive)';
COMMENT ON COLUMN service_prices.valid_to IS 'Price is valid until this date (inclusive), NULL = no end date';
