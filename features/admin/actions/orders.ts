'use server'

/**
 * Orders & Payments Server Actions
 * Manage orders, payments, and refunds
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  Order,
  OrderWithDetails,
  OrderItem,
  Payment,
  OrderFilters,
  OrderStatistics,
  RefundInputValidated,
} from '../types/orders'
import { refundSchema } from '../types/orders'

// ============================================================
// ORDERS
// ============================================================

/**
 * Get all orders with optional filtering
 */
export async function getOrders(
  salonId: string,
  filters?: OrderFilters
): Promise<ApiResponse<OrderWithDetails[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('orders')
      .select(
        `
        *,
        customer:customers!customer_id(
          id,
          profile:profiles!profile_id(
            first_name,
            last_name,
            email
          )
        ),
        items:order_items(*),
        payments(*)
      `
      )
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus)
    }
    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    let orders = data.map((order: any) => ({
      id: order.id,
      salonId: order.salon_id,
      customerId: order.customer_id,
      invoiceNumber: order.invoice_number,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      subtotalChf: order.subtotal_chf,
      taxTotalChf: order.tax_total_chf,
      shippingCostChf: order.shipping_cost_chf,
      discountTotalChf: order.discount_total_chf,
      totalChf: order.total_chf,
      currencyCode: order.currency_code,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddressSnapshot: order.shipping_address_snapshot,
      billingAddressSnapshot: order.billing_address_snapshot,
      shippingMethodSnapshot: order.shipping_method_snapshot,
      notes: order.notes,
      internalNotes: order.internal_notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      paidAt: order.paid_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      cancelledAt: order.cancelled_at,
      customer: {
        id: order.customer.id,
        firstName: order.customer.profile?.first_name,
        lastName: order.customer.profile?.last_name,
        email: order.customer.profile?.email || order.customer_email,
      },
      items: order.items.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        quantity: item.quantity,
        unitPriceChf: item.unit_price_chf,
        taxRatePercent: item.tax_rate_percent,
        taxAmountChf: item.tax_amount_chf,
        subtotalChf: item.subtotal_chf,
        totalChf: item.total_chf,
        productSnapshot: item.product_snapshot,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      payments: order.payments.map((payment: any) => ({
        id: payment.id,
        salonId: payment.salon_id,
        orderId: payment.order_id,
        appointmentId: payment.appointment_id,
        customerId: payment.customer_id,
        amountChf: payment.amount_chf,
        currencyCode: payment.currency_code,
        paymentMethod: payment.payment_method,
        paymentStatus: payment.payment_status,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        stripeChargeId: payment.stripe_charge_id,
        metadata: payment.metadata,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        capturedAt: payment.captured_at,
        refundedAt: payment.refunded_at,
        failedAt: payment.failed_at,
      })),
    }))

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      orders = orders.filter(
        (o: any) =>
          o.orderNumber.toLowerCase().includes(searchLower) ||
          o.invoiceNumber.toLowerCase().includes(searchLower) ||
          o.customerEmail.toLowerCase().includes(searchLower) ||
          `${o.customer.firstName || ''} ${o.customer.lastName || ''}`
            .toLowerCase()
            .includes(searchLower)
      )
    }

    return {
      success: true,
      data: orders,
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Bestellungen',
    }
  }
}

/**
 * Get a single order by ID with full details
 */
export async function getOrderById(
  salonId: string,
  orderId: string
): Promise<ApiResponse<OrderWithDetails>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        customer:customers!customer_id(
          id,
          profile:profiles!profile_id(
            first_name,
            last_name,
            email,
            phone
          )
        ),
        items:order_items(*),
        payments(*)
      `
      )
      .eq('id', orderId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: order.id,
        salonId: order.salon_id,
        customerId: order.customer_id,
        invoiceNumber: order.invoice_number,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        subtotalChf: order.subtotal_chf,
        taxTotalChf: order.tax_total_chf,
        shippingCostChf: order.shipping_cost_chf,
        discountTotalChf: order.discount_total_chf,
        totalChf: order.total_chf,
        currencyCode: order.currency_code,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddressSnapshot: order.shipping_address_snapshot,
        billingAddressSnapshot: order.billing_address_snapshot,
        shippingMethodSnapshot: order.shipping_method_snapshot,
        notes: order.notes,
        internalNotes: order.internal_notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        cancelledAt: order.cancelled_at,
        customer: {
          id: order.customer.id,
          firstName: order.customer.profile?.first_name,
          lastName: order.customer.profile?.last_name,
          email: order.customer.profile?.email || order.customer_email,
        },
        items: order.items.map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          productSku: item.product_sku,
          quantity: item.quantity,
          unitPriceChf: item.unit_price_chf,
          taxRatePercent: item.tax_rate_percent,
          taxAmountChf: item.tax_amount_chf,
          subtotalChf: item.subtotal_chf,
          totalChf: item.total_chf,
          productSnapshot: item.product_snapshot,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
        payments: order.payments.map((payment: any) => ({
          id: payment.id,
          salonId: payment.salon_id,
          orderId: payment.order_id,
          appointmentId: payment.appointment_id,
          customerId: payment.customer_id,
          amountChf: payment.amount_chf,
          currencyCode: payment.currency_code,
          paymentMethod: payment.payment_method,
          paymentStatus: payment.payment_status,
          stripePaymentIntentId: payment.stripe_payment_intent_id,
          stripeChargeId: payment.stripe_charge_id,
          metadata: payment.metadata,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
          capturedAt: payment.captured_at,
          refundedAt: payment.refunded_at,
          failedAt: payment.failed_at,
        })),
      },
    }
  } catch (error) {
    console.error('Error fetching order:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Bestellung',
    }
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  salonId: string,
  orderId: string,
  status: string
): Promise<ApiResponse<Order>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    const updateData: any = { status }

    // Set timestamps based on status
    if (status === 'shipped' && !updateData.shipped_at) {
      updateData.shipped_at = new Date().toISOString()
    }
    if (status === 'delivered' && !updateData.delivered_at) {
      updateData.delivered_at = new Date().toISOString()
    }
    if (status === 'cancelled' && !updateData.cancelled_at) {
      updateData.cancelled_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/bestellungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        customerId: data.customer_id,
        invoiceNumber: data.invoice_number,
        orderNumber: data.order_number,
        status: data.status,
        paymentStatus: data.payment_status,
        paymentMethod: data.payment_method,
        subtotalChf: data.subtotal_chf,
        taxTotalChf: data.tax_total_chf,
        shippingCostChf: data.shipping_cost_chf,
        discountTotalChf: data.discount_total_chf,
        totalChf: data.total_chf,
        currencyCode: data.currency_code,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        shippingAddressSnapshot: data.shipping_address_snapshot,
        billingAddressSnapshot: data.billing_address_snapshot,
        shippingMethodSnapshot: data.shipping_method_snapshot,
        notes: data.notes,
        internalNotes: data.internal_notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        paidAt: data.paid_at,
        shippedAt: data.shipped_at,
        deliveredAt: data.delivered_at,
        cancelledAt: data.cancelled_at,
      },
    }
  } catch (error) {
    console.error('Error updating order status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Bestellung',
    }
  }
}

/**
 * Update internal notes
 */
export async function updateOrderNotes(
  salonId: string,
  orderId: string,
  internalNotes: string
): Promise<ApiResponse<void>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('orders')
      .update({ internal_notes: internalNotes })
      .eq('id', orderId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/bestellungen')

    return { success: true }
  } catch (error) {
    console.error('Error updating order notes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Speichern der Notizen',
    }
  }
}

/**
 * Get order statistics
 */
export async function getOrderStatistics(
  salonId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ApiResponse<OrderStatistics>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase.from('orders').select('status, total_chf').eq('salon_id', salonId)

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: orders, error } = await query

    if (error) throw error

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.total_chf || '0'), 0),
      averageOrderValue:
        orders.length > 0
          ? orders.reduce((sum, o) => sum + parseFloat(o.total_chf || '0'), 0) / orders.length
          : 0,
      pendingOrders: orders.filter((o) => o.status === 'pending' || o.status === 'payment_pending')
        .length,
      completedOrders: orders.filter(
        (o) => o.status === 'delivered' || o.status === 'paid' || o.status === 'shipped'
      ).length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      refundedOrders: orders.filter(
        (o) => o.status === 'refunded' || o.status === 'partially_refunded'
      ).length,
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error('Error fetching order statistics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Statistiken',
    }
  }
}

/**
 * Process refund (Stripe integration placeholder)
 */
export async function processRefund(
  salonId: string,
  input: RefundInputValidated
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const validated = refundSchema.parse(input)
    const supabase = await createClient()

    // Get order and payment
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('id', validated.orderId)
      .eq('salon_id', salonId)
      .single()

    if (orderError) throw orderError

    // Check if refund amount is valid
    const refundAmount = parseFloat(validated.amountChf)
    const orderTotal = parseFloat(order.total_chf)

    if (refundAmount > orderTotal) {
      return {
        success: false,
        error: 'Rückerstattungsbetrag überschreitet Bestellsumme',
      }
    }

    // TODO: Process actual Stripe refund
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const payment = order.payments.find(p => p.stripe_payment_intent_id)
    // if (payment) {
    //   await stripe.refunds.create({
    //     payment_intent: payment.stripe_payment_intent_id,
    //     amount: Math.round(refundAmount * 100),
    //     reason: validated.reason,
    //   })
    // }

    // Update order status
    const newStatus =
      refundAmount >= orderTotal ? 'refunded' : 'partially_refunded'

    await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_status: 'refunded',
      })
      .eq('id', validated.orderId)
      .eq('salon_id', salonId)

    // Log refund (placeholder - in real system, update payments table)
    console.log('Refund processed:', {
      orderId: validated.orderId,
      amount: validated.amountChf,
      reason: validated.reason,
    })

    revalidatePath('/admin/bestellungen')

    return { success: true }
  } catch (error) {
    console.error('Error processing refund:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler bei der Rückerstattung',
    }
  }
}
