'use server'

/**
 * Product & Inventory Management Server Actions
 * CRUD operations for products, categories, brands, and inventory
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  Product,
  ProductWithCategory,
  ProductCategory,
  ProductBrand,
  InventoryTransaction,
  InventoryTransactionWithProduct,
  ProductInput,
  ProductCategoryInput,
  ProductBrandInput,
  InventoryTransactionInput,
  ProductFilters,
  InventoryFilters,
  ProductStats,
} from '../types/products'
import {
  productSchema,
  productCategorySchema,
  productBrandSchema,
  inventoryTransactionSchema,
} from '../types/products'

// ============================================================
// PRODUCTS
// ============================================================

/**
 * Get all products with optional filtering
 */
export async function getProducts(
  salonId: string,
  filters?: ProductFilters
): Promise<ApiResponse<ProductWithCategory[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('products')
      .select(
        `
        *,
        category:product_categories!category_id(id, name),
        brand:product_brands!brand_id(id, name)
      `
      )
      .eq('salon_id', salonId)
      .order('name', { ascending: true })

    // Apply filters
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }
    if (filters?.isFeatured !== undefined) {
      query = query.eq('is_featured', filters.isFeatured)
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters?.brandId) {
      query = query.eq('brand_id', filters.brandId)
    }
    if (filters?.lowStock) {
      query = query.lt('stock_quantity', supabase.raw('COALESCE(low_stock_threshold, 10)'))
    }

    const { data, error } = await query

    if (error) throw error

    let products = data.map((product: any) => ({
      id: product.id,
      salonId: product.salon_id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.category_id,
      brandId: product.brand_id,
      retailPriceChf: product.retail_price_chf,
      costPriceChf: product.cost_price_chf,
      taxRate: product.tax_rate,
      stockQuantity: product.stock_quantity,
      lowStockThreshold: product.low_stock_threshold,
      unit: product.unit,
      isActive: product.is_active,
      isFeatured: product.is_featured,
      imageUrl: product.image_url,
      tags: product.tags || [],
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : null,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
          }
        : null,
    }))

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.barcode?.toLowerCase().includes(searchLower)
      )
    }

    return {
      success: true,
      data: products,
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Produkte',
    }
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(
  salonId: string,
  productId: string
): Promise<ApiResponse<ProductWithCategory>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
        *,
        category:product_categories!category_id(id, name),
        brand:product_brands!brand_id(id, name)
      `
      )
      .eq('id', productId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: product.id,
        salonId: product.salon_id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        categoryId: product.category_id,
        brandId: product.brand_id,
        retailPriceChf: product.retail_price_chf,
        costPriceChf: product.cost_price_chf,
        taxRate: product.tax_rate,
        stockQuantity: product.stock_quantity,
        lowStockThreshold: product.low_stock_threshold,
        unit: product.unit,
        isActive: product.is_active,
        isFeatured: product.is_featured,
        imageUrl: product.image_url,
        tags: product.tags || [],
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
            }
          : null,
        brand: product.brand
          ? {
              id: product.brand.id,
              name: product.brand.name,
            }
          : null,
      },
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des Produkts',
    }
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  salonId: string,
  input: ProductInput
): Promise<ApiResponse<Product>> {
  try {
    await requireStaff(salonId)

    const validated = productSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .insert({
        salon_id: salonId,
        name: validated.name,
        description: validated.description,
        sku: validated.sku,
        barcode: validated.barcode,
        category_id: validated.categoryId,
        brand_id: validated.brandId,
        retail_price_chf: validated.retailPriceChf,
        cost_price_chf: validated.costPriceChf,
        tax_rate: validated.taxRate,
        stock_quantity: validated.stockQuantity,
        low_stock_threshold: validated.lowStockThreshold,
        unit: validated.unit,
        is_active: validated.isActive,
        is_featured: validated.isFeatured,
        image_url: validated.imageUrl,
        tags: validated.tags,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/produkte')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        categoryId: data.category_id,
        brandId: data.brand_id,
        retailPriceChf: data.retail_price_chf,
        costPriceChf: data.cost_price_chf,
        taxRate: data.tax_rate,
        stockQuantity: data.stock_quantity,
        lowStockThreshold: data.low_stock_threshold,
        unit: data.unit,
        isActive: data.is_active,
        isFeatured: data.is_featured,
        imageUrl: data.image_url,
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Produkts',
    }
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  salonId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<ApiResponse<Product>> {
  try {
    await requireStaff(salonId)

    const validated = productSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.sku !== undefined) updateData.sku = validated.sku
    if (validated.barcode !== undefined) updateData.barcode = validated.barcode
    if (validated.categoryId !== undefined) updateData.category_id = validated.categoryId
    if (validated.brandId !== undefined) updateData.brand_id = validated.brandId
    if (validated.retailPriceChf !== undefined)
      updateData.retail_price_chf = validated.retailPriceChf
    if (validated.costPriceChf !== undefined) updateData.cost_price_chf = validated.costPriceChf
    if (validated.taxRate !== undefined) updateData.tax_rate = validated.taxRate
    if (validated.stockQuantity !== undefined) updateData.stock_quantity = validated.stockQuantity
    if (validated.lowStockThreshold !== undefined)
      updateData.low_stock_threshold = validated.lowStockThreshold
    if (validated.unit !== undefined) updateData.unit = validated.unit
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.isFeatured !== undefined) updateData.is_featured = validated.isFeatured
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl
    if (validated.tags !== undefined) updateData.tags = validated.tags

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/produkte')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        categoryId: data.category_id,
        brandId: data.brand_id,
        retailPriceChf: data.retail_price_chf,
        costPriceChf: data.cost_price_chf,
        taxRate: data.tax_rate,
        stockQuantity: data.stock_quantity,
        lowStockThreshold: data.low_stock_threshold,
        unit: data.unit,
        isActive: data.is_active,
        isFeatured: data.is_featured,
        imageUrl: data.image_url,
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Produkts',
    }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(
  salonId: string,
  productId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/produkte')

    return { success: true }
  } catch (error) {
    console.error('Error deleting product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen des Produkts',
    }
  }
}

/**
 * Get product statistics
 */
export async function getProductStats(salonId: string): Promise<ApiResponse<ProductStats>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data: products, error } = await supabase
      .from('products')
      .select('stock_quantity, low_stock_threshold, is_active, cost_price_chf, retail_price_chf')
      .eq('salon_id', salonId)

    if (error) throw error

    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.is_active).length,
      lowStockProducts: products.filter(
        (p) => p.stock_quantity < (p.low_stock_threshold || 10)
      ).length,
      outOfStockProducts: products.filter((p) => p.stock_quantity === 0).length,
      totalInventoryValue: products.reduce((sum, p) => {
        const cost = parseFloat(p.cost_price_chf || p.retail_price_chf || '0')
        return sum + cost * p.stock_quantity
      }, 0),
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error('Error fetching product stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Statistiken',
    }
  }
}

// ============================================================
// INVENTORY TRANSACTIONS
// ============================================================

/**
 * Get inventory transactions with filtering
 */
export async function getInventoryTransactions(
  salonId: string,
  filters?: InventoryFilters
): Promise<ApiResponse<InventoryTransactionWithProduct[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('inventory_transactions')
      .select(
        `
        *,
        product:products!product_id(id, name, sku),
        performedByProfile:profiles!performed_by(first_name, last_name, email)
      `
      )
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.productId) {
      query = query.eq('product_id', filters.productId)
    }
    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType)
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data.map((txn: any) => ({
        id: txn.id,
        salonId: txn.salon_id,
        productId: txn.product_id,
        transactionType: txn.transaction_type,
        quantity: txn.quantity,
        unitCostChf: txn.unit_cost_chf,
        totalCostChf: txn.total_cost_chf,
        referenceType: txn.reference_type,
        referenceId: txn.reference_id,
        notes: txn.notes,
        performedBy: txn.performed_by,
        createdAt: txn.created_at,
        product: {
          id: txn.product.id,
          name: txn.product.name,
          sku: txn.product.sku,
        },
        performedByProfile: {
          firstName: txn.performedByProfile.first_name,
          lastName: txn.performedByProfile.last_name,
          email: txn.performedByProfile.email,
        },
      })),
    }
  } catch (error) {
    console.error('Error fetching inventory transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Transaktionen',
    }
  }
}

/**
 * Create an inventory transaction
 */
export async function createInventoryTransaction(
  salonId: string,
  performedBy: string,
  input: InventoryTransactionInput
): Promise<ApiResponse<InventoryTransaction>> {
  try {
    await requireStaff(salonId)

    const validated = inventoryTransactionSchema.parse(input)
    const supabase = await createClient()

    // Get current product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', validated.productId)
      .eq('salon_id', salonId)
      .single()

    if (productError) throw productError

    // Calculate new stock quantity
    const newStockQuantity = product.stock_quantity + validated.quantity

    if (newStockQuantity < 0) {
      throw new Error('Lagerbestand kann nicht negativ werden')
    }

    // Create transaction
    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert({
        salon_id: salonId,
        product_id: validated.productId,
        transaction_type: validated.transactionType,
        quantity: validated.quantity,
        unit_cost_chf: validated.unitCostChf,
        total_cost_chf: validated.totalCostChf,
        reference_type: validated.referenceType,
        reference_id: validated.referenceId,
        notes: validated.notes,
        performed_by: performedBy,
      })
      .select()
      .single()

    if (error) throw error

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newStockQuantity })
      .eq('id', validated.productId)
      .eq('salon_id', salonId)

    if (updateError) throw updateError

    revalidatePath('/admin/produkte')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        productId: data.product_id,
        transactionType: data.transaction_type,
        quantity: data.quantity,
        unitCostChf: data.unit_cost_chf,
        totalCostChf: data.total_cost_chf,
        referenceType: data.reference_type,
        referenceId: data.reference_id,
        notes: data.notes,
        performedBy: data.performed_by,
        createdAt: data.created_at,
      },
    }
  } catch (error) {
    console.error('Error creating inventory transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Transaktion',
    }
  }
}

// ============================================================
// CATEGORIES
// ============================================================

/**
 * Get all product categories
 */
export async function getProductCategories(
  salonId: string
): Promise<ApiResponse<ProductCategory[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('salon_id', salonId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data.map((cat) => ({
        id: cat.id,
        salonId: cat.salon_id,
        name: cat.name,
        description: cat.description,
        slug: cat.slug,
        parentCategoryId: cat.parent_category_id,
        displayOrder: cat.display_order,
        isActive: cat.is_active,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Kategorien',
    }
  }
}

/**
 * Create a product category
 */
export async function createProductCategory(
  salonId: string,
  input: ProductCategoryInput
): Promise<ApiResponse<ProductCategory>> {
  try {
    await requireAdmin(salonId)

    const validated = productCategorySchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        salon_id: salonId,
        name: validated.name,
        description: validated.description,
        slug: validated.slug,
        parent_category_id: validated.parentCategoryId,
        display_order: validated.displayOrder,
        is_active: validated.isActive,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/produkte')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        name: data.name,
        description: data.description,
        slug: data.slug,
        parentCategoryId: data.parent_category_id,
        displayOrder: data.display_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating product category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Kategorie',
    }
  }
}

// ============================================================
// BRANDS
// ============================================================

/**
 * Get all product brands
 */
export async function getProductBrands(salonId: string): Promise<ApiResponse<ProductBrand[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('product_brands')
      .select('*')
      .eq('salon_id', salonId)
      .order('name', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data.map((brand) => ({
        id: brand.id,
        salonId: brand.salon_id,
        name: brand.name,
        description: brand.description,
        slug: brand.slug,
        logoUrl: brand.logo_url,
        websiteUrl: brand.website_url,
        isActive: brand.is_active,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching product brands:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Marken',
    }
  }
}

/**
 * Create a product brand
 */
export async function createProductBrand(
  salonId: string,
  input: ProductBrandInput
): Promise<ApiResponse<ProductBrand>> {
  try {
    await requireAdmin(salonId)

    const validated = productBrandSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_brands')
      .insert({
        salon_id: salonId,
        name: validated.name,
        description: validated.description,
        slug: validated.slug,
        logo_url: validated.logoUrl,
        website_url: validated.websiteUrl,
        is_active: validated.isActive,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/produkte')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        name: data.name,
        description: data.description,
        slug: data.slug,
        logoUrl: data.logo_url,
        websiteUrl: data.website_url,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating product brand:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Marke',
    }
  }
}
