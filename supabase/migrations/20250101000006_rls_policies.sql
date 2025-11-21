-- Migration 006: Row Level Security Policies
-- SCHNITTWERK - Security Foundation
-- Purpose: Enforce multi-tenant isolation and RBAC at database level
-- CRITICAL: This is the first line of defense for data security

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: roles table does not need RLS (static data, read-only for all authenticated users)

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has any role in salon
CREATE OR REPLACE FUNCTION user_has_salon_access(p_salon_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND salon_id = p_salon_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has specific role in salon
CREATE OR REPLACE FUNCTION user_has_salon_role(p_salon_id UUID, p_role_name role_name)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND salon_id = p_salon_id
      AND role_name = p_role_name
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is staff in salon
CREATE OR REPLACE FUNCTION user_is_salon_staff(p_salon_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND salon_id = p_salon_id
      AND role_name IN ('admin', 'manager', 'mitarbeiter')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is admin or manager in salon
CREATE OR REPLACE FUNCTION user_is_salon_admin(p_salon_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND salon_id = p_salon_id
      AND role_name IN ('admin', 'manager')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's customer ID in salon (if exists)
CREATE OR REPLACE FUNCTION get_user_customer_id(p_salon_id UUID)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id
  FROM customers
  WHERE profile_id = auth.uid()
    AND salon_id = p_salon_id
    AND is_active = true;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES: Users can see and edit their own profile
-- ============================================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- SALONS: Authenticated users can see salons
-- Staff can see details, public can see basics
-- ============================================================

CREATE POLICY "salons_select_public" ON salons
  FOR SELECT
  USING (
    is_active = true
    -- Anyone authenticated can see active salons
    AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- USER_ROLES: Users can see their own roles
-- Admins can manage roles in their salon
-- ============================================================

CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "user_roles_select_admin" ON user_roles
  FOR SELECT
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "user_roles_insert_admin" ON user_roles
  FOR INSERT
  WITH CHECK (user_is_salon_admin(salon_id));

CREATE POLICY "user_roles_update_admin" ON user_roles
  FOR UPDATE
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "user_roles_delete_admin" ON user_roles
  FOR DELETE
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- CUSTOMERS: Customers see own, staff see all in salon
-- ============================================================

CREATE POLICY "customers_select_own" ON customers
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "customers_select_staff" ON customers
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "customers_update_staff" ON customers
  FOR UPDATE
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "customers_insert_staff" ON customers
  FOR INSERT
  WITH CHECK (user_is_salon_staff(salon_id));

-- ============================================================
-- CUSTOMER_ADDRESSES: Customers see own, staff see all
-- ============================================================

CREATE POLICY "customer_addresses_select_own" ON customer_addresses
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE profile_id = auth.uid()
        AND salon_id = customer_addresses.salon_id
    )
  );

CREATE POLICY "customer_addresses_select_staff" ON customer_addresses
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "customer_addresses_modify_own" ON customer_addresses
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE profile_id = auth.uid()
        AND salon_id = customer_addresses.salon_id
    )
  );

CREATE POLICY "customer_addresses_modify_staff" ON customer_addresses
  FOR ALL
  USING (user_is_salon_staff(salon_id));

-- ============================================================
-- STAFF: Staff see themselves, admins see all in salon
-- ============================================================

CREATE POLICY "staff_select_public" ON staff
  FOR SELECT
  USING (
    is_active = true
    AND show_in_team_page = true
    AND salon_id IN (
      SELECT id FROM salons WHERE is_active = true
    )
  );

CREATE POLICY "staff_select_staff" ON staff
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "staff_update_admin" ON staff
  FOR UPDATE
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "staff_insert_admin" ON staff
  FOR INSERT
  WITH CHECK (user_is_salon_admin(salon_id));

-- ============================================================
-- STAFF_SERVICE_SKILLS: Public read for booking, admin write
-- ============================================================

CREATE POLICY "staff_skills_select_public" ON staff_service_skills
  FOR SELECT
  USING (
    is_active = true
    AND staff_id IN (
      SELECT id FROM staff WHERE is_active = true
    )
  );

CREATE POLICY "staff_skills_modify_admin" ON staff_service_skills
  FOR ALL
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- SCHEDULES: Public read (for booking), admin write
-- ============================================================

CREATE POLICY "opening_hours_select_public" ON opening_hours
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "opening_hours_modify_admin" ON opening_hours
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "staff_working_hours_select_public" ON staff_working_hours
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "staff_working_hours_modify_admin" ON staff_working_hours
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "staff_absences_select_staff" ON staff_absences
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "staff_absences_modify_admin" ON staff_absences
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "blocked_times_select_public" ON blocked_times
  FOR SELECT
  USING (true); -- Needed for slot engine

CREATE POLICY "blocked_times_modify_admin" ON blocked_times
  FOR ALL
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- SERVICES: Public read, admin write
-- ============================================================

CREATE POLICY "service_categories_select_public" ON service_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "service_categories_modify_admin" ON service_categories
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "services_select_public" ON services
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "services_modify_admin" ON services
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "service_prices_select_public" ON service_prices
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "service_prices_modify_admin" ON service_prices
  FOR ALL
  USING (user_is_salon_admin(salon_id));

CREATE POLICY "tax_rates_select_public" ON tax_rates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "tax_rates_modify_admin" ON tax_rates
  FOR ALL
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- BOOKING_RULES: Public read (for booking), admin write
-- ============================================================

CREATE POLICY "booking_rules_select_public" ON booking_rules
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "booking_rules_modify_admin" ON booking_rules
  FOR ALL
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- APPOINTMENTS: Customers see own, staff see all in salon
-- ============================================================

CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT
  USING (customer_id = get_user_customer_id(salon_id));

CREATE POLICY "appointments_select_staff" ON appointments
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT
  WITH CHECK (
    customer_id = get_user_customer_id(salon_id)
    OR user_is_salon_staff(salon_id)
  );

CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE
  USING (
    customer_id = get_user_customer_id(salon_id)
    -- Customers can only update certain fields (handled by app logic)
  );

CREATE POLICY "appointments_update_staff" ON appointments
  FOR UPDATE
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "appointments_delete_admin" ON appointments
  FOR DELETE
  USING (user_is_salon_admin(salon_id));

-- ============================================================
-- APPOINTMENT_SERVICES: Same as appointments
-- ============================================================

CREATE POLICY "appointment_services_select_own" ON appointment_services
  FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE customer_id = get_user_customer_id(salon_id)
    )
  );

CREATE POLICY "appointment_services_select_staff" ON appointment_services
  FOR SELECT
  USING (user_is_salon_staff(salon_id));

CREATE POLICY "appointment_services_modify_staff" ON appointment_services
  FOR ALL
  USING (user_is_salon_staff(salon_id));

-- ============================================================
-- AUDIT_LOGS: Read-only, staff can see logs for their salon
-- ============================================================

CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT
  USING (user_is_salon_admin(salon_id));

-- Note: Inserts to audit_logs are done via SECURITY DEFINER functions only

-- ============================================================
-- SERVICE ROLE BYPASS
-- ============================================================
-- The service role (used in Edge Functions and Server Actions)
-- bypasses RLS. This is intentional and necessary.
-- Always use the service role with extreme caution!

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON POLICY "profiles_select_own" ON profiles IS
  'Users can view their own profile';

COMMENT ON POLICY "customers_select_staff" ON customers IS
  'Staff can view all customers in their salon';

COMMENT ON POLICY "appointments_select_own" ON appointments IS
  'Customers can view their own appointments';

COMMENT ON POLICY "appointments_select_staff" ON appointments IS
  'Staff can view all appointments in their salon';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- To verify RLS is working, run these queries as different users:
--
-- 1. As customer: Should only see own data
-- SELECT * FROM appointments;
--
-- 2. As staff: Should see all salon data
-- SELECT * FROM appointments;
--
-- 3. As unauthenticated: Should see nothing
-- SELECT * FROM customers;
