-- Seed Data for SCHNITTWERK
-- Creates initial salon, users, services, and configuration
-- This is for development and testing purposes

-- ============================================================
-- 1. CREATE SALON
-- ============================================================

INSERT INTO salons (
  id,
  name,
  legal_entity_name,
  slug,
  address_street,
  address_city,
  address_postal_code,
  address_country,
  phone,
  email,
  website,
  timezone,
  currency,
  locale,
  tax_id,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'SCHNITTWERK by Vanessa Carosella',
  'Carosella Vanessa',
  'schnittwerk-stgallen',
  'Rorschacherstrasse 152',
  'St. Gallen',
  '9000',
  'CH',
  '+41 71 123 45 67',
  'info@schnittwerk.ch',
  'https://schnittwerk.ch',
  'Europe/Zurich',
  'CHF',
  'de-CH',
  'CHE-123.456.789', -- Example Swiss UID
  true
);

-- ============================================================
-- 2. CREATE PROFILES & USERS
-- Note: In real setup, these would be created via Supabase Auth
-- For development, we'll use placeholder UUIDs
-- ============================================================

-- Admin User (Vanessa)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  is_active,
  email_verified
) VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'vanessa@schnittwerk.ch',
  'Vanessa',
  'Carosella',
  '+41 79 123 45 67',
  true,
  true
);

-- Staff Member (Maria)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  is_active,
  email_verified
) VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  'maria@schnittwerk.ch',
  'Maria',
  'Schmidt',
  '+41 79 234 56 78',
  true,
  true
);

-- Customer (Test)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  is_active,
  email_verified
) VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  'kunde@example.com',
  'Max',
  'Mustermann',
  '+41 79 345 67 89',
  true,
  true
);

-- ============================================================
-- 3. ASSIGN ROLES
-- ============================================================

-- Vanessa: Admin
INSERT INTO user_roles (profile_id, salon_id, role_name, assigned_by, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  NULL, -- Self-assigned
  true
);

-- Maria: Staff
INSERT INTO user_roles (profile_id, salon_id, role_name, assigned_by, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'mitarbeiter',
  '10000000-0000-0000-0000-000000000001'::uuid,
  true
);

-- Max: Customer
INSERT INTO user_roles (profile_id, salon_id, role_name, assigned_by, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'kunde',
  NULL,
  true
);

-- ============================================================
-- 4. CREATE STAFF RECORDS
-- ============================================================

-- Vanessa (Owner/Stylist)
INSERT INTO staff (
  id,
  salon_id,
  profile_id,
  staff_number,
  position,
  bio,
  employment_type,
  display_name,
  display_order,
  accepts_online_bookings,
  show_in_team_page,
  is_active,
  hired_at
) VALUES (
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'S001',
  'senior_stylist',
  'Inhaberin und Meisterfriseurin mit über 15 Jahren Erfahrung',
  'full_time',
  'Vanessa',
  1,
  true,
  true,
  true,
  '2020-01-01'
);

-- Maria (Stylist)
INSERT INTO staff (
  id,
  salon_id,
  profile_id,
  staff_number,
  position,
  bio,
  employment_type,
  display_name,
  display_order,
  accepts_online_bookings,
  show_in_team_page,
  is_active,
  hired_at
) VALUES (
  '20000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'S002',
  'stylist',
  'Spezialisiert auf Haarschnitte und Styling',
  'part_time',
  'Maria',
  2,
  true,
  true,
  true,
  '2021-06-01'
);

-- ============================================================
-- 5. CREATE CUSTOMER RECORD
-- ============================================================

INSERT INTO customers (
  id,
  salon_id,
  profile_id,
  customer_number,
  is_active
) VALUES (
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  'C00001',
  true
);

-- ============================================================
-- 6. TAX RATES
-- ============================================================

-- Standard Swiss VAT (8.1%)
INSERT INTO tax_rates (
  id,
  salon_id,
  code,
  description,
  rate_percent,
  applies_to,
  valid_from,
  is_active
) VALUES (
  '40000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'VAT_STANDARD',
  'Schweizer Mehrwertsteuer Standard',
  8.10,
  'both',
  '2024-01-01',
  true
);

-- Reduced VAT (2.6% - for certain services/products)
INSERT INTO tax_rates (
  id,
  salon_id,
  code,
  description,
  rate_percent,
  applies_to,
  valid_from,
  is_active
) VALUES (
  '40000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'VAT_REDUCED',
  'Schweizer Mehrwertsteuer Reduziert',
  2.60,
  'products',
  '2024-01-01',
  true
);

-- ============================================================
-- 7. SERVICE CATEGORIES
-- ============================================================

INSERT INTO service_categories (id, salon_id, name, slug, display_order, is_active)
VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Haarschnitte', 'haarschnitte', 1, true),
  ('50000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Färben & Strähnchen', 'faerben-straehnen', 2, true),
  ('50000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Styling', 'styling', 3, true);

-- ============================================================
-- 8. SERVICES
-- ============================================================

INSERT INTO services (
  id, salon_id, category_id, internal_name, public_title, slug,
  description, base_price_chf, base_duration_minutes,
  buffer_before_minutes, buffer_after_minutes,
  tax_rate_id, online_bookable, is_active, display_order
) VALUES
  -- Haircuts
  ('60000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000001'::uuid,
   'haircut_women',
   'Haarschnitt Damen',
   'haarschnitt-damen',
   'Professioneller Haarschnitt mit Waschen, Schneiden und Föhnen',
   80.00, 60, 0, 10,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 1),

  ('60000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000001'::uuid,
   'haircut_men',
   'Haarschnitt Herren',
   'haarschnitt-herren',
   'Klassischer Herrenhaarschnitt mit Waschen',
   50.00, 30, 0, 10,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 2),

  ('60000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000001'::uuid,
   'haircut_children',
   'Kinderhaarschnitt',
   'kinderhaarschnitt',
   'Haarschnitt für Kinder bis 12 Jahre',
   35.00, 30, 0, 10,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 3),

  -- Coloring
  ('60000000-0000-0000-0000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000002'::uuid,
   'color_full',
   'Färben Komplett',
   'faerben-komplett',
   'Komplettes Färben inkl. Schnitt und Styling',
   180.00, 150, 0, 15,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 4),

  ('60000000-0000-0000-0000-000000000005'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000002'::uuid,
   'balayage',
   'Balayage',
   'balayage',
   'Natürliche Balayage-Technik mit Toning',
   220.00, 180, 0, 15,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 5),

  ('60000000-0000-0000-0000-000000000006'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000002'::uuid,
   'highlights',
   'Strähnchen',
   'straehnen',
   'Klassische Strähnchen mit Folien',
   120.00, 120, 0, 15,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 6),

  -- Styling
  ('60000000-0000-0000-0000-000000000007'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000003'::uuid,
   'blowdry',
   'Föhnen & Styling',
   'foehnen-styling',
   'Professionelles Föhnen und Styling',
   45.00, 30, 0, 5,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 7),

  ('60000000-0000-0000-0000-000000000008'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000003'::uuid,
   'updo',
   'Hochsteckfrisur',
   'hochsteckfrisur',
   'Elegante Hochsteckfrisur für besondere Anlässe',
   90.00, 60, 0, 5,
   '40000000-0000-0000-0000-000000000001'::uuid,
   true, true, 8);

-- ============================================================
-- 9. STAFF SERVICE SKILLS
-- ============================================================

-- Vanessa can do everything
INSERT INTO staff_service_skills (salon_id, staff_id, service_id, proficiency_level, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  id,
  'master',
  true
FROM services
WHERE salon_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Maria can do haircuts and styling (not coloring)
INSERT INTO staff_service_skills (salon_id, staff_id, service_id, proficiency_level, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  id,
  'regular',
  true
FROM services
WHERE salon_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND category_id IN (
    '50000000-0000-0000-0000-000000000001'::uuid, -- Haircuts
    '50000000-0000-0000-0000-000000000003'::uuid  -- Styling
  );

-- ============================================================
-- 10. OPENING HOURS
-- ============================================================

-- Monday - Friday: 09:00 - 18:00
INSERT INTO opening_hours (salon_id, day_of_week, open_time_minutes, close_time_minutes, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 1, 540, 1080, true), -- Monday
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, 540, 1080, true), -- Tuesday
  ('00000000-0000-0000-0000-000000000001'::uuid, 3, 540, 1080, true), -- Wednesday
  ('00000000-0000-0000-0000-000000000001'::uuid, 4, 540, 1080, true), -- Thursday
  ('00000000-0000-0000-0000-000000000001'::uuid, 5, 540, 1080, true); -- Friday

-- Saturday: 08:00 - 16:00
INSERT INTO opening_hours (salon_id, day_of_week, open_time_minutes, close_time_minutes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 6, 480, 960, true); -- Saturday

-- Sunday: Closed

-- ============================================================
-- 11. STAFF WORKING HOURS
-- ============================================================

-- Vanessa: Monday - Saturday, full days
INSERT INTO staff_working_hours (
  salon_id, staff_id, day_of_week,
  start_time_minutes, end_time_minutes,
  break_start_minutes, break_end_minutes,
  is_active
)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 1, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 2, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 3, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 4, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 5, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 6, 480, 960, NULL, NULL, true);

-- Maria: Tuesday, Thursday, Friday (part-time)
INSERT INTO staff_working_hours (
  salon_id, staff_id, day_of_week,
  start_time_minutes, end_time_minutes,
  break_start_minutes, break_end_minutes,
  is_active
)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 2, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 4, 540, 1080, 720, 780, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 5, 540, 1080, 720, 780, true);

-- ============================================================
-- 12. BOOKING RULES
-- ============================================================

INSERT INTO booking_rules (
  salon_id,
  min_lead_time_minutes,
  max_booking_horizon_days,
  cancellation_cutoff_hours,
  allow_customer_cancellation,
  allow_customer_reschedule,
  slot_granularity_minutes,
  default_visit_buffer_minutes,
  deposit_required_percent,
  no_show_policy,
  reservation_timeout_minutes,
  max_services_per_appointment,
  max_concurrent_reservations_per_customer,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  60,    -- Min 1 hour lead time
  90,    -- Can book up to 90 days ahead
  24,    -- Cancel up to 24 hours before
  true,  -- Customers can cancel
  true,  -- Customers can reschedule
  15,    -- 15-minute slots
  0,     -- No default buffer
  0.00,  -- No deposit required (for now)
  'none', -- No no-show charges (for now)
  15,    -- 15-minute reservation hold
  3,     -- Max 3 services per appointment
  2,     -- Max 2 concurrent reservations
  true
);

-- ============================================================
-- DONE
-- ============================================================

-- Verify data
SELECT 'Salon created:', name FROM salons;
SELECT 'Profiles created:', COUNT(*) FROM profiles;
SELECT 'Staff created:', COUNT(*) FROM staff;
SELECT 'Services created:', COUNT(*) FROM services;
SELECT 'Opening hours created:', COUNT(*) FROM opening_hours;
