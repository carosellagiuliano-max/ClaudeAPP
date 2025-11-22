/**
 * Services Management Types
 * Type definitions for admin services management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface ServiceCategory {
  id: string
  salonId: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  imageUrl: string | null
  displayOrder: number
  seoTitle: string | null
  seoDescription: string | null
  isActive: boolean
  showOnline: boolean
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  salonId: string
  categoryId: string | null
  internalName: string
  publicTitle: string
  slug: string
  description: string | null
  basePriceChf: number
  baseDurationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  taxRateId: string | null
  onlineBookable: boolean
  requiresDeposit: boolean
  depositAmountChf: number | null
  imageUrl: string | null
  displayOrder: number
  seoTitle: string | null
  seoDescription: string | null
  tags: string[]
  metadata: Record<string, any>
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

export interface ServiceWithCategory extends Service {
  category: ServiceCategory | null
}

export interface ServicePrice {
  id: string
  salonId: string
  serviceId: string
  taxRateId: string | null
  priceChf: number
  durationMinutes: number | null
  validFrom: string
  validTo: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxRate {
  id: string
  salonId: string
  code: string
  description: string
  ratePercent: number
  validFrom: string
  validTo: string | null
  appliesTo: 'services' | 'products' | 'both'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const serviceCategorySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  slug: z
    .string()
    .min(1, 'Slug ist erforderlich')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültiger Hex-Farbcode').optional(),
  imageUrl: z.string().url('Ungültige URL').optional(),
  displayOrder: z.number().int().min(0).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  isActive: z.boolean().optional(),
  showOnline: z.boolean().optional(),
})

export const serviceSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  internalName: z.string().min(1, 'Interner Name ist erforderlich').max(100),
  publicTitle: z.string().min(1, 'Öffentlicher Titel ist erforderlich').max(200),
  slug: z
    .string()
    .min(1, 'Slug ist erforderlich')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  description: z.string().optional(),
  basePriceChf: z.number().min(0, 'Preis muss mindestens 0 sein'),
  baseDurationMinutes: z.number().int().min(1, 'Dauer muss mindestens 1 Minute sein'),
  bufferBeforeMinutes: z.number().int().min(0).optional(),
  bufferAfterMinutes: z.number().int().min(0).optional(),
  taxRateId: z.string().uuid().nullable().optional(),
  onlineBookable: z.boolean().optional(),
  requiresDeposit: z.boolean().optional(),
  depositAmountChf: z.number().min(0).optional(),
  imageUrl: z.string().url('Ungültige URL').optional(),
  displayOrder: z.number().int().min(0).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

export const servicePriceSchema = z.object({
  serviceId: z.string().uuid(),
  taxRateId: z.string().uuid().nullable().optional(),
  priceChf: z.number().min(0, 'Preis muss mindestens 0 sein'),
  durationMinutes: z.number().int().min(1).optional(),
  validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum'),
  validTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum')
    .nullable()
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type ServicePriceInput = z.infer<typeof servicePriceSchema>

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
