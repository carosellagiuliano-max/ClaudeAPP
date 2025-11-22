/**
 * Stripe Webhook Handler
 * Processes payment events from Stripe
 *
 * Events handled:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 * - checkout.session.completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging'
import { sendOrderConfirmation } from '@/lib/email'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY!)

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    logger.error('Missing Stripe signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: any

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Check for duplicate events (idempotency)
  const isDuplicate = await checkEventProcessed(event.id)
  if (isDuplicate) {
    logger.info('Duplicate webhook event, skipping', { eventId: event.id })
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Process event based on type
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event)
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event)
        break

      default:
        logger.info('Unhandled webhook event type', { type: event.type })
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type)

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Error processing webhook event', error, {
      eventId: event.id,
      eventType: event.type,
    })

    // Return 200 to prevent Stripe from retrying (we've logged the error)
    // In production, you might want to return 500 to trigger retries
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(event: any): Promise<void> {
  const paymentIntent = event.data.object

  logger.info('Payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  })

  const supabase = await createClient()

  // Find payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*, orders(*)')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (paymentError || !payment) {
    logger.error('Payment not found for payment intent', paymentError, {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      metadata: {
        ...payment.metadata,
        stripe_charge_id: paymentIntent.latest_charge,
      },
    })
    .eq('id', payment.id)

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'captured',
      order_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id)

  // Send order confirmation email
  if (payment.orders) {
    const order = payment.orders as any

    // Get order items
    const { data: items } = await supabase
      .from('order_items')
      .select('*, products(name)')
      .eq('order_id', order.id)

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', order.customer_id)
      .single()

    if (customer && items) {
      await sendOrderConfirmation({
        to: customer.email,
        customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Kunde',
        orderNumber: order.order_number,
        items: items.map((item: any) => ({
          name: item.products?.name || 'Artikel',
          quantity: item.quantity,
          price: item.price_chf,
        })),
        totalAmount: order.total_amount_chf,
        shippingAddress: order.shipping_address
          ? `${order.shipping_address.street}\n${order.shipping_address.postal_code} ${order.shipping_address.city}`
          : undefined,
      })
    }
  }

  logger.info('Payment processed successfully', {
    paymentId: payment.id,
    orderId: payment.order_id,
  })
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: any): Promise<void> {
  const paymentIntent = event.data.object

  logger.warn('Payment intent failed', {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  })

  const supabase = await createClient()

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        error: paymentIntent.last_payment_error,
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  // Update order status
  const { data: payment } = await supabase
    .from('payments')
    .select('order_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (payment) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        order_status: 'payment_pending',
      })
      .eq('id', payment.order_id)
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event: any): Promise<void> {
  const charge = event.data.object

  logger.info('Charge refunded', {
    chargeId: charge.id,
    amount: charge.amount_refunded,
  })

  const supabase = await createClient()

  // Find payment by charge ID
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('metadata->>stripe_charge_id', charge.id)
    .single()

  if (!payment) {
    logger.error('Payment not found for charge', { chargeId: charge.id })
    return
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refunded_amount_chf: charge.amount_refunded / 100, // Convert from cents
    })
    .eq('id', payment.id)

  // Update order status
  const isPartialRefund = charge.amount_refunded < charge.amount

  await supabase
    .from('orders')
    .update({
      order_status: isPartialRefund ? 'partially_refunded' : 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id)

  logger.info('Refund processed successfully', {
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: charge.amount_refunded / 100,
  })
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(event: any): Promise<void> {
  const session = event.data.object

  logger.info('Checkout session completed', {
    sessionId: session.id,
    paymentIntent: session.payment_intent,
  })

  // Additional logic for checkout completion
  // (Most processing is done in payment_intent.succeeded)
}

/**
 * Check if event has already been processed (idempotency)
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('event_id', eventId)
      .single()

    return !!data
  } catch (error) {
    return false
  }
}

/**
 * Mark event as processed
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('stripe_events').insert({
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to mark event as processed', error, { eventId })
  }
}
