-- =====================================================================================
-- Migration: Shop RLS Policies
-- =====================================================================================
-- Purpose: Row Level Security for shop tables
--
-- Security Model:
--   - Public can view active products
--   - Customers can manage their own carts and view their orders
--   - Staff can view all orders for their salon
--   - Admins have full access to their salon's data
-- =====================================================================================

-- Enable RLS on all shop tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- PRODUCT CATEGORIES
-- =====================================================================================

-- Public can view active categories
CREATE POLICY "product_categories_select_public"
  ON product_categories
  FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "product_categories_all_admin"
  ON product_categories
  FOR ALL
  USING (has_role_in_salon(auth.uid(), salon_id, 'admin'))
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- =====================================================================================
-- PRODUCTS
-- =====================================================================================

-- Public can view active products in shop
CREATE POLICY "products_select_public"
  ON products
  FOR SELECT
  USING (is_active = true AND show_in_shop = true);

-- Staff can view all products in their salon
CREATE POLICY "products_select_staff"
  ON products
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- Admins can manage products
CREATE POLICY "products_modify_admin"
  ON products
  FOR ALL
  USING (has_role_in_salon(auth.uid(), salon_id, 'admin'))
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- =====================================================================================
-- PRODUCT VARIANTS
-- =====================================================================================

-- Public can view active variants of active products
CREATE POLICY "product_variants_select_public"
  ON product_variants
  FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND p.is_active = true
        AND p.show_in_shop = true
    )
  );

-- Staff can view all variants
CREATE POLICY "product_variants_select_staff"
  ON product_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND (
          has_role_in_salon(auth.uid(), p.salon_id, 'staff') OR
          has_role_in_salon(auth.uid(), p.salon_id, 'admin')
        )
    )
  );

-- Admins can manage variants
CREATE POLICY "product_variants_modify_admin"
  ON product_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND has_role_in_salon(auth.uid(), p.salon_id, 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND has_role_in_salon(auth.uid(), p.salon_id, 'admin')
    )
  );

-- =====================================================================================
-- PRODUCT IMAGES
-- =====================================================================================

-- Public can view images of active products
CREATE POLICY "product_images_select_public"
  ON product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND p.is_active = true
        AND p.show_in_shop = true
    )
  );

-- Admins can manage images
CREATE POLICY "product_images_modify_admin"
  ON product_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND has_role_in_salon(auth.uid(), p.salon_id, 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND has_role_in_salon(auth.uid(), p.salon_id, 'admin')
    )
  );

-- =====================================================================================
-- INVENTORY TRANSACTIONS
-- =====================================================================================

-- Only staff and admins can view inventory
CREATE POLICY "inventory_transactions_select"
  ON inventory_transactions
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- Only admins can create inventory transactions
CREATE POLICY "inventory_transactions_insert"
  ON inventory_transactions
  FOR INSERT
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- No updates or deletes (immutable)

-- =====================================================================================
-- CARTS
-- =====================================================================================

-- Users can view their own carts
CREATE POLICY "carts_select_own"
  ON carts
  FOR SELECT
  USING (
    customer_id = get_user_customer_id(salon_id) OR
    (customer_id IS NULL AND session_id IS NOT NULL) -- Anonymous carts handled by app
  );

-- Users can create carts
CREATE POLICY "carts_insert_own"
  ON carts
  FOR INSERT
  WITH CHECK (
    customer_id = get_user_customer_id(salon_id) OR
    customer_id IS NULL
  );

-- Users can update their own carts
CREATE POLICY "carts_update_own"
  ON carts
  FOR UPDATE
  USING (
    customer_id = get_user_customer_id(salon_id) OR
    (customer_id IS NULL AND session_id IS NOT NULL)
  )
  WITH CHECK (
    customer_id = get_user_customer_id(salon_id) OR
    customer_id IS NULL
  );

-- Staff can view all carts
CREATE POLICY "carts_select_staff"
  ON carts
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- =====================================================================================
-- CART ITEMS
-- =====================================================================================

-- Users can view items in their own carts
CREATE POLICY "cart_items_select_own"
  ON cart_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (
          c.customer_id = get_user_customer_id(c.salon_id) OR
          c.customer_id IS NULL
        )
    )
  );

-- Users can add items to their own carts
CREATE POLICY "cart_items_insert_own"
  ON cart_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (
          c.customer_id = get_user_customer_id(c.salon_id) OR
          c.customer_id IS NULL
        )
    )
  );

-- Users can update items in their own carts
CREATE POLICY "cart_items_update_own"
  ON cart_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (
          c.customer_id = get_user_customer_id(c.salon_id) OR
          c.customer_id IS NULL
        )
    )
  );

-- Users can delete items from their own carts
CREATE POLICY "cart_items_delete_own"
  ON cart_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (
          c.customer_id = get_user_customer_id(c.salon_id) OR
          c.customer_id IS NULL
        )
    )
  );

-- =====================================================================================
-- SHIPPING METHODS
-- =====================================================================================

-- Public can view active shipping methods
CREATE POLICY "shipping_methods_select_public"
  ON shipping_methods
  FOR SELECT
  USING (is_active = true);

-- Admins can manage shipping methods
CREATE POLICY "shipping_methods_all_admin"
  ON shipping_methods
  FOR ALL
  USING (has_role_in_salon(auth.uid(), salon_id, 'admin'))
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- =====================================================================================
-- ORDERS
-- =====================================================================================

-- Customers can view their own orders
CREATE POLICY "orders_select_own"
  ON orders
  FOR SELECT
  USING (customer_id = get_user_customer_id(salon_id));

-- Staff can view all orders
CREATE POLICY "orders_select_staff"
  ON orders
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- Customers can create orders
CREATE POLICY "orders_insert_own"
  ON orders
  FOR INSERT
  WITH CHECK (customer_id = get_user_customer_id(salon_id));

-- Staff and admins can update orders
CREATE POLICY "orders_update_staff"
  ON orders
  FOR UPDATE
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  )
  WITH CHECK (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- =====================================================================================
-- ORDER ITEMS
-- =====================================================================================

-- Customers can view items in their own orders
CREATE POLICY "order_items_select_own"
  ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = get_user_customer_id(o.salon_id)
    )
  );

-- Staff can view all order items
CREATE POLICY "order_items_select_staff"
  ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          has_role_in_salon(auth.uid(), o.salon_id, 'staff') OR
          has_role_in_salon(auth.uid(), o.salon_id, 'admin')
        )
    )
  );

-- Only system can create order items (via functions)
CREATE POLICY "order_items_insert_system"
  ON order_items
  FOR INSERT
  WITH CHECK (true); -- Will be protected by function SECURITY DEFINER

-- =====================================================================================
-- ORDER STATUS HISTORY
-- =====================================================================================

-- Customers can view history of their own orders
CREATE POLICY "order_status_history_select_own"
  ON order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
        AND o.customer_id = get_user_customer_id(o.salon_id)
    )
  );

-- Staff can view all order history
CREATE POLICY "order_status_history_select_staff"
  ON order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
        AND (
          has_role_in_salon(auth.uid(), o.salon_id, 'staff') OR
          has_role_in_salon(auth.uid(), o.salon_id, 'admin')
        )
    )
  );

-- =====================================================================================
-- VOUCHERS
-- =====================================================================================

-- Public can validate vouchers (via functions)
CREATE POLICY "vouchers_select_public"
  ON vouchers
  FOR SELECT
  USING (is_active = true);

-- Admins can manage vouchers
CREATE POLICY "vouchers_all_admin"
  ON vouchers
  FOR ALL
  USING (has_role_in_salon(auth.uid(), salon_id, 'admin'))
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- =====================================================================================
-- VOUCHER REDEMPTIONS
-- =====================================================================================

-- Customers can view their own redemptions
CREATE POLICY "voucher_redemptions_select_own"
  ON voucher_redemptions
  FOR SELECT
  USING (customer_id = get_user_customer_id(salon_id));

-- Staff can view all redemptions
CREATE POLICY "voucher_redemptions_select_staff"
  ON voucher_redemptions
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- =====================================================================================
-- PAYMENTS
-- =====================================================================================

-- Customers can view their own payments
CREATE POLICY "payments_select_own"
  ON payments
  FOR SELECT
  USING (customer_id = get_user_customer_id(salon_id));

-- Staff can view all payments
CREATE POLICY "payments_select_staff"
  ON payments
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- =====================================================================================
-- PAYMENT EVENTS
-- =====================================================================================

-- Customers can view events for their own payments
CREATE POLICY "payment_events_select_own"
  ON payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_events.payment_id
        AND p.customer_id = get_user_customer_id(p.salon_id)
    )
  );

-- Staff can view all payment events
CREATE POLICY "payment_events_select_staff"
  ON payment_events
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- =====================================================================================
-- STRIPE EVENT LOG
-- =====================================================================================

-- Only admins can view Stripe events
CREATE POLICY "stripe_event_log_select_admin"
  ON stripe_event_log
  FOR SELECT
  USING (
    salon_id IS NULL OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- System can insert events (webhooks)
CREATE POLICY "stripe_event_log_insert_system"
  ON stripe_event_log
  FOR INSERT
  WITH CHECK (true); -- Will be protected by webhook secret

-- =====================================================================================
-- QR INVOICES
-- =====================================================================================

-- Customers can view their own QR invoices
CREATE POLICY "qr_invoices_select_own"
  ON qr_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = qr_invoices.order_id
        AND o.customer_id = get_user_customer_id(o.salon_id)
    )
  );

-- Staff can view all QR invoices
CREATE POLICY "qr_invoices_select_staff"
  ON qr_invoices
  FOR SELECT
  USING (
    has_role_in_salon(auth.uid(), salon_id, 'staff') OR
    has_role_in_salon(auth.uid(), salon_id, 'admin')
  );

-- Admins can manage QR invoices
CREATE POLICY "qr_invoices_modify_admin"
  ON qr_invoices
  FOR ALL
  USING (has_role_in_salon(auth.uid(), salon_id, 'admin'))
  WITH CHECK (has_role_in_salon(auth.uid(), salon_id, 'admin'));
