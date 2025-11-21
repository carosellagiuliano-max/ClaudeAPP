/**
 * Shop Types and Schemas
 *
 * TypeScript types and Zod validation schemas for the e-commerce shop
 */

import { z } from 'zod'

// ============================================================================
// Product Types
// ============================================================================

export interface ProductCategory {
  id: string
  salonId: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  displayOrder: number
  isActive: boolean
  showInNavigation: boolean
  imageUrl: string | null
  bannerUrl: string | null
}

export interface Product {
  id: string
  salonId: string
  categoryId: string | null
  categoryName: string | null
  taxRateId: string | null
  name: string
  slug: string
  sku: string | null
  description: string | null
  shortDescription: string | null
  brand: string | null
  manufacturer: string | null
  basePriceChf: number
  salePriceChf: number | null
  memberPriceChf: number | null
  saleStartsAt: string | null
  saleEndsAt: string | null
  trackInventory: boolean
  stockQuantity: number
  lowStockThreshold: number
  allowBackorder: boolean
  hasVariants: boolean
  isBundle: boolean
  displayOrder: number
  isActive: boolean
  isFeatured: boolean
  showInShop: boolean
  weightGrams: number | null
  images: ProductImage[]
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku: string
  variantOptions: Record<string, any> | null
  priceChf: number
  salePriceChf: number | null
  memberPriceChf: number | null
  stockQuantity: number
  lowStockThreshold: number
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  imageUrl: string | null
}

export interface ProductImage {
  id: string
  productId: string
  variantId: string | null
  imageUrl: string
  altText: string | null
  displayOrder: number
  isPrimary: boolean
}

export interface ProductWithDetails extends Product {
  category: ProductCategory | null
  variants: ProductVariant[]
  images: ProductImage[]
  bundleItems?: BundleItem[]
}

export interface BundleItem {
  id: string
  bundleProductId: string
  includedProductId: string | null
  includedVariantId: string | null
  quantity: number
  displayOrder: number
  product?: Product
  variant?: ProductVariant
}

// ============================================================================
// Cart Types
// ============================================================================

export interface Cart {
  id: string
  salonId: string
  customerId: string | null
  sessionId: string | null
  status: 'active' | 'converted' | 'abandoned' | 'merged'
  convertedToOrderId: string | null
  convertedAt: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
  lastActivityAt: string
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  variantId: string | null
  quantity: number
  unitPriceChf: number
  discountAmountChf: number
  subtotalChf: number
  notes: string | null
  createdAt: string
  updatedAt: string
  // Populated fields
  product?: Product
  variant?: ProductVariant
}

export interface CartWithItems extends Cart {
  items: CartItem[]
  totalItems: number
  totalPrice: number
}

// ============================================================================
// Shipping Types
// ============================================================================

export interface ShippingMethod {
  id: string
  salonId: string
  name: string
  description: string | null
  code: string
  priceChf: number
  freeShippingThresholdChf: number | null
  estimatedDeliveryDaysMin: number | null
  estimatedDeliveryDaysMax: number | null
  isActive: boolean
  displayOrder: number
  maxWeightGrams: number | null
  restrictedPostcodes: string[] | null
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus =
  | 'pending_payment'
  | 'payment_processing'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'

export interface Order {
  id: string
  salonId: string
  customerId: string
  orderNumber: string
  orderYear: number
  status: OrderStatus
  source: 'online' | 'phone' | 'in_store' | 'admin'
  customerEmail: string
  customerPhone: string | null
  customerFirstName: string
  customerLastName: string
  shippingAddressStreet: string
  shippingAddressCity: string
  shippingAddressPostcode: string
  shippingAddressCountry: string
  billingSameAsShipping: boolean
  billingAddressStreet: string | null
  billingAddressCity: string | null
  billingAddressPostcode: string | null
  billingAddressCountry: string | null
  shippingMethodId: string | null
  shippingMethodName: string
  shippingCostChf: number
  subtotalChf: number
  discountAmountChf: number
  taxAmountChf: number
  totalChf: number
  taxRatePercent: number
  voucherCode: string | null
  voucherDiscountChf: number | null
  paymentMethod: string | null
  paymentIntentId: string | null
  paidAt: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  customerNotes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  variantId: string | null
  productName: string
  variantName: string | null
  sku: string | null
  quantity: number
  unitPriceChf: number
  discountPerItemChf: number
  taxRatePercent: number
  subtotalChf: number
  taxAmountChf: number
  totalChf: number
  displayOrder: number
  createdAt: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

// ============================================================================
// Voucher Types
// ============================================================================

export interface Voucher {
  id: string
  salonId: string
  code: string
  type: 'percentage' | 'fixed_amount' | 'gift_card'
  discountPercent: number | null
  discountAmountChf: number | null
  initialBalanceChf: number | null
  remainingBalanceChf: number | null
  validFrom: string
  validUntil: string | null
  maxUses: number | null
  maxUsesPerCustomer: number
  currentUses: number
  minOrderAmountChf: number | null
  maxDiscountAmountChf: number | null
  isActive: boolean
  description: string | null
}

export interface VoucherValidationResult {
  voucherId: string | null
  discountAmount: number
  isValid: boolean
  errorMessage: string | null
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod =
  | 'stripe_card'
  | 'stripe_twint'
  | 'cash'
  | 'invoice'
  | 'on_delivery'
  | 'qr_invoice'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export interface Payment {
  id: string
  salonId: string
  orderId: string
  customerId: string
  paymentMethod: PaymentMethod
  stripePaymentIntentId: string | null
  stripeChargeId: string | null
  amountChf: number
  refundedAmountChf: number
  feeChf: number
  currency: string
  status: PaymentStatus
  createdAt: string
  succeededAt: string | null
  failedAt: string | null
  refundedAt: string | null
  failureCode: string | null
  failureMessage: string | null
  receiptUrl: string | null
}

// ============================================================================
// Checkout Schemas
// ============================================================================

export const addressSchema = z.object({
  street: z.string().min(1, 'Straße ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  postcode: z.string().min(4, 'PLZ ist erforderlich').max(4, 'PLZ muss 4-stellig sein'),
  country: z.string().default('CH'),
})

export const checkoutSchema = z.object({
  // Customer info
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().min(7, 'Telefonnummer ist erforderlich'),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),

  // Shipping address
  shippingAddress: addressSchema,

  // Billing address (optional if same as shipping)
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),

  // Shipping method
  shippingMethodId: z.string().uuid('Bitte wählen Sie eine Versandart'),

  // Voucher
  voucherCode: z.string().optional(),

  // Notes
  customerNotes: z.string().max(500).optional(),

  // Terms
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die AGB akzeptieren',
  }),
  acceptedPrivacy: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die Datenschutzerklärung akzeptieren',
  }),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>
export type AddressData = z.infer<typeof addressSchema>

// ============================================================================
// Cart Actions Schemas
// ============================================================================

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive().default(1),
})

export const updateCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface CartResponse extends ApiResponse<CartWithItems> {}
export interface OrderResponse extends ApiResponse<OrderWithItems> {}
export interface ProductsResponse extends ApiResponse<Product[]> {}
export interface VoucherResponse extends ApiResponse<VoucherValidationResult> {}
