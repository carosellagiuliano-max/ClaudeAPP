'use server'

/**
 * Shop Server Actions
 *
 * Server-side functions for e-commerce operations:
 * - Product catalog management
 * - Shopping cart operations
 * - Checkout and order creation
 * - Voucher validation
 */

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/db/client'
import { getCurrentCustomerId } from '@/lib/auth/rbac'
import {
  type Product,
  type ProductWithDetails,
  type CartWithItems,
  type CartItem,
  type ShippingMethod,
  type OrderWithItems,
  type VoucherValidationResult,
  type CheckoutFormData,
  type ApiResponse,
  addToCartSchema,
  updateCartItemSchema,
} from './types'

// ============================================================================
// Product Actions
// ============================================================================

export async function getProducts(salonId: string): Promise<Product[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:product_categories(id, name),
      images:product_images(*)
    `)
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('show_in_shop', true)
    .order('display_order')

  if (error) throw error

  return (data || []).map(formatProduct)
}

export async function getFeaturedProducts(salonId: string): Promise<Product[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:product_categories(id, name),
      images:product_images(*)
    `)
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('is_featured', true)
    .eq('show_in_shop', true)
    .order('display_order')
    .limit(8)

  if (error) throw error

  return (data || []).map(formatProduct)
}

export async function getProductBySlug(
  salonId: string,
  slug: string
): Promise<ProductWithDetails | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:product_categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('salon_id', salonId)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) return null

  return {
    ...formatProduct(data),
    category: data.category,
    variants: data.variants || [],
    images: data.images || [],
  }
}

export async function getProductsByCategory(
  salonId: string,
  categorySlug: string
): Promise<Product[]> {
  const supabase = createClient()

  // Get category
  const { data: category } = await supabase
    .from('product_categories')
    .select('id')
    .eq('salon_id', salonId)
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .single()

  if (!category) return []

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:product_categories(id, name),
      images:product_images(*)
    `)
    .eq('salon_id', salonId)
    .eq('category_id', category.id)
    .eq('is_active', true)
    .eq('show_in_shop', true)
    .order('display_order')

  if (error) throw error

  return (data || []).map(formatProduct)
}

function formatProduct(data: any): Product {
  return {
    id: data.id,
    salonId: data.salon_id,
    categoryId: data.category_id,
    categoryName: data.category?.name || null,
    taxRateId: data.tax_rate_id,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    description: data.description,
    shortDescription: data.short_description,
    brand: data.brand,
    manufacturer: data.manufacturer,
    basePriceChf: Number(data.base_price_chf),
    salePriceChf: data.sale_price_chf ? Number(data.sale_price_chf) : null,
    memberPriceChf: data.member_price_chf ? Number(data.member_price_chf) : null,
    saleStartsAt: data.sale_starts_at,
    saleEndsAt: data.sale_ends_at,
    trackInventory: data.track_inventory,
    stockQuantity: data.stock_quantity,
    lowStockThreshold: data.low_stock_threshold,
    allowBackorder: data.allow_backorder,
    hasVariants: data.has_variants,
    isBundle: data.is_bundle,
    displayOrder: data.display_order,
    isActive: data.is_active,
    isFeatured: data.is_featured,
    showInShop: data.show_in_shop,
    weightGrams: data.weight_grams,
    images: data.images || [],
  }
}

// ============================================================================
// Cart Actions
// ============================================================================

async function getOrCreateCartId(salonId: string): Promise<string> {
  const supabase = createClient()
  const cookieStore = cookies()

  // Try to get cart ID from cookie
  let cartId = cookieStore.get('cart_id')?.value

  if (cartId) {
    // Verify cart exists and is active
    const { data } = await supabase
      .from('carts')
      .select('id')
      .eq('id', cartId)
      .eq('status', 'active')
      .single()

    if (data) return cartId
  }

  // Get customer ID if logged in
  const customerId = await getCurrentCustomerId(salonId)

  // Create new cart using database function
  const { data, error } = await supabase.rpc('get_or_create_cart', {
    p_salon_id: salonId,
    p_customer_id: customerId,
    p_session_id: crypto.randomUUID(), // Generate unique session ID
  })

  if (error) throw error

  cartId = data

  // Set cookie for 30 days
  cookieStore.set('cart_id', cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  return cartId
}

export async function getCart(salonId: string): Promise<CartWithItems | null> {
  try {
    const cartId = await getOrCreateCartId(salonId)
    const supabase = createClient()

    const { data: cart } = await supabase
      .from('carts')
      .select('*')
      .eq('id', cartId)
      .single()

    if (!cart) return null

    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*),
        variant:product_variants(*)
      `)
      .eq('cart_id', cartId)

    const cartItems: CartItem[] = (items || []).map(item => ({
      id: item.id,
      cartId: item.cart_id,
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
      unitPriceChf: Number(item.unit_price_chf),
      discountAmountChf: Number(item.discount_amount_chf),
      subtotalChf: Number(item.subtotal_chf),
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      product: item.product,
      variant: item.variant,
    }))

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotalChf, 0)

    return {
      ...cart,
      items: cartItems,
      totalItems,
      totalPrice,
    }
  } catch (error) {
    console.error('Get cart error:', error)
    return null
  }
}

export async function addToCart(
  salonId: string,
  input: { productId: string; variantId?: string; quantity?: number }
): Promise<ApiResponse<CartWithItems>> {
  try {
    const validated = addToCartSchema.parse(input)
    const cartId = await getOrCreateCartId(salonId)
    const supabase = createClient()

    // Get product price
    let price: number

    if (validated.variantId) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('price_chf, sale_price_chf')
        .eq('id', validated.variantId)
        .single()

      if (!variant) {
        return { success: false, error: 'Variante nicht gefunden' }
      }

      price = Number(variant.sale_price_chf || variant.price_chf)
    } else {
      const { data: product } = await supabase
        .from('products')
        .select('base_price_chf, sale_price_chf')
        .eq('id', validated.productId)
        .single()

      if (!product) {
        return { success: false, error: 'Produkt nicht gefunden' }
      }

      price = Number(product.sale_price_chf || product.base_price_chf)
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', validated.productId)
      .eq('variant_id', validated.variantId || null)
      .single()

    if (existingItem) {
      // Update quantity
      await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + validated.quantity })
        .eq('id', existingItem.id)
    } else {
      // Add new item
      await supabase.from('cart_items').insert({
        cart_id: cartId,
        product_id: validated.productId,
        variant_id: validated.variantId || null,
        quantity: validated.quantity,
        unit_price_chf: price,
        discount_amount_chf: 0,
      })
    }

    revalidatePath('/shop')
    revalidatePath('/warenkorb')

    const cart = await getCart(salonId)
    return { success: true, data: cart! }
  } catch (error) {
    console.error('Add to cart error:', error)
    return { success: false, error: 'Fehler beim Hinzufügen zum Warenkorb' }
  }
}

export async function updateCartItem(
  salonId: string,
  input: { cartItemId: string; quantity: number }
): Promise<ApiResponse<CartWithItems>> {
  try {
    const validated = updateCartItemSchema.parse(input)
    const supabase = createClient()

    await supabase
      .from('cart_items')
      .update({ quantity: validated.quantity })
      .eq('id', validated.cartItemId)

    revalidatePath('/warenkorb')

    const cart = await getCart(salonId)
    return { success: true, data: cart! }
  } catch (error) {
    console.error('Update cart item error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function removeFromCart(
  salonId: string,
  cartItemId: string
): Promise<ApiResponse<CartWithItems>> {
  try {
    const supabase = createClient()

    await supabase.from('cart_items').delete().eq('id', cartItemId)

    revalidatePath('/warenkorb')

    const cart = await getCart(salonId)
    return { success: true, data: cart! }
  } catch (error) {
    console.error('Remove from cart error:', error)
    return { success: false, error: 'Fehler beim Entfernen' }
  }
}

// ============================================================================
// Shipping Actions
// ============================================================================

export async function getShippingMethods(salonId: string): Promise<ShippingMethod[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('display_order')

  if (error) throw error

  return data || []
}

// ============================================================================
// Voucher Actions
// ============================================================================

export async function validateVoucher(
  salonId: string,
  code: string,
  orderTotalChf: number
): Promise<VoucherValidationResult> {
  const supabase = createClient()
  const customerId = await getCurrentCustomerId(salonId)

  const { data, error } = await supabase.rpc('validate_voucher', {
    p_salon_id: salonId,
    p_code: code.toUpperCase(),
    p_customer_id: customerId,
    p_order_total_chf: orderTotalChf,
  })

  if (error) {
    return {
      voucherId: null,
      discountAmount: 0,
      isValid: false,
      errorMessage: 'Fehler bei der Validierung',
    }
  }

  return data[0] || { voucherId: null, discountAmount: 0, isValid: false, errorMessage: 'Ungültig' }
}

// ============================================================================
// Checkout Actions
// ============================================================================

export async function createOrder(
  salonId: string,
  checkoutData: CheckoutFormData
): Promise<ApiResponse<{ orderId: string; paymentIntentId: string | null }>> {
  try {
    const cartId = await getOrCreateCartId(salonId)
    const supabase = createClient()

    // Get cart
    const cart = await getCart(salonId)
    if (!cart || cart.items.length === 0) {
      return { success: false, error: 'Warenkorb ist leer' }
    }

    // Create order using database function
    const shippingAddress = {
      street: checkoutData.shippingAddress.street,
      city: checkoutData.shippingAddress.city,
      postcode: checkoutData.shippingAddress.postcode,
      country: checkoutData.shippingAddress.country,
    }

    const billingAddress = checkoutData.billingSameAsShipping
      ? null
      : {
          street: checkoutData.billingAddress!.street,
          city: checkoutData.billingAddress!.city,
          postcode: checkoutData.billingAddress!.postcode,
          country: checkoutData.billingAddress!.country,
        }

    const { data: orderId, error } = await supabase.rpc('create_order_from_cart', {
      p_cart_id: cartId,
      p_shipping_method_id: checkoutData.shippingMethodId,
      p_shipping_address: shippingAddress,
      p_billing_address: billingAddress,
      p_customer_notes: checkoutData.customerNotes || null,
    })

    if (error) {
      console.error('Create order error:', error)
      return { success: false, error: 'Fehler beim Erstellen der Bestellung' }
    }

    // Clear cart cookie
    cookies().delete('cart_id')

    revalidatePath('/shop')
    revalidatePath('/warenkorb')
    revalidatePath('/customer/bestellungen')

    return {
      success: true,
      data: {
        orderId,
        paymentIntentId: null, // TODO: Stripe integration
      },
    }
  } catch (error) {
    console.error('Create order error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Bestellung' }
  }
}

// ============================================================================
// Order Actions
// ============================================================================

export async function getCustomerOrders(salonId: string): Promise<OrderWithItems[]> {
  const supabase = createClient()
  const customerId = await getCurrentCustomerId(salonId)

  if (!customerId) return []

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:product_id(id, name, price)
      ),
      shipping_method:shipping_method_id(name, price)
    `)
    .eq('salon_id', salonId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customer orders:', error)
    return []
  }

  return data || []
}

export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return null

  return {
    ...order,
    items: order.items || [],
  }
}
