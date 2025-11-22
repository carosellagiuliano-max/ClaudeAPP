/**
 * Product & Inventory Management Types
 * Type definitions for admin product and inventory management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface Product {
  id: string
  salonId: string
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  categoryId: string | null
  brandId: string | null
  retailPriceChf: string
  costPriceChf: string | null
  taxRate: string
  stockQuantity: number
  lowStockThreshold: number | null
  unit: string
  isActive: boolean
  isFeatured: boolean
  imageUrl: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductWithCategory extends Product {
  category: {
    id: string
    name: string
  } | null
  brand: {
    id: string
    name: string
  } | null
}

export interface ProductCategory {
  id: string
  salonId: string
  name: string
  description: string | null
  slug: string
  parentCategoryId: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductBrand {
  id: string
  salonId: string
  name: string
  description: string | null
  slug: string
  logoUrl: string | null
  websiteUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: string
  salonId: string
  productId: string
  transactionType: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'return' | 'transfer'
  quantity: number
  unitCostChf: string | null
  totalCostChf: string | null
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  performedBy: string
  createdAt: string
}

export interface InventoryTransactionWithProduct extends InventoryTransaction {
  product: {
    id: string
    name: string
    sku: string | null
  }
  performedByProfile: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const productSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  retailPriceChf: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Ungültiger Preis'
    ),
  costPriceChf: z
    .string()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      'Ungültiger Einkaufspreis'
    )
    .optional(),
  taxRate: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
      'Steuersatz muss zwischen 0 und 100 sein'
    )
    .default('8.1'),
  stockQuantity: z.number().int().min(0, 'Menge kann nicht negativ sein').default(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  unit: z
    .enum(['piece', 'bottle', 'tube', 'jar', 'ml', 'g', 'kg', 'l', 'set'])
    .default('piece'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
})

export const productCategorySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  description: z.string().max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt'),
  parentCategoryId: z.string().uuid().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const productBrandSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  description: z.string().max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt'),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
})

export const inventoryTransactionSchema = z.object({
  productId: z.string().uuid(),
  transactionType: z.enum(['purchase', 'sale', 'adjustment', 'damage', 'return', 'transfer']),
  quantity: z.number().int().refine((val) => val !== 0, 'Menge darf nicht 0 sein'),
  unitCostChf: z
    .string()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      'Ungültiger Stückpreis'
    )
    .optional(),
  totalCostChf: z
    .string()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      'Ungültige Gesamtkosten'
    )
    .optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export type ProductInput = z.infer<typeof productSchema>
export type ProductCategoryInput = z.infer<typeof productCategorySchema>
export type ProductBrandInput = z.infer<typeof productBrandSchema>
export type InventoryTransactionInput = z.infer<typeof inventoryTransactionSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const PRODUCT_UNIT_LABELS: Record<string, string> = {
  piece: 'Stück',
  bottle: 'Flasche',
  tube: 'Tube',
  jar: 'Dose',
  ml: 'ml',
  g: 'g',
  kg: 'kg',
  l: 'Liter',
  set: 'Set',
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Einkauf',
  sale: 'Verkauf',
  adjustment: 'Anpassung',
  damage: 'Beschädigung',
  return: 'Rückgabe',
  transfer: 'Transfer',
}

export const TRANSACTION_TYPE_COLORS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  purchase: 'default',
  sale: 'secondary',
  adjustment: 'outline',
  damage: 'destructive',
  return: 'default',
  transfer: 'outline',
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ProductFilters {
  search?: string
  categoryId?: string
  brandId?: string
  isActive?: boolean
  isFeatured?: boolean
  lowStock?: boolean
}

export interface InventoryFilters {
  productId?: string
  transactionType?: string
  startDate?: string
  endDate?: string
}

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  totalInventoryValue: number
  outOfStockProducts: number
}
