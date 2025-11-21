-- =====================================================================================
-- Migration: Vouchers and Gift Cards
-- =====================================================================================
-- Purpose: Discount vouchers and gift cards
--
-- Tables:
--   - vouchers: Discount codes and gift cards
--   - voucher_redemptions: Usage tracking
--
-- Features:
--   - Percentage and fixed amount discounts
--   - Single-use and multi-use codes
--   - Validity periods
--   - Usage limits
--   - Minimum order requirements
--   - Product/category restrictions
-- =====================================================================================

-- =====================================================================================
-- VOUCHERS
-- =====================================================================================

CREATE TYPE voucher_type AS ENUM (
  'percentage',     -- Percentage discount (e.g., 10% off)
  'fixed_amount',   -- Fixed CHF discount (e.g., CHF 20 off)
  'gift_card'       -- Gift card with balance
);

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Code
  code TEXT NOT NULL,

  -- Type
  type voucher_type NOT NULL,

  -- Discount Value
  discount_percent NUMERIC(5, 2) CHECK (
    discount_percent IS NULL OR
    (discount_percent > 0 AND discount_percent <= 100)
  ),
  discount_amount_chf NUMERIC(10, 2) CHECK (
    discount_amount_chf IS NULL OR
    discount_amount_chf > 0
  ),

  -- Gift Card Balance
  initial_balance_chf NUMERIC(10, 2) CHECK (
    initial_balance_chf IS NULL OR
    initial_balance_chf > 0
  ),
  remaining_balance_chf NUMERIC(10, 2) CHECK (
    remaining_balance_chf IS NULL OR
    remaining_balance_chf >= 0
  ),

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Usage Limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),

  -- Restrictions
  min_order_amount_chf NUMERIC(10, 2),
  max_discount_amount_chf NUMERIC(10, 2), -- Cap for percentage discounts

  -- Product Restrictions (NULL = applies to all)
  allowed_product_ids UUID[],
  allowed_category_ids UUID[],

  -- Customer Restrictions
  allowed_customer_ids UUID[], -- NULL = all customers
  first_order_only BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Notes
  description TEXT,
  internal_notes TEXT,

  -- Created by
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vouchers_code_unique UNIQUE (salon_id, code),
  CONSTRAINT vouchers_type_value_valid CHECK (
    (type = 'percentage' AND discount_percent IS NOT NULL) OR
    (type = 'fixed_amount' AND discount_amount_chf IS NOT NULL) OR
    (type = 'gift_card' AND initial_balance_chf IS NOT NULL AND remaining_balance_chf IS NOT NULL)
  ),
  CONSTRAINT vouchers_validity_period_valid CHECK (
    valid_until IS NULL OR valid_from < valid_until
  ),
  CONSTRAINT vouchers_uses_valid CHECK (
    max_uses IS NULL OR current_uses <= max_uses
  )
);

CREATE INDEX idx_vouchers_salon ON vouchers(salon_id);
CREATE INDEX idx_vouchers_code ON vouchers(salon_id, code);
CREATE INDEX idx_vouchers_active ON vouchers(salon_id, is_active);
CREATE INDEX idx_vouchers_valid ON vouchers(salon_id, is_active, valid_from, valid_until);

COMMENT ON TABLE vouchers IS 'Discount codes, promotional vouchers, and gift cards';
COMMENT ON COLUMN vouchers.code IS 'Voucher code (e.g., SUMMER2024, WELCOME10)';
COMMENT ON COLUMN vouchers.max_uses IS 'NULL = unlimited uses';
COMMENT ON COLUMN vouchers.remaining_balance_chf IS 'For gift cards: remaining balance';

-- =====================================================================================
-- VOUCHER REDEMPTIONS
-- =====================================================================================

CREATE TABLE voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Order Reference
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Discount Applied
  discount_amount_chf NUMERIC(10, 2) NOT NULL CHECK (discount_amount_chf > 0),

  -- Status
  status TEXT NOT NULL DEFAULT 'applied' CHECK (
    status IN ('applied', 'used', 'refunded')
  ),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id);
CREATE INDEX idx_voucher_redemptions_customer ON voucher_redemptions(customer_id);
CREATE INDEX idx_voucher_redemptions_order ON voucher_redemptions(order_id);
CREATE INDEX idx_voucher_redemptions_created ON voucher_redemptions(created_at DESC);

COMMENT ON TABLE voucher_redemptions IS 'Tracking of voucher usage';
COMMENT ON COLUMN voucher_redemptions.status IS 'applied = pending order, used = order complete, refunded = order refunded';

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

/**
 * Validate voucher code
 * Returns voucher details if valid, raises exception if invalid
 */
CREATE OR REPLACE FUNCTION validate_voucher(
  p_salon_id UUID,
  p_code TEXT,
  p_customer_id UUID,
  p_order_total_chf NUMERIC
)
RETURNS TABLE (
  voucher_id UUID,
  discount_amount NUMERIC,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher RECORD;
  v_customer_uses INTEGER;
  v_discount NUMERIC;
BEGIN
  -- Get voucher
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE salon_id = p_salon_id
    AND code = UPPER(p_code)
    AND is_active = true;

  -- Check if voucher exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, false, 'Ungültiger Gutscheincode'::TEXT;
    RETURN;
  END IF;

  -- Check validity period
  IF v_voucher.valid_from > NOW() THEN
    RETURN QUERY SELECT v_voucher.id, 0::NUMERIC, false, 'Gutschein ist noch nicht gültig'::TEXT;
    RETURN;
  END IF;

  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < NOW() THEN
    RETURN QUERY SELECT v_voucher.id, 0::NUMERIC, false, 'Gutschein ist abgelaufen'::TEXT;
    RETURN;
  END IF;

  -- Check max uses
  IF v_voucher.max_uses IS NOT NULL AND v_voucher.current_uses >= v_voucher.max_uses THEN
    RETURN QUERY SELECT v_voucher.id, 0::NUMERIC, false, 'Gutschein wurde bereits vollständig eingelöst'::TEXT;
    RETURN;
  END IF;

  -- Check customer usage limit
  SELECT COUNT(*) INTO v_customer_uses
  FROM voucher_redemptions
  WHERE voucher_id = v_voucher.id
    AND customer_id = p_customer_id
    AND status != 'refunded';

  IF v_voucher.max_uses_per_customer IS NOT NULL AND v_customer_uses >= v_voucher.max_uses_per_customer THEN
    RETURN QUERY SELECT v_voucher.id, 0::NUMERIC, false, 'Sie haben diesen Gutschein bereits verwendet'::TEXT;
    RETURN;
  END IF;

  -- Check minimum order amount
  IF v_voucher.min_order_amount_chf IS NOT NULL AND p_order_total_chf < v_voucher.min_order_amount_chf THEN
    RETURN QUERY SELECT v_voucher.id, 0::NUMERIC, false,
      FORMAT('Mindestbestellwert: CHF %.2f', v_voucher.min_order_amount_chf)::TEXT;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_voucher.type = 'percentage' THEN
    v_discount := p_order_total_chf * (v_voucher.discount_percent / 100);

    -- Apply max discount cap if set
    IF v_voucher.max_discount_amount_chf IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_voucher.max_discount_amount_chf);
    END IF;

  ELSIF v_voucher.type = 'fixed_amount' THEN
    v_discount := LEAST(v_voucher.discount_amount_chf, p_order_total_chf);

  ELSIF v_voucher.type = 'gift_card' THEN
    v_discount := LEAST(v_voucher.remaining_balance_chf, p_order_total_chf);
  END IF;

  -- Return valid voucher
  RETURN QUERY SELECT v_voucher.id, v_discount, true, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION validate_voucher IS 'Validate voucher code and calculate discount';

/**
 * Redeem voucher (apply to order)
 */
CREATE OR REPLACE FUNCTION redeem_voucher(
  p_voucher_id UUID,
  p_customer_id UUID,
  p_order_id UUID,
  p_discount_amount_chf NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption_id UUID;
  v_voucher RECORD;
BEGIN
  -- Get voucher
  SELECT * INTO v_voucher FROM vouchers WHERE id = p_voucher_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  -- Create redemption record
  INSERT INTO voucher_redemptions (
    voucher_id,
    salon_id,
    customer_id,
    order_id,
    discount_amount_chf,
    status
  )
  VALUES (
    p_voucher_id,
    v_voucher.salon_id,
    p_customer_id,
    p_order_id,
    p_discount_amount_chf,
    'applied'
  )
  RETURNING id INTO v_redemption_id;

  -- Update voucher usage
  UPDATE vouchers
  SET current_uses = current_uses + 1,
      remaining_balance_chf = CASE
        WHEN type = 'gift_card' THEN remaining_balance_chf - p_discount_amount_chf
        ELSE remaining_balance_chf
      END,
      updated_at = NOW()
  WHERE id = p_voucher_id;

  RETURN v_redemption_id;
END;
$$;

COMMENT ON FUNCTION redeem_voucher IS 'Apply voucher to order and track redemption';

/**
 * Refund voucher (on order cancellation/refund)
 */
CREATE OR REPLACE FUNCTION refund_voucher(
  p_redemption_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  -- Get redemption
  SELECT * INTO v_redemption
  FROM voucher_redemptions
  WHERE id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Redemption not found';
  END IF;

  -- Update redemption status
  UPDATE voucher_redemptions
  SET status = 'refunded',
      refunded_at = NOW()
  WHERE id = p_redemption_id;

  -- Restore voucher
  UPDATE vouchers
  SET current_uses = GREATEST(current_uses - 1, 0),
      remaining_balance_chf = CASE
        WHEN type = 'gift_card' THEN remaining_balance_chf + v_redemption.discount_amount_chf
        ELSE remaining_balance_chf
      END,
      updated_at = NOW()
  WHERE id = v_redemption.voucher_id;
END;
$$;

COMMENT ON FUNCTION refund_voucher IS 'Refund voucher on order cancellation';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
