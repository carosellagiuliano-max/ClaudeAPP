-- =====================================================================
-- SCHNITTWERK - SEED DATA
-- =====================================================================
-- Dieses Script erstellt Demo-Daten für Development/Testing
-- Verwendung: psql < supabase/seed/seed.sql
-- oder via Supabase Dashboard: SQL Editor
-- =====================================================================

-- Cleanup (falls bereits Daten existieren)
TRUNCATE TABLE
  customer_consents,
  loyalty_reward_redemptions,
  loyalty_transactions,
  loyalty_accounts,
  loyalty_rewards,
  loyalty_tiers,
  waitlist_entries,
  legal_documents,
  notification_logs,
  cron_job_runs,
  stripe_events,
  appointment_services,
  appointments,
  cart_items,
  carts,
  order_items,
  orders,
  voucher_redemptions,
  vouchers,
  payment_events,
  payments,
  inventory_transactions,
  inventory_items,
  product_bundles,
  products,
  product_categories,
  product_brands,
  staff_absences,
  staff_working_hours,
  staff_service_skills,
  staff,
  customers,
  blocked_times,
  opening_hours,
  service_prices,
  services,
  service_categories,
  tax_rates,
  shipping_methods,
  user_roles,
  salons
CASCADE;

-- =====================================================================
-- 1. DEMO SALON
-- =====================================================================

INSERT INTO salons (id, name, slug, address_line1, address_line2, city, postal_code, country, timezone, currency, phone, email, website, iban, active)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'SCHNITTWERK by Vanessa',
  'schnittwerk-stgallen',
  'Rorschacherstrasse 152',
  NULL,
  'St. Gallen',
  '9000',
  'CH',
  'Europe/Zurich',
  'CHF',
  '+41 71 222 33 44',
  'info@schnittwerk.ch',
  'https://schnittwerk.ch',
  'CH9300762011623852957', -- Sample Swiss IBAN for QR-Bills
  true
);

-- =====================================================================
-- 2. TAX RATES
-- =====================================================================

INSERT INTO tax_rates (salon_id, name, rate, is_default, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Standard (7.7%)', 7.7, true, true),
  ('a0000000-0000-0000-0000-000000000001', 'Reduziert (2.5%)', 2.5, false, true),
  ('a0000000-0000-0000-0000-000000000001', 'Befreit (0%)', 0.0, false, true);

-- =====================================================================
-- 3. SHIPPING METHODS
-- =====================================================================

INSERT INTO shipping_methods (salon_id, name, description, price, estimated_days_min, estimated_days_max, active, sort_order)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Abholung im Salon', 'Kostenlose Abholung', 0, 1, 1, true, 1),
  ('a0000000-0000-0000-0000-000000000001', 'Standardversand', 'Post A-Post', 8.90, 2, 3, true, 2),
  ('a0000000-0000-0000-0000-000000000001', 'Expressversand', 'Post Priority', 14.90, 1, 1, true, 3);

-- =====================================================================
-- 4. SERVICE CATEGORIES
-- =====================================================================

INSERT INTO service_categories (id, salon_id, name, slug, description, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Haarschnitt', 'haarschnitt', 'Alle Haarschnitte', 1),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Coloration', 'coloration', 'Färben und Strähnchen', 2),
  ('c0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Styling', 'styling', 'Föhnen, Hochstecken', 3),
  ('c0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Treatments', 'treatments', 'Pflege und Behandlungen', 4);

-- =====================================================================
-- 5. SERVICES
-- =====================================================================

INSERT INTO services (id, salon_id, category_id, name, slug, description, duration_minutes, bookable, active)
VALUES
  -- Haarschnitt
  ('s0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Damenhaarschnitt', 'damenhaarschnitt', 'Waschen, Schneiden, Föhnen', 60, true, true),
  ('s0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Herrenhaarschnitt', 'herrenhaarschnitt', 'Waschen, Schneiden, Styling', 45, true, true),
  ('s0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Kinderhaarschnitt', 'kinderhaarschnitt', 'Für Kinder bis 12 Jahre', 30, true, true),

  -- Coloration
  ('s0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Komplettfärbung', 'komplettfaerbung', 'Komplette Farbveränderung', 120, true, true),
  ('s0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Strähnchen', 'stråhnchen', 'Highlights und Lowlights', 90, true, true),

  -- Styling
  ('s0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Föhnen & Styling', 'foehnen-styling', 'Professionelles Styling', 30, true, true),
  ('s0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Hochsteckfrisur', 'hochsteckfrisur', 'Für besondere Anlässe', 60, true, true),

  -- Treatments
  ('s0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Haarkur', 'haarkur', 'Intensive Pflegebehandlung', 30, true, true);

-- Service Prices
INSERT INTO service_prices (service_id, price, valid_from, valid_until)
VALUES
  ('s0000000-0000-0000-0000-000000000001', 75.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000002', 55.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000003', 35.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000004', 120.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000005', 95.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000006', 40.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000007', 85.00, '2024-01-01', NULL),
  ('s0000000-0000-0000-0000-000000000008', 45.00, '2024-01-01', NULL);

-- =====================================================================
-- 6. STAFF
-- =====================================================================

INSERT INTO staff (id, salon_id, first_name, last_name, email, phone, role, bio, hire_date, active)
VALUES
  ('st000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Vanessa', 'Carosella', 'vanessa@schnittwerk.ch', '+41 79 111 11 11', 'Inhaberin & Stylistin', 'Passion für Haare seit 15 Jahren', '2020-01-01', true),
  ('st000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Maria', 'Schmidt', 'maria@schnittwerk.ch', '+41 79 222 22 22', 'Senior Stylistin', 'Spezialistin für Colorationen', '2021-03-01', true),
  ('st000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Julia', 'Müller', 'julia@schnittwerk.ch', '+41 79 333 33 33', 'Stylistin', 'Kreative Schnitte und Trends', '2022-06-01', true);

-- Staff Service Skills (welche Mitarbeiterin kann welche Services)
INSERT INTO staff_service_skills (staff_id, service_id)
VALUES
  -- Vanessa kann alles
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000003'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000004'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000005'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000006'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000007'),
  ('st000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000008'),

  -- Maria: Coloration + Schnitt
  ('st000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001'),
  ('st000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000004'),
  ('st000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000005'),
  ('st000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000008'),

  -- Julia: Schnitt + Styling
  ('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001'),
  ('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000002'),
  ('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000003'),
  ('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000006'),
  ('st000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000007');

-- Staff Working Hours (Mo-Fr 9-18, Sa 9-16)
INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, is_available)
VALUES
  -- Vanessa
  ('st000000-0000-0000-0000-000000000001', 1, '09:00', '18:00', true), -- Mo
  ('st000000-0000-0000-0000-000000000001', 2, '09:00', '18:00', true), -- Di
  ('st000000-0000-0000-0000-000000000001', 3, '09:00', '18:00', true), -- Mi
  ('st000000-0000-0000-0000-000000000001', 4, '09:00', '18:00', true), -- Do
  ('st000000-0000-0000-0000-000000000001', 5, '09:00', '18:00', true), -- Fr
  ('st000000-0000-0000-0000-000000000001', 6, '09:00', '16:00', true), -- Sa

  -- Maria
  ('st000000-0000-0000-0000-000000000002', 1, '09:00', '18:00', true),
  ('st000000-0000-0000-0000-000000000002', 2, '09:00', '18:00', true),
  ('st000000-0000-0000-0000-000000000002', 3, '09:00', '18:00', true),
  ('st000000-0000-0000-0000-000000000002', 4, '09:00', '18:00', true),
  ('st000000-0000-0000-0000-000000000002', 5, '09:00', '18:00', true),

  -- Julia
  ('st000000-0000-0000-0000-000000000003', 2, '09:00', '18:00', true), -- Di
  ('st000000-0000-0000-0000-000000000003', 3, '09:00', '18:00', true), -- Mi
  ('st000000-0000-0000-0000-000000000003', 4, '09:00', '18:00', true), -- Do
  ('st000000-0000-0000-0000-000000000003', 5, '09:00', '18:00', true), -- Fr
  ('st000000-0000-0000-0000-000000000003', 6, '09:00', '16:00', true); -- Sa

-- =====================================================================
-- 7. OPENING HOURS
-- =====================================================================

INSERT INTO opening_hours (salon_id, day_of_week, open_time, close_time, is_open)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 1, '09:00', '18:00', true), -- Mo
  ('a0000000-0000-0000-0000-000000000001', 2, '09:00', '18:00', true), -- Di
  ('a0000000-0000-0000-0000-000000000001', 3, '09:00', '18:00', true), -- Mi
  ('a0000000-0000-0000-0000-000000000001', 4, '09:00', '18:00', true), -- Do
  ('a0000000-0000-0000-0000-000000000001', 5, '09:00', '18:00', true), -- Fr
  ('a0000000-0000-0000-0000-000000000001', 6, '09:00', '16:00', true), -- Sa
  ('a0000000-0000-0000-0000-000000000001', 0, NULL, NULL, false);      -- So geschlossen

-- =====================================================================
-- 8. PRODUCT CATEGORIES & BRANDS
-- =====================================================================

INSERT INTO product_categories (id, salon_id, name, slug, sort_order)
VALUES
  ('pc000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Shampoos', 'shampoos', 1),
  ('pc000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Conditioner', 'conditioner', 2),
  ('pc000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Styling', 'styling', 3),
  ('pc000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Pflegeprodukte', 'pflegeprodukte', 4);

INSERT INTO product_brands (id, salon_id, name, slug)
VALUES
  ('pb000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'L''Oréal Professionnel', 'loreal'),
  ('pb000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Wella Professionals', 'wella'),
  ('pb000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Schwarzkopf', 'schwarzkopf');

-- =====================================================================
-- 9. PRODUCTS
-- =====================================================================

INSERT INTO products (id, salon_id, category_id, brand_id, name, slug, description, price, sku, active, track_inventory)
VALUES
  ('p0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000001', 'pb000000-0000-0000-0000-000000000001', 'Serie Expert Absolut Repair Shampoo', 'absolut-repair-shampoo', 'Für geschädigtes Haar', 24.90, 'LOE-SHP-001', true, true),
  ('p0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000002', 'pb000000-0000-0000-0000-000000000001', 'Serie Expert Absolut Repair Conditioner', 'absolut-repair-conditioner', 'Intensive Pflege', 26.90, 'LOE-CON-001', true, true),
  ('p0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000003', 'pb000000-0000-0000-0000-000000000002', 'EIMI Perfect Me Styling-Lotion', 'perfect-me-lotion', 'Leichtes Styling', 19.90, 'WEL-STY-001', true, true),
  ('p0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000003', 'pb000000-0000-0000-0000-000000000003', 'Osis+ Thrill Texture Fibre Gum', 'thrill-fibre-gum', 'Starker Halt', 22.90, 'SCH-STY-001', true, true),
  ('p0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000004', 'pb000000-0000-0000-0000-000000000001', 'Absolut Repair Lipidium Maske', 'absolut-repair-maske', 'Intensive Reparatur-Maske', 32.90, 'LOE-MSK-001', true, true);

-- Product Inventory
INSERT INTO inventory_items (product_id, quantity, reorder_point, reorder_quantity)
VALUES
  ('p0000000-0000-0000-0000-000000000001', 15, 5, 10),
  ('p0000000-0000-0000-0000-000000000002', 12, 5, 10),
  ('p0000000-0000-0000-0000-000000000003', 8, 3, 8),
  ('p0000000-0000-0000-0000-000000000004', 10, 3, 8),
  ('p0000000-0000-0000-0000-000000000005', 6, 3, 6);

-- =====================================================================
-- 10. LOYALTY SYSTEM
-- =====================================================================

INSERT INTO loyalty_tiers (id, salon_id, name, slug, min_points, points_multiplier, discount_percent, color_hex, sort_order)
VALUES
  ('lt000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Bronze', 'bronze', 0, 1.0, 0, '#CD7F32', 1),
  ('lt000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Silber', 'silver', 500, 1.2, 5, '#C0C0C0', 2),
  ('lt000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Gold', 'gold', 1000, 1.5, 10, '#FFD700', 3),
  ('lt000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Platin', 'platinum', 2000, 2.0, 15, '#E5E4E2', 4);

INSERT INTO loyalty_rewards (id, salon_id, name, description, type, points_cost, discount_percent, sort_order)
VALUES
  ('lr000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001', '10 CHF Rabatt', 'Einlösbar bei nächstem Besuch', 'discount_fixed', 200, NULL, 1),
  ('lr000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001', '20% Rabatt auf Produkte', 'Auf alle Produkte im Shop', 'discount_percent', 400, 20, 2),
  ('lr000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001', 'Gratis Haarkur', 'Intensive Pflege gratis', 'free_service', 600, NULL, 3);

-- Link free service reward
UPDATE loyalty_rewards SET service_id = 's0000000-0000-0000-0000-000000000008'
WHERE id = 'lr000000-0000-0000-0000-000000000003';

-- =====================================================================
-- 11. LEGAL DOCUMENTS
-- =====================================================================

INSERT INTO legal_documents (id, salon_id, type, title, slug, version, version_number, content, effective_from, is_current, requires_acceptance)
VALUES
  (
    'ld000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001',
    'privacy_policy',
    'Datenschutzerklärung',
    'privacy-policy',
    '1.0',
    1,
    '<h1>Datenschutzerklärung</h1><p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst...</p>',
    '2024-01-01',
    true,
    true
  ),
  (
    'ld000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001',
    'terms_conditions',
    'Allgemeine Geschäftsbedingungen',
    'terms-conditions',
    '1.0',
    1,
    '<h1>AGB</h1><p>Diese Geschäftsbedingungen regeln die Nutzung unserer Dienstleistungen...</p>',
    '2024-01-01',
    true,
    true
  );

-- =====================================================================
-- 10. SMS TEMPLATES
-- =====================================================================

INSERT INTO sms_templates (id, salon_id, name, slug, message_template, variables, active) VALUES
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Terminbestätigung',
    'appointment-confirmation',
    'Hallo {{customerName}}, Ihr Termin bei {{salonName}} wurde bestätigt: {{date}} um {{time}}. Bis bald!',
    '["customerName", "salonName", "date", "time"]'::jsonb,
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Terminerinnerung',
    'appointment-reminder',
    'Hallo {{customerName}}, Erinnerung: Morgen um {{time}} haben Sie einen Termin bei {{salonName}}. Wir freuen uns auf Sie!',
    '["customerName", "time", "salonName"]'::jsonb,
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Bestellbestätigung',
    'order-confirmation',
    'Hallo {{customerName}}, Ihre Bestellung #{{orderNumber}} wurde bestätigt. Gesamtbetrag: CHF {{total}}. Vielen Dank!',
    '["customerName", "orderNumber", "total"]'::jsonb,
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Versandbenachrichtigung',
    'order-shipped',
    'Ihre Bestellung #{{orderNumber}} wurde versandt. Trackingnummer: {{trackingNumber}}. Lieferung in 2-3 Werktagen.',
    '["orderNumber", "trackingNumber"]'::jsonb,
    true
  );

-- =====================================================================
-- COMPLETED
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Seed data successfully created!';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  - 1 Salon (SCHNITTWERK) with IBAN';
  RAISE NOTICE '  - 3 Staff members';
  RAISE NOTICE '  - 8 Services across 4 categories';
  RAISE NOTICE '  - 5 Products';
  RAISE NOTICE '  - 4 Loyalty tiers + 3 rewards';
  RAISE NOTICE '  - 2 Legal documents';
  RAISE NOTICE '  - 4 SMS templates';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to test!';
END $$;
