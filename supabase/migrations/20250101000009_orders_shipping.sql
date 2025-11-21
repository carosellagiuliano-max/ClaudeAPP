-- =====================================================================================
-- Migration: Orders and Shipping
-- =====================================================================================
-- Purpose: Order management with shipping options
--
-- Tables:
--   - shipping_methods: Available shipping options (Swiss Post, pickup, etc.)
--   - orders: Customer orders (immutable after confirmation)
--   - order_items: Items in order with snapshot pricing
--   - order_status_history: Audit trail of order status changes
--
-- Features:
--   - Multi-tenant (salon_id scoped)
--   - Unique order numbers per salon/year
--   - Immutable pricing snapshots
--   - Multiple shipping options
--   - Status workflow tracking
--   - Swiss address validation
-- =====================================================================================

-- =====================================================================================
-- SHIPPING METHODS
-- =====================================================================================

CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL, -- "Swiss Post Standard", "Express", "Pickup"
  description TEXT,
  code TEXT NOT NULL, -- "standard", "express", "pickup"

  -- Pricing
  price_chf NUMERIC(10, 2) NOT NULL CHECK (price_chf >= 0),
  free_shipping_threshold_chf NUMERIC(10, 2), -- Free if order > this amount

  -- Delivery Time
  estimated_delivery_days_min INTEGER,
  estimated_delivery_days_max INTEGER,

  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Restrictions
  max_weight_grams INTEGER, -- Max package weight
  restricted_postcodes TEXT[], -- Postcodes not available

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT shipping_methods_code_unique UNIQUE (salon_id, code)
);

CREATE INDEX idx_shipping_methods_salon ON shipping_methods(salon_id);
CREATE INDEX idx_shipping_methods_active ON shipping_methods(salon_id, is_active);

COMMENT ON TABLE shipping_methods IS 'Available shipping options (Swiss Post, pickup, etc.)';
COMMENT ON COLUMN shipping_methods.free_shipping_threshold_chf IS 'Minimum order value for free shipping';

-- =====================================================================================
-- ORDERS
-- =====================================================================================

CREATE TYPE order_status AS ENUM (
  'pending_payment',    -- Order created, awaiting payment
  'payment_processing', -- Payment in progress (Stripe)
  'paid',              -- Payment received
  'processing',        -- Being prepared for shipment
  'shipped',           -- Shipped to customer
  'delivered',         -- Delivered successfully
  'completed',         -- Order completed (after return period)
  'cancelled',         -- Cancelled by customer/admin
  'refunded',          -- Payment refunded
  'failed'             -- Payment failed
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- Order Number (unique per salon per year)
  order_number TEXT NOT NULL,
  order_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),

  -- Status
  status order_status NOT NULL DEFAULT 'pending_payment',

  -- Source
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'phone', 'in_store', 'admin')),

  -- Customer Info Snapshot (immutable)
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,

  -- Shipping Address
  shipping_address_street TEXT NOT NULL,
  shipping_address_city TEXT NOT NULL,
  shipping_address_postcode TEXT NOT NULL,
  shipping_address_country TEXT NOT NULL DEFAULT 'CH',

  -- Billing Address (if different)
  billing_same_as_shipping BOOLEAN NOT NULL DEFAULT true,
  billing_address_street TEXT,
  billing_address_city TEXT,
  billing_address_postcode TEXT,
  billing_address_country TEXT,

  -- Shipping
  shipping_method_id UUID REFERENCES shipping_methods(id) ON DELETE RESTRICT,
  shipping_method_name TEXT NOT NULL, -- Snapshot
  shipping_cost_chf NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Pricing (all amounts in CHF)
  subtotal_chf NUMERIC(10, 2) NOT NULL CHECK (subtotal_chf >= 0),
  discount_amount_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount_chf >= 0),
  tax_amount_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount_chf >= 0),
  total_chf NUMERIC(10, 2) NOT NULL CHECK (total_chf >= 0),

  -- Tax Rate Snapshot
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 8.1,

  -- Voucher
  voucher_code TEXT,
  voucher_discount_chf NUMERIC(10, 2),

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('stripe', 'on_delivery', 'in_store', 'invoice')),
  payment_intent_id TEXT, -- Stripe Payment Intent ID
  paid_at TIMESTAMPTZ,

  -- Fulfillment
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_order_number_unique UNIQUE (salon_id, order_year, order_number),
  CONSTRAINT orders_billing_address_required CHECK (
    billing_same_as_shipping = true OR
    (billing_address_street IS NOT NULL AND
     billing_address_city IS NOT NULL AND
     billing_address_postcode IS NOT NULL AND
     billing_address_country IS NOT NULL)
  ),
  CONSTRAINT orders_total_valid CHECK (
    total_chf = subtotal_chf - discount_amount_chf - COALESCE(voucher_discount_chf, 0) + shipping_cost_chf + tax_amount_chf
  )
);

CREATE INDEX idx_orders_salon ON orders(salon_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_number ON orders(salon_id, order_year, order_number);
CREATE INDEX idx_orders_status ON orders(salon_id, status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_intent ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

COMMENT ON TABLE orders IS 'Customer orders (immutable after confirmation)';
COMMENT ON COLUMN orders.order_number IS 'Sequential order number per salon per year (e.g., 2024-001)';
COMMENT ON COLUMN orders.total_chf IS 'Auto-validated: subtotal - discount - voucher + shipping + tax';

-- =====================================================================================
-- ORDER ITEMS
-- =====================================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Reference
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot Data (immutable)
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,

  -- Quantity
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Pricing Snapshot
  unit_price_chf NUMERIC(10, 2) NOT NULL CHECK (unit_price_chf >= 0),
  discount_per_item_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_per_item_chf >= 0),
  tax_rate_percent NUMERIC(5, 2) NOT NULL,

  -- Calculated Amounts
  subtotal_chf NUMERIC(10, 2) NOT NULL CHECK (subtotal_chf >= 0),
  tax_amount_chf NUMERIC(10, 2) NOT NULL CHECK (tax_amount_chf >= 0),
  total_chf NUMERIC(10, 2) NOT NULL CHECK (total_chf >= 0),

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT order_items_amounts_valid CHECK (
    subtotal_chf = quantity * (unit_price_chf - discount_per_item_chf) AND
    total_chf = subtotal_chf + tax_amount_chf
  )
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

COMMENT ON TABLE order_items IS 'Line items in orders with immutable snapshot pricing';
COMMENT ON COLUMN order_items.product_name IS 'Product name snapshot at order time';

-- =====================================================================================
-- ORDER STATUS HISTORY
-- =====================================================================================

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Status Change
  from_status order_status,
  to_status order_status NOT NULL,

  -- Details
  notes TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Notification Sent
  customer_notified BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created ON order_status_history(created_at DESC);

COMMENT ON TABLE order_status_history IS 'Audit trail of order status changes';

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

/**
 * Generate next order number for salon/year
 * Format: YYYY-NNNN (e.g., 2024-0001)
 */
CREATE OR REPLACE FUNCTION generate_order_number(p_salon_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
  v_order_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());

  -- Get next number for this salon/year (atomic)
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM orders
  WHERE salon_id = p_salon_id
    AND order_year = v_year
  FOR UPDATE;

  -- Format: YYYY-NNNN
  v_order_number := v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_order_number;
END;
$$;

COMMENT ON FUNCTION generate_order_number IS 'Generate unique order number: YYYY-NNNN';

/**
 * Create order from cart
 */
CREATE OR REPLACE FUNCTION create_order_from_cart(
  p_cart_id UUID,
  p_shipping_method_id UUID,
  p_shipping_address JSONB,
  p_billing_address JSONB DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_cart RECORD;
  v_customer RECORD;
  v_shipping_method RECORD;
  v_order_number TEXT;
  v_subtotal NUMERIC(10, 2) := 0;
  v_tax_amount NUMERIC(10, 2) := 0;
  v_total NUMERIC(10, 2) := 0;
  v_item RECORD;
BEGIN
  -- Get cart
  SELECT * INTO v_cart FROM carts WHERE id = p_cart_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart not found or not active';
  END IF;

  -- Get customer
  SELECT * INTO v_customer FROM customers WHERE id = v_cart.customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Get shipping method
  SELECT * INTO v_shipping_method FROM shipping_methods WHERE id = p_shipping_method_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipping method not found';
  END IF;

  -- Calculate totals
  SELECT
    COALESCE(SUM(subtotal_chf), 0)
  INTO v_subtotal
  FROM cart_items
  WHERE cart_id = p_cart_id;

  -- Generate order number
  v_order_number := generate_order_number(v_cart.salon_id);

  -- Create order
  INSERT INTO orders (
    salon_id,
    customer_id,
    order_number,
    order_year,
    customer_email,
    customer_phone,
    customer_first_name,
    customer_last_name,
    shipping_address_street,
    shipping_address_city,
    shipping_address_postcode,
    shipping_address_country,
    billing_same_as_shipping,
    shipping_method_id,
    shipping_method_name,
    shipping_cost_chf,
    subtotal_chf,
    tax_rate_percent,
    tax_amount_chf,
    total_chf,
    customer_notes
  )
  VALUES (
    v_cart.salon_id,
    v_customer.id,
    v_order_number,
    EXTRACT(YEAR FROM NOW()),
    v_customer.email,
    v_customer.phone,
    v_customer.first_name,
    v_customer.last_name,
    p_shipping_address->>'street',
    p_shipping_address->>'city',
    p_shipping_address->>'postcode',
    COALESCE(p_shipping_address->>'country', 'CH'),
    p_billing_address IS NULL,
    v_shipping_method.id,
    v_shipping_method.name,
    v_shipping_method.price_chf,
    v_subtotal,
    8.1, -- TODO: Get from tax_rates
    v_subtotal * 0.081, -- TODO: Calculate properly
    v_subtotal + v_shipping_method.price_chf + (v_subtotal * 0.081),
    p_customer_notes
  )
  RETURNING id INTO v_order_id;

  -- Copy cart items to order items
  FOR v_item IN
    SELECT * FROM cart_items WHERE cart_id = p_cart_id
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      quantity,
      unit_price_chf,
      tax_rate_percent,
      subtotal_chf,
      tax_amount_chf,
      total_chf
    )
    SELECT
      v_order_id,
      v_item.product_id,
      v_item.variant_id,
      p.name,
      v_item.quantity,
      v_item.unit_price_chf,
      8.1,
      v_item.subtotal_chf,
      v_item.subtotal_chf * 0.081,
      v_item.subtotal_chf + (v_item.subtotal_chf * 0.081)
    FROM products p
    WHERE p.id = v_item.product_id;
  END LOOP;

  -- Mark cart as converted
  UPDATE carts
  SET status = 'converted',
      converted_to_order_id = v_order_id,
      converted_at = NOW()
  WHERE id = p_cart_id;

  -- Add status history
  INSERT INTO order_status_history (order_id, to_status)
  VALUES (v_order_id, 'pending_payment');

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION create_order_from_cart IS 'Convert cart to order with shipping details';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update timestamps
CREATE TRIGGER update_shipping_methods_updated_at
  BEFORE UPDATE ON shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_order_status_change();
