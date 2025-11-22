-- HQ Role and Salon Theming Support
-- Phase 8: Multi-Salon Readiness

-- ============================================================================
-- HQ ROLES
-- ============================================================================

-- Add HQ role columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hq_role TEXT CHECK (hq_role IN ('hq_owner', 'hq_manager', 'hq_analyst')),
ADD COLUMN IF NOT EXISTS hq_salon_access UUID[] DEFAULT NULL;

-- Index for HQ role queries
CREATE INDEX IF NOT EXISTS idx_profiles_hq_role
ON profiles(hq_role)
WHERE hq_role IS NOT NULL;

-- Comments
COMMENT ON COLUMN profiles.hq_role IS 'Headquarters role for multi-salon access';
COMMENT ON COLUMN profiles.hq_salon_access IS 'Array of salon IDs this HQ user can access (NULL = all salons for hq_owner)';

-- ============================================================================
-- SALON THEMING
-- ============================================================================

-- Create salon theming table
CREATE TABLE IF NOT EXISTS salon_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Brand Colors
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  accent_color TEXT DEFAULT '#FF6B6B',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#000000',

  -- Logo & Images
  logo_url TEXT,
  logo_dark_url TEXT, -- For dark mode
  favicon_url TEXT,
  og_image_url TEXT, -- For social media sharing

  -- Typography
  font_family_heading TEXT DEFAULT 'system-ui',
  font_family_body TEXT DEFAULT 'system-ui',

  -- Custom CSS (advanced)
  custom_css TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_theme_per_salon UNIQUE(salon_id)
);

-- RLS Policies for salon_themes
ALTER TABLE salon_themes ENABLE ROW LEVEL SECURITY;

-- Salon staff can view their salon's theme
CREATE POLICY "Salon staff can view theme"
ON salon_themes
FOR SELECT
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
  )
);

-- Salon admins can update theme
CREATE POLICY "Salon admins can update theme"
ON salon_themes
FOR UPDATE
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Salon owners can insert theme
CREATE POLICY "Salon owners can insert theme"
ON salon_themes
FOR INSERT
WITH CHECK (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
    AND role = 'owner'
  )
);

-- Public can view active salon themes (for public website)
CREATE POLICY "Public can view active salon themes"
ON salon_themes
FOR SELECT
USING (
  salon_id IN (
    SELECT id FROM salons WHERE active = true
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salon_themes_salon
ON salon_themes(salon_id);

-- Comments
COMMENT ON TABLE salon_themes IS 'Per-salon theming and branding configuration';
COMMENT ON COLUMN salon_themes.primary_color IS 'Primary brand color (hex)';
COMMENT ON COLUMN salon_themes.accent_color IS 'Accent color for CTAs and highlights';
COMMENT ON COLUMN salon_themes.logo_url IS 'URL to salon logo image';
COMMENT ON COLUMN salon_themes.custom_css IS 'Custom CSS for advanced theming';

-- ============================================================================
-- SALON SETTINGS (Additional Configuration)
-- ============================================================================

-- Create salon settings table for other configurations
CREATE TABLE IF NOT EXISTS salon_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Business Settings
  default_timezone TEXT DEFAULT 'Europe/Zurich',
  default_language TEXT DEFAULT 'de',
  currency TEXT DEFAULT 'CHF',

  -- Booking Settings
  min_lead_time_minutes INT DEFAULT 120,
  max_booking_horizon_days INT DEFAULT 60,
  slot_granularity_minutes INT DEFAULT 15,
  allow_staff_preference BOOLEAN DEFAULT true,
  require_phone_number BOOLEAN DEFAULT true,

  -- Notification Settings
  send_booking_confirmations BOOLEAN DEFAULT true,
  send_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INT DEFAULT 24,
  admin_notification_email TEXT,

  -- Payment Settings
  require_payment_online BOOLEAN DEFAULT false,
  allow_cash_payment BOOLEAN DEFAULT true,

  -- Shop Settings
  shop_enabled BOOLEAN DEFAULT true,
  min_order_amount_chf DECIMAL(10, 2) DEFAULT 0,
  free_shipping_threshold_chf DECIMAL(10, 2) DEFAULT 100,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_settings_per_salon UNIQUE(salon_id)
);

-- RLS Policies for salon_settings
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;

-- Salon staff can view settings
CREATE POLICY "Salon staff can view settings"
ON salon_settings
FOR SELECT
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
  )
);

-- Salon admins can update settings
CREATE POLICY "Salon admins can update settings"
ON salon_settings
FOR UPDATE
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Salon owners can insert settings
CREATE POLICY "Salon owners can insert settings"
ON salon_settings
FOR INSERT
WITH CHECK (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
    AND role = 'owner'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salon_settings_salon
ON salon_settings(salon_id);

-- Comments
COMMENT ON TABLE salon_settings IS 'Per-salon business and operational settings';
COMMENT ON COLUMN salon_settings.min_lead_time_minutes IS 'Minimum advance booking time';
COMMENT ON COLUMN salon_settings.max_booking_horizon_days IS 'How far ahead customers can book';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get default theme for a salon
CREATE OR REPLACE FUNCTION get_salon_theme(p_salon_id UUID)
RETURNS JSON AS $$
DECLARE
  theme_data JSON;
BEGIN
  SELECT row_to_json(t)
  INTO theme_data
  FROM salon_themes t
  WHERE t.salon_id = p_salon_id;

  -- If no theme exists, return default theme
  IF theme_data IS NULL THEN
    theme_data := json_build_object(
      'primary_color', '#000000',
      'secondary_color', '#666666',
      'accent_color', '#FF6B6B',
      'background_color', '#FFFFFF',
      'text_color', '#000000',
      'font_family_heading', 'system-ui',
      'font_family_body', 'system-ui'
    );
  END IF;

  RETURN theme_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default settings for new salon
CREATE OR REPLACE FUNCTION initialize_salon_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default theme
  INSERT INTO salon_themes (salon_id)
  VALUES (NEW.id)
  ON CONFLICT (salon_id) DO NOTHING;

  -- Create default settings
  INSERT INTO salon_settings (salon_id)
  VALUES (NEW.id)
  ON CONFLICT (salon_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize defaults when salon is created
DROP TRIGGER IF EXISTS trigger_initialize_salon_defaults ON salons;
CREATE TRIGGER trigger_initialize_salon_defaults
AFTER INSERT ON salons
FOR EACH ROW
EXECUTE FUNCTION initialize_salon_defaults();

-- ============================================================================
-- MULTI-SALON VERIFICATION
-- ============================================================================

-- View to check tables missing salon_id
CREATE OR REPLACE VIEW tables_without_salon_id AS
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    'salons',
    'profiles',
    'legal_documents',
    'tax_rates',
    'salon_themes',
    'salon_settings'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tablename
      AND column_name = 'salon_id'
  );

COMMENT ON VIEW tables_without_salon_id IS 'Lists tables that should have salon_id but don''t (for multi-tenant verification)';

-- ============================================================================
-- SAMPLE DATA (Development Only)
-- ============================================================================

-- Insert sample HQ user (commented out for production)
-- UPDATE profiles
-- SET hq_role = 'hq_owner', hq_salon_access = NULL
-- WHERE email = 'hq@schnittwerk.ch';
