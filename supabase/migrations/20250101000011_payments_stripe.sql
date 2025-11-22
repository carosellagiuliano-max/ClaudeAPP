-- =====================================================================================
-- Migration: Payments and Stripe Integration
-- =====================================================================================
-- Purpose: Payment processing with Stripe integration
--
-- Tables:
--   - payments: Payment records (immutable accounting)
--   - payment_events: Payment lifecycle events (captures, refunds, chargebacks)
--   - stripe_event_log: Webhook event log with idempotency
--
-- Features:
--   - Multi-payment-method support (Stripe, cash, invoice)
--   - Immutable payment records for accounting
--   - Event-driven payment lifecycle
--   - Stripe webhook handling with idempotency
--   - Refund and chargeback tracking
--   - QR invoice preparation (Swiss QR-bill)
-- =====================================================================================

-- =====================================================================================
-- PAYMENTS
-- =====================================================================================

CREATE TYPE payment_method_type AS ENUM (
  'stripe_card',        -- Credit/debit card via Stripe
  'stripe_twint',       -- TWINT via Stripe
  'stripe_ideal',       -- iDEAL (Netherlands)
  'cash',              -- Cash payment in-store
  'invoice',           -- Invoice (pay later)
  'on_delivery',       -- Pay on delivery (COD)
  'qr_invoice'         -- Swiss QR-bill
);

CREATE TYPE payment_status AS ENUM (
  'pending',           -- Payment initiated
  'processing',        -- Payment processing
  'succeeded',         -- Payment successful
  'failed',            -- Payment failed
  'cancelled',         -- Payment cancelled
  'refunded',          -- Fully refunded
  'partially_refunded' -- Partially refunded
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Order Reference
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- Payment Method
  payment_method payment_method_type NOT NULL,

  -- Stripe References
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,

  -- Amounts (in CHF)
  amount_chf NUMERIC(10, 2) NOT NULL CHECK (amount_chf > 0),
  refunded_amount_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount_chf >= 0),
  fee_chf NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fee_chf >= 0), -- Processing fee

  -- Currency (for Stripe multi-currency support)
  currency TEXT NOT NULL DEFAULT 'CHF',

  -- Status
  status payment_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- Failure Info
  failure_code TEXT,
  failure_message TEXT,

  -- Receipt
  receipt_url TEXT,
  receipt_number TEXT,

  -- Metadata
  metadata JSONB,

  CONSTRAINT payments_stripe_intent_unique UNIQUE (stripe_payment_intent_id),
  CONSTRAINT payments_refund_valid CHECK (refunded_amount_chf <= amount_chf),
  CONSTRAINT payments_status_timestamps CHECK (
    (status = 'succeeded' AND succeeded_at IS NOT NULL) OR
    (status = 'failed' AND failed_at IS NOT NULL) OR
    (status IN ('refunded', 'partially_refunded') AND refunded_at IS NOT NULL) OR
    (status IN ('pending', 'processing', 'cancelled'))
  )
);

CREATE INDEX idx_payments_salon ON payments(salon_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(salon_id, status);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payments_created ON payments(created_at DESC);

COMMENT ON TABLE payments IS 'Payment records (immutable for accounting)';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for tracking';
COMMENT ON COLUMN payments.fee_chf IS 'Payment processing fee (Stripe takes ~2.9% + CHF 0.30)';

-- =====================================================================================
-- PAYMENT EVENTS
-- =====================================================================================

CREATE TYPE payment_event_type AS ENUM (
  'payment_created',
  'payment_processing',
  'payment_succeeded',
  'payment_failed',
  'payment_cancelled',
  'refund_initiated',
  'refund_succeeded',
  'refund_failed',
  'chargeback_initiated',
  'chargeback_reversed',
  'dispute_created',
  'dispute_won',
  'dispute_lost'
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Event Type
  event_type payment_event_type NOT NULL,

  -- Amount (for refunds/chargebacks)
  amount_chf NUMERIC(10, 2) CHECK (amount_chf IS NULL OR amount_chf > 0),

  -- Stripe Event Reference
  stripe_event_id TEXT,

  -- Details
  reason TEXT,
  metadata JSONB,

  -- Performed by (for manual events)
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_salon ON payment_events(salon_id);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_stripe ON payment_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX idx_payment_events_created ON payment_events(created_at DESC);

COMMENT ON TABLE payment_events IS 'Immutable log of payment lifecycle events';
COMMENT ON COLUMN payment_events.stripe_event_id IS 'Stripe webhook event ID for deduplication';

-- =====================================================================================
-- STRIPE EVENT LOG
-- =====================================================================================

CREATE TABLE stripe_event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,

  -- Stripe Event
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,

  -- Payload
  payload JSONB NOT NULL,

  -- Processing
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Idempotency
  idempotency_key TEXT,

  -- Related Entities
  payment_intent_id TEXT,
  charge_id TEXT,
  refund_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_event_log_event_id ON stripe_event_log(stripe_event_id);
CREATE INDEX idx_stripe_event_log_type ON stripe_event_log(event_type);
CREATE INDEX idx_stripe_event_log_processed ON stripe_event_log(processed, received_at);
CREATE INDEX idx_stripe_event_log_payment_intent ON stripe_event_log(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX idx_stripe_event_log_idempotency ON stripe_event_log(idempotency_key) WHERE idempotency_key IS NOT NULL;

COMMENT ON TABLE stripe_event_log IS 'Webhook event log with idempotency for Stripe events';
COMMENT ON COLUMN stripe_event_log.stripe_event_id IS 'Unique Stripe event ID for deduplication';
COMMENT ON COLUMN stripe_event_log.idempotency_key IS 'Idempotency key to prevent duplicate processing';

-- =====================================================================================
-- QR INVOICE (Swiss QR-bill)
-- =====================================================================================

CREATE TABLE qr_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- QR Reference
  qr_reference TEXT NOT NULL UNIQUE, -- 27-digit QR reference number

  -- Creditor (Salon)
  creditor_name TEXT NOT NULL,
  creditor_iban TEXT NOT NULL,
  creditor_address TEXT NOT NULL,

  -- Debtor (Customer)
  debtor_name TEXT NOT NULL,
  debtor_address TEXT NOT NULL,

  -- Amount
  amount_chf NUMERIC(10, 2) NOT NULL CHECK (amount_chf > 0),
  currency TEXT NOT NULL DEFAULT 'CHF',

  -- Additional Info
  reference_text TEXT, -- Optional payment reference
  additional_info TEXT, -- Optional additional information

  -- QR Code
  qr_code_data TEXT NOT NULL, -- Generated QR code payload
  qr_code_image_url TEXT, -- Stored QR code image (if generated)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_date DATE,

  CONSTRAINT qr_invoices_order_unique UNIQUE (order_id)
);

CREATE INDEX idx_qr_invoices_salon ON qr_invoices(salon_id);
CREATE INDEX idx_qr_invoices_order ON qr_invoices(order_id);
CREATE INDEX idx_qr_invoices_reference ON qr_invoices(qr_reference);
CREATE INDEX idx_qr_invoices_status ON qr_invoices(salon_id, status);

COMMENT ON TABLE qr_invoices IS 'Swiss QR-bill invoices for payment';
COMMENT ON COLUMN qr_invoices.qr_reference IS '27-digit QR reference number (ISO 11649)';
COMMENT ON COLUMN qr_invoices.qr_code_data IS 'QR code payload according to Swiss QR-bill specification';

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

/**
 * Create payment for order
 */
CREATE OR REPLACE FUNCTION create_payment(
  p_order_id UUID,
  p_payment_method payment_method_type,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_order RECORD;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Create payment
  INSERT INTO payments (
    salon_id,
    order_id,
    customer_id,
    payment_method,
    stripe_payment_intent_id,
    amount_chf,
    currency
  )
  VALUES (
    v_order.salon_id,
    p_order_id,
    v_order.customer_id,
    p_payment_method,
    p_stripe_payment_intent_id,
    v_order.total_chf,
    'CHF'
  )
  RETURNING id INTO v_payment_id;

  -- Log event
  INSERT INTO payment_events (
    payment_id,
    salon_id,
    event_type
  )
  VALUES (
    v_payment_id,
    v_order.salon_id,
    'payment_created'
  );

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION create_payment IS 'Create payment record for order';

/**
 * Process successful payment
 */
CREATE OR REPLACE FUNCTION process_payment_success(
  p_payment_id UUID,
  p_stripe_charge_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  -- Get payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- Update payment
  UPDATE payments
  SET status = 'succeeded',
      stripe_charge_id = COALESCE(p_stripe_charge_id, stripe_charge_id),
      succeeded_at = NOW()
  WHERE id = p_payment_id;

  -- Update order
  UPDATE orders
  SET status = 'paid',
      paid_at = NOW(),
      payment_intent_id = v_payment.stripe_payment_intent_id
  WHERE id = v_payment.order_id;

  -- Log event
  INSERT INTO payment_events (
    payment_id,
    salon_id,
    event_type
  )
  VALUES (
    p_payment_id,
    v_payment.salon_id,
    'payment_succeeded'
  );
END;
$$;

COMMENT ON FUNCTION process_payment_success IS 'Mark payment as succeeded and update order';

/**
 * Process payment failure
 */
CREATE OR REPLACE FUNCTION process_payment_failure(
  p_payment_id UUID,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  -- Get payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- Update payment
  UPDATE payments
  SET status = 'failed',
      failed_at = NOW(),
      failure_code = p_failure_code,
      failure_message = p_failure_message
  WHERE id = p_payment_id;

  -- Update order
  UPDATE orders
  SET status = 'failed'
  WHERE id = v_payment.order_id;

  -- Log event
  INSERT INTO payment_events (
    payment_id,
    salon_id,
    event_type,
    reason
  )
  VALUES (
    p_payment_id,
    v_payment.salon_id,
    'payment_failed',
    p_failure_message
  );
END;
$$;

COMMENT ON FUNCTION process_payment_failure IS 'Mark payment as failed and update order';

/**
 * Process refund
 */
CREATE OR REPLACE FUNCTION process_refund(
  p_payment_id UUID,
  p_refund_amount_chf NUMERIC,
  p_stripe_refund_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_new_refunded_amount NUMERIC;
  v_new_status payment_status;
BEGIN
  -- Get payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status != 'succeeded' THEN
    RAISE EXCEPTION 'Can only refund succeeded payments';
  END IF;

  -- Calculate new refunded amount
  v_new_refunded_amount := v_payment.refunded_amount_chf + p_refund_amount_chf;

  IF v_new_refunded_amount > v_payment.amount_chf THEN
    RAISE EXCEPTION 'Refund amount exceeds payment amount';
  END IF;

  -- Determine new status
  IF v_new_refunded_amount = v_payment.amount_chf THEN
    v_new_status := 'refunded';
  ELSE
    v_new_status := 'partially_refunded';
  END IF;

  -- Update payment
  UPDATE payments
  SET refunded_amount_chf = v_new_refunded_amount,
      status = v_new_status,
      refunded_at = NOW(),
      stripe_refund_id = COALESCE(p_stripe_refund_id, stripe_refund_id)
  WHERE id = p_payment_id;

  -- Update order
  IF v_new_status = 'refunded' THEN
    UPDATE orders SET status = 'refunded' WHERE id = v_payment.order_id;
  END IF;

  -- Log event
  INSERT INTO payment_events (
    payment_id,
    salon_id,
    event_type,
    amount_chf,
    reason,
    performed_by
  )
  VALUES (
    p_payment_id,
    v_payment.salon_id,
    'refund_succeeded',
    p_refund_amount_chf,
    p_reason,
    p_performed_by
  );
END;
$$;

COMMENT ON FUNCTION process_refund IS 'Process full or partial refund';

/**
 * Generate QR reference number (27 digits, ISO 11649)
 */
CREATE OR REPLACE FUNCTION generate_qr_reference(p_salon_id UUID, p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_reference TEXT;
  v_check_digits TEXT;
BEGIN
  -- Simple implementation: salon ID (8) + order ID (16) + check (3)
  -- In production, use proper ISO 11649 generation
  v_reference :=
    LPAD(SUBSTRING(REPLACE(p_salon_id::TEXT, '-', '') FROM 1 FOR 8), 8, '0') ||
    LPAD(SUBSTRING(REPLACE(p_order_id::TEXT, '-', '') FROM 1 FOR 16), 16, '0');

  -- Calculate check digits (simplified modulo 97)
  v_check_digits := LPAD((97 - (v_reference::BIGINT % 97))::TEXT, 2, '0');

  RETURN v_check_digits || v_reference;
END;
$$;

COMMENT ON FUNCTION generate_qr_reference IS 'Generate 27-digit QR reference number';
