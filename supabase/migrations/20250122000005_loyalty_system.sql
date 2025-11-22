-- =====================================================================
-- LOYALTY SYSTEM
-- =====================================================================
-- Treueprogramm mit Punkten, Tiers und Rewards
-- Features:
-- - Points sammeln bei Käufen und Terminen
-- - Tier-System (Bronze, Silver, Gold, Platinum)
-- - Rewards (Rabatte, Gratis-Services)
-- - Transaction History
-- - Auto-upgrade bei erreichen von Punktzahl
-- =====================================================================

-- =====================================================================
-- LOYALTY TIERS (Pro Salon konfigurierbar)
-- =====================================================================

CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Tier Details
  name TEXT NOT NULL, -- z.B. "Bronze", "Silver", "Gold", "Platinum"
  slug TEXT NOT NULL, -- z.B. "bronze", "silver"
  description TEXT,

  -- Anforderungen
  min_points INTEGER NOT NULL DEFAULT 0, -- Mindestpunkte für diesen Tier

  -- Benefits
  points_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- z.B. 1.5x Punkte für Gold
  discount_percent DECIMAL(5,2) DEFAULT 0, -- Rabatt in Prozent

  -- Farbe für UI
  color_hex TEXT DEFAULT '#808080',
  icon_name TEXT, -- z.B. "star", "crown", "diamond"

  -- Sortierung
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Meta
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(salon_id, slug),
  CHECK (min_points >= 0),
  CHECK (points_multiplier >= 1.0),
  CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

CREATE INDEX idx_loyalty_tiers_salon ON loyalty_tiers(salon_id, active);

-- =====================================================================
-- LOYALTY ACCOUNTS (1 pro Customer pro Salon)
-- =====================================================================

CREATE TABLE loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Punktestand
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0, -- Total jemals gesammelt

  -- Aktueller Tier
  current_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,

  -- Statistiken
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0, -- CHF

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(salon_id, customer_id),
  CHECK (points_balance >= 0),
  CHECK (lifetime_points >= 0),
  CHECK (total_visits >= 0),
  CHECK (total_spent >= 0)
);

CREATE INDEX idx_loyalty_accounts_salon ON loyalty_accounts(salon_id, active);
CREATE INDEX idx_loyalty_accounts_customer ON loyalty_accounts(customer_id);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(current_tier_id);

-- =====================================================================
-- LOYALTY TRANSACTIONS (Immutable Audit Trail)
-- =====================================================================

CREATE TYPE loyalty_transaction_type AS ENUM (
  'earned',        -- Punkte verdient
  'redeemed',      -- Punkte eingelöst
  'expired',       -- Punkte abgelaufen
  'adjusted',      -- Manuelle Anpassung (Admin)
  'bonus',         -- Bonus-Punkte (Marketing)
  'reverted'       -- Rückgängig gemacht (z.B. Storno)
);

CREATE TYPE loyalty_transaction_source AS ENUM (
  'appointment',   -- Termin abgeschlossen
  'order',         -- Bestellung
  'reward',        -- Reward eingelöst
  'referral',      -- Freunde geworben
  'birthday',      -- Geburtstags-Bonus
  'manual',        -- Admin-Anpassung
  'signup'         -- Registrierungs-Bonus
);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,

  -- Transaction Details
  type loyalty_transaction_type NOT NULL,
  source loyalty_transaction_source NOT NULL,

  -- Punkte
  points INTEGER NOT NULL, -- Positiv = earned, Negativ = redeemed
  balance_after INTEGER NOT NULL, -- Punktestand nach dieser Transaktion

  -- Referenzen
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,

  -- Beschreibung
  description TEXT,
  notes TEXT, -- Admin notes (für manual adjustments)

  -- Meta
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Wer hat es erstellt (für manual)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (points != 0) -- Muss entweder positiv oder negativ sein
);

CREATE INDEX idx_loyalty_transactions_salon ON loyalty_transactions(salon_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_account ON loyalty_transactions(account_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_order ON loyalty_transactions(order_id);
CREATE INDEX idx_loyalty_transactions_appointment ON loyalty_transactions(appointment_id);

-- =====================================================================
-- LOYALTY REWARDS (Einlösbare Belohnungen)
-- =====================================================================

CREATE TYPE reward_type AS ENUM (
  'discount_percent',  -- Prozent-Rabatt
  'discount_fixed',    -- Fixer CHF Rabatt
  'free_service',      -- Gratis Service
  'free_product',      -- Gratis Produkt
  'voucher'            -- Gutschein-Code
);

CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Reward Details
  name TEXT NOT NULL,
  description TEXT,
  type reward_type NOT NULL,

  -- Kosten
  points_cost INTEGER NOT NULL,

  -- Wert (je nach type)
  discount_percent DECIMAL(5,2), -- Für discount_percent
  discount_fixed DECIMAL(10,2),  -- Für discount_fixed (CHF)
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Für free_service
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Für free_product
  voucher_code TEXT, -- Für voucher

  -- Verfügbarkeit
  requires_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL, -- Nur für bestimmten Tier
  max_redemptions_per_customer INTEGER, -- z.B. nur 1x pro Kunde
  max_redemptions_total INTEGER, -- Total verfügbar
  current_redemptions INTEGER NOT NULL DEFAULT 0,

  -- Gültigkeit
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  -- Sortierung
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (points_cost > 0),
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  CHECK (discount_fixed IS NULL OR discount_fixed >= 0),
  CHECK (current_redemptions >= 0),
  CHECK (max_redemptions_total IS NULL OR current_redemptions <= max_redemptions_total)
);

CREATE INDEX idx_loyalty_rewards_salon ON loyalty_rewards(salon_id, active);
CREATE INDEX idx_loyalty_rewards_tier ON loyalty_rewards(requires_tier_id);

-- =====================================================================
-- LOYALTY REWARD REDEMPTIONS (Tracking von eingelösten Rewards)
-- =====================================================================

CREATE TABLE loyalty_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Beziehungen
  reward_id UUID NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES loyalty_transactions(id) ON DELETE CASCADE,

  -- Verwendung
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired', 'revoked'

  -- Gültigkeit
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (status IN ('active', 'used', 'expired', 'revoked'))
);

CREATE INDEX idx_loyalty_redemptions_salon ON loyalty_reward_redemptions(salon_id, created_at DESC);
CREATE INDEX idx_loyalty_redemptions_account ON loyalty_reward_redemptions(account_id);
CREATE INDEX idx_loyalty_redemptions_reward ON loyalty_reward_redemptions(reward_id);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- Loyalty Tiers
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_tiers_select" ON loyalty_tiers
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "loyalty_tiers_insert" ON loyalty_tiers
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "loyalty_tiers_update" ON loyalty_tiers
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "loyalty_tiers_delete" ON loyalty_tiers
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- Loyalty Accounts
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_accounts_select" ON loyalty_accounts
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "loyalty_accounts_insert" ON loyalty_accounts
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "loyalty_accounts_update" ON loyalty_accounts
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- Loyalty Transactions (Read-only für Customers, Full für Staff)
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_transactions_select" ON loyalty_transactions
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
    OR account_id IN (
      SELECT id FROM loyalty_accounts WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "loyalty_transactions_insert" ON loyalty_transactions
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

-- Loyalty Rewards
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_rewards_select" ON loyalty_rewards
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
    OR (active = true) -- Customers können aktive Rewards sehen
  );

CREATE POLICY "loyalty_rewards_insert" ON loyalty_rewards
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "loyalty_rewards_update" ON loyalty_rewards
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

CREATE POLICY "loyalty_rewards_delete" ON loyalty_rewards
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- Loyalty Reward Redemptions
ALTER TABLE loyalty_reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_redemptions_select" ON loyalty_reward_redemptions
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
    OR account_id IN (
      SELECT id FROM loyalty_accounts WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "loyalty_redemptions_insert" ON loyalty_reward_redemptions
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_access(auth.uid(), id))
  );

CREATE POLICY "loyalty_redemptions_update" ON loyalty_reward_redemptions
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_has_salon_role(auth.uid(), id, 'admin'))
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Auto-upgrade tier based on points
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_tier_id UUID;
BEGIN
  -- Finde den höchsten passenden Tier für die Punktzahl
  SELECT id INTO v_tier_id
  FROM loyalty_tiers
  WHERE salon_id = NEW.salon_id
    AND active = true
    AND min_points <= NEW.lifetime_points
  ORDER BY min_points DESC
  LIMIT 1;

  -- Update tier falls geändert
  IF v_tier_id IS DISTINCT FROM NEW.current_tier_id THEN
    NEW.current_tier_id := v_tier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loyalty_tier
  BEFORE INSERT OR UPDATE OF lifetime_points ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_tier();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_loyalty_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_loyalty_tiers_updated_at
  BEFORE UPDATE ON loyalty_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_timestamps();

CREATE TRIGGER trigger_loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_timestamps();

CREATE TRIGGER trigger_loyalty_rewards_updated_at
  BEFORE UPDATE ON loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_timestamps();

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE loyalty_tiers IS 'Treueprogramm-Stufen (Bronze, Silver, Gold, etc.)';
COMMENT ON TABLE loyalty_accounts IS 'Kundenkonto im Treueprogramm mit Punktestand';
COMMENT ON TABLE loyalty_transactions IS 'Unveränderlicher Audit-Trail aller Punktebewegungen';
COMMENT ON TABLE loyalty_rewards IS 'Einlösbare Belohnungen (Rabatte, Gratis-Services, etc.)';
COMMENT ON TABLE loyalty_reward_redemptions IS 'Tracking von eingelösten Rewards';
