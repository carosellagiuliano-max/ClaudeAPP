-- =====================================================================================
-- Migration: Shopping Cart
-- =====================================================================================
-- Purpose: Session-based shopping cart for online shop
--
-- Tables:
--   - carts: Shopping cart sessions
--   - cart_items: Items in cart
--
-- Features:
--   - Anonymous and authenticated carts
--   - Automatic cart expiry (30 days)
--   - Merge carts on login
--   - Price snapshot at add-to-cart
--   - Stock validation
-- =====================================================================================

-- =====================================================================================
-- CARTS
-- =====================================================================================

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Customer (nullable for anonymous carts)
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Session tracking for anonymous users
  session_id TEXT, -- Browser session ID

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned', 'merged')),

  -- Converted to order
  converted_to_order_id UUID, -- Will link to orders table
  converted_at TIMESTAMPTZ,

  -- Expiry (auto-cleanup after 30 days)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT carts_customer_or_session CHECK (
    customer_id IS NOT NULL OR session_id IS NOT NULL
  ),
  CONSTRAINT carts_conversion_complete CHECK (
    (status = 'converted' AND converted_to_order_id IS NOT NULL AND converted_at IS NOT NULL) OR
    (status != 'converted')
  )
);

CREATE INDEX idx_carts_salon ON carts(salon_id);
CREATE INDEX idx_carts_customer ON carts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_carts_status ON carts(salon_id, status);
CREATE INDEX idx_carts_expires ON carts(expires_at) WHERE status = 'active';

COMMENT ON TABLE carts IS 'Shopping carts for both anonymous and authenticated users';
COMMENT ON COLUMN carts.session_id IS 'Browser session ID for anonymous users';
COMMENT ON COLUMN carts.expires_at IS 'Auto-cleanup date (30 days from last activity)';

-- =====================================================================================
-- CART ITEMS
-- =====================================================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,

  -- Product Reference
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Price Snapshot (captured at add-to-cart)
  unit_price_chf NUMERIC(10, 2) NOT NULL CHECK (unit_price_chf >= 0),
  discount_amount_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount_chf >= 0),

  -- Calculated
  subtotal_chf NUMERIC(10, 2) GENERATED ALWAYS AS (
    quantity * unit_price_chf - discount_amount_chf
  ) STORED,

  -- Notes (e.g., gift message)
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique product/variant per cart
  CONSTRAINT cart_items_unique_item UNIQUE (cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);

COMMENT ON TABLE cart_items IS 'Items in shopping cart';
COMMENT ON COLUMN cart_items.unit_price_chf IS 'Price snapshot at time item was added to cart';
COMMENT ON COLUMN cart_items.subtotal_chf IS 'Auto-calculated: (quantity * unit_price) - discount';

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

/**
 * Get or create cart for customer/session
 * Returns existing active cart or creates new one
 */
CREATE OR REPLACE FUNCTION get_or_create_cart(
  p_salon_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  -- Find existing active cart
  SELECT id INTO v_cart_id
  FROM carts
  WHERE salon_id = p_salon_id
    AND status = 'active'
    AND (
      (p_customer_id IS NOT NULL AND customer_id = p_customer_id) OR
      (p_session_id IS NOT NULL AND session_id = p_session_id)
    )
  ORDER BY last_activity_at DESC
  LIMIT 1;

  -- Create new cart if not found
  IF v_cart_id IS NULL THEN
    INSERT INTO carts (salon_id, customer_id, session_id)
    VALUES (p_salon_id, p_customer_id, p_session_id)
    RETURNING id INTO v_cart_id;
  ELSE
    -- Update last activity
    UPDATE carts
    SET last_activity_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days'
    WHERE id = v_cart_id;
  END IF;

  RETURN v_cart_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_cart IS 'Get existing active cart or create new one for customer/session';

/**
 * Merge anonymous cart to customer cart on login
 */
CREATE OR REPLACE FUNCTION merge_carts(
  p_customer_id UUID,
  p_session_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_cart_id UUID;
  v_session_cart_id UUID;
  v_item RECORD;
BEGIN
  -- Find customer's cart
  SELECT id INTO v_customer_cart_id
  FROM carts
  WHERE customer_id = p_customer_id
    AND status = 'active'
  ORDER BY last_activity_at DESC
  LIMIT 1;

  -- Find session cart
  SELECT id INTO v_session_cart_id
  FROM carts
  WHERE session_id = p_session_id
    AND status = 'active'
    AND customer_id IS NULL
  ORDER BY last_activity_at DESC
  LIMIT 1;

  -- If both exist, merge session cart into customer cart
  IF v_customer_cart_id IS NOT NULL AND v_session_cart_id IS NOT NULL THEN
    -- Merge items
    FOR v_item IN
      SELECT * FROM cart_items WHERE cart_id = v_session_cart_id
    LOOP
      -- Try to update existing item
      UPDATE cart_items
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE cart_id = v_customer_cart_id
        AND product_id = v_item.product_id
        AND (variant_id = v_item.variant_id OR (variant_id IS NULL AND v_item.variant_id IS NULL));

      -- If no row updated, insert new item
      IF NOT FOUND THEN
        INSERT INTO cart_items (
          cart_id, product_id, variant_id, quantity,
          unit_price_chf, discount_amount_chf, notes
        )
        VALUES (
          v_customer_cart_id, v_item.product_id, v_item.variant_id, v_item.quantity,
          v_item.unit_price_chf, v_item.discount_amount_chf, v_item.notes
        );
      END IF;
    END LOOP;

    -- Mark session cart as merged
    UPDATE carts
    SET status = 'merged',
        updated_at = NOW()
    WHERE id = v_session_cart_id;

  -- If only session cart exists, link it to customer
  ELSIF v_session_cart_id IS NOT NULL THEN
    UPDATE carts
    SET customer_id = p_customer_id,
        session_id = NULL,
        updated_at = NOW()
    WHERE id = v_session_cart_id;
  END IF;

END;
$$;

COMMENT ON FUNCTION merge_carts IS 'Merge anonymous session cart into customer cart on login';

/**
 * Clean up expired carts (to be run daily via cron)
 */
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Mark expired carts as abandoned
  UPDATE carts
  SET status = 'abandoned',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_carts IS 'Mark expired carts as abandoned (run daily via cron)';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update timestamps
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update cart last_activity_at when items change
CREATE OR REPLACE FUNCTION update_cart_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE carts
  SET last_activity_at = NOW(),
      expires_at = NOW() + INTERVAL '30 days'
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER cart_items_activity_insert
  AFTER INSERT ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_activity();

CREATE TRIGGER cart_items_activity_update
  AFTER UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_activity();

CREATE TRIGGER cart_items_activity_delete
  AFTER DELETE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_activity();
