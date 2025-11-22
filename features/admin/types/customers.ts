/**
 * Customer Management Types
 * Type definitions for admin customer management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface Customer {
  id: string
  salonId: string
  profileId: string
  customerNumber: string | null
  birthday: string | null
  gender: string | null
  preferredStaffId: string | null
  preferredServices: string[]
  notes: string | null
  source: string | null
  referralCode: string | null
  marketingConsent: boolean
  isActive: boolean
  isVip: boolean
  createdAt: string
  updatedAt: string
  lastVisitAt: string | null
}

export interface CustomerWithProfile extends Customer {
  profile: {
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  }
  preferredStaff?: {
    id: string
    displayName: string | null
  } | null
}

export interface CustomerWithStats extends CustomerWithProfile {
  stats: {
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    noShowAppointments: number
    totalSpent: number
    lastAppointmentDate: string | null
  }
}

export interface CustomerAddress {
  id: string
  salonId: string
  customerId: string
  addressType: 'shipping' | 'billing' | 'both'
  label: string | null
  firstName: string
  lastName: string
  company: string | null
  street: string
  street2: string | null
  city: string
  postalCode: string
  state: string | null
  country: string
  phone: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const customerSchema = z.object({
  profileId: z.string().uuid('Ungültige Profil-ID'),
  customerNumber: z.string().optional(),
  birthday: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Ungültiges Datum')
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  preferredStaffId: z.string().uuid().optional(),
  preferredServices: z.array(z.string().uuid()).optional(),
  notes: z.string().max(1000).optional(),
  source: z.string().max(100).optional(),
  referralCode: z.string().max(50).optional(),
  marketingConsent: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isVip: z.boolean().optional(),
})

export const customerAddressSchema = z.object({
  customerId: z.string().uuid(),
  addressType: z.enum(['shipping', 'billing', 'both']),
  label: z.string().max(50).optional(),
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  company: z.string().max(100).optional(),
  street: z.string().min(1, 'Strasse ist erforderlich').max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1, 'Stadt ist erforderlich').max(100),
  postalCode: z.string().min(4).max(4, 'PLZ muss 4-stellig sein'),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(2).default('CH'),
  phone: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
})

export type CustomerInput = z.infer<typeof customerSchema>
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const GENDER_LABELS: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  other: 'Divers',
  prefer_not_to_say: 'Keine Angabe',
}

export const SOURCE_LABELS: Record<string, string> = {
  google: 'Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  referral: 'Empfehlung',
  walk_in: 'Laufkundschaft',
  other: 'Andere',
}

export const ADDRESS_TYPE_LABELS: Record<string, string> = {
  shipping: 'Versandadresse',
  billing: 'Rechnungsadresse',
  both: 'Beides',
}

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

export interface CustomerFilters {
  search?: string
  isActive?: boolean
  isVip?: boolean
  source?: string
  hasAppointments?: boolean
}
