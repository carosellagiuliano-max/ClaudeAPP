/**
 * Orders & Invoices Types
 * Type definitions for order management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'

export type PaymentMethod =
  | 'stripe_card'
  | 'stripe_twint'
  | 'cash'
  | 'terminal'
  | 'voucher'
  | 'manual_adjustment'

export interface Order {
  id: string
  salonId: string
  customerId: string
  invoiceNumber: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  subtotalChf: string
  taxTotalChf: string
  shippingCostChf: string
  discountTotalChf: string
  totalChf: string
  currencyCode: string
  customerEmail: string
  customerPhone: string | null
  shippingAddressSnapshot: any // JSONB
  billingAddressSnapshot: any // JSONB
  shippingMethodSnapshot: any | null // JSONB
  notes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  productName: string
  productSku: string | null
  quantity: number
  unitPriceChf: string
  taxRatePercent: string
  taxAmountChf: string
  subtotalChf: string
  totalChf: string
  productSnapshot: any // JSONB
  createdAt: string
  updatedAt: string
}

export interface OrderWithDetails extends Order {
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  items: OrderItem[]
  payments?: Payment[]
}

export interface Payment {
  id: string
  salonId: string
  orderId: string | null
  appointmentId: string | null
  customerId: string
  amountChf: string
  currencyCode: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  stripePaymentIntentId: string | null
  stripeChargeId: string | null
  metadata: any // JSONB
  createdAt: string
  updatedAt: string
  capturedAt: string | null
  refundedAt: string | null
  failedAt: string | null
}

export interface PaymentEvent {
  id: string
  paymentId: string
  eventType: string
  eventData: any // JSONB
  createdAt: string
}

// ============================================================
// FILTERS & QUERIES
// ============================================================

export interface OrderFilters {
  search?: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  dateFrom?: string
  dateTo?: string
  customerId?: string
}

// ============================================================
// REFUND TYPES
// ============================================================

export interface RefundInput {
  orderId: string
  amountChf: string
  reason: string
  refundShipping: boolean
}

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  amountChf: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Betrag muss größer als 0 sein'
    ),
  reason: z.string().min(1, 'Grund ist erforderlich').max(500),
  refundShipping: z.boolean().default(false),
})

export type RefundInputValidated = z.infer<typeof refundSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Ausstehend',
  payment_pending: 'Zahlung ausstehend',
  paid: 'Bezahlt',
  processing: 'In Bearbeitung',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
  refunded: 'Erstattet',
  partially_refunded: 'Teilweise erstattet',
}

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  payment_pending: 'outline',
  paid: 'default',
  processing: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  refunded: 'secondary',
  partially_refunded: 'secondary',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ausstehend',
  authorized: 'Autorisiert',
  captured: 'Erfasst',
  failed: 'Fehlgeschlagen',
  refunded: 'Erstattet',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe_card: 'Kreditkarte (Stripe)',
  stripe_twint: 'TWINT (Stripe)',
  cash: 'Bargeld',
  terminal: 'Terminal',
  voucher: 'Gutschein',
  manual_adjustment: 'Manuelle Anpassung',
}

// ============================================================
// STATISTICS
// ============================================================

export interface OrderStatistics {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  refundedOrders: number
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
