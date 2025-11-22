/**
 * HQ (Headquarters) Types
 * Cross-salon analytics and management for multi-salon operations
 */

import { z } from 'zod'

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export type HQRole = 'hq_owner' | 'hq_manager' | 'hq_analyst'

export const HQ_ROLE_LABELS: Record<HQRole, string> = {
  hq_owner: 'HQ Owner',
  hq_manager: 'HQ Manager',
  hq_analyst: 'HQ Analyst',
}

export const HQ_ROLE_DESCRIPTIONS: Record<HQRole, string> = {
  hq_owner: 'Full access to all salons and HQ dashboard',
  hq_manager: 'Manage operations across all salons',
  hq_analyst: 'View-only access to cross-salon analytics',
}

// ============================================================
// CORE TYPES
// ============================================================

export interface HQUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  hqRole: HQRole
  salonAccess: string[] // Array of salon IDs this HQ user can access
  createdAt: string
  updatedAt: string
}

export interface SalonSummary {
  id: string
  name: string
  city: string | null
  active: boolean
  staffCount: number
  customerCount: number
  monthlyRevenue: number
  monthlyAppointments: number
  lastActivity: string | null
}

export interface CrossSalonMetrics {
  periodStart: string
  periodEnd: string
  totalRevenue: number
  totalAppointments: number
  totalOrders: number
  totalCustomers: number
  averageOrderValue: number
  topSalon: {
    id: string
    name: string
    revenue: number
  } | null
  revenueByS alon: Array<{
    salonId: string
    salonName: string
    revenue: number
    appointments: number
    orders: number
  }>
}

export interface CrossSalonComparison {
  metric: string
  salons: Array<{
    salonId: string
    salonName: string
    value: number
    rank: number
    percentageOfTotal: number
  }>
}

// ============================================================
// FILTERS
// ============================================================

export interface HQFilters {
  dateFrom?: string
  dateTo?: string
  salonIds?: string[] // Filter to specific salons
  metric?: 'revenue' | 'appointments' | 'customers' | 'orders'
}

// ============================================================
// API TYPES
// ============================================================

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================
// INPUT VALIDATION
// ============================================================

export const assignHQRoleSchema = z.object({
  userId: z.string().uuid(),
  hqRole: z.enum(['hq_owner', 'hq_manager', 'hq_analyst']),
  salonIds: z.array(z.string().uuid()).optional(),
})

export type AssignHQRoleInput = z.infer<typeof assignHQRoleSchema>

// ============================================================
// HQ PERMISSIONS
// ============================================================

export interface HQPermission {
  key: string
  label: string
  description: string
  roles: HQRole[]
}

export const HQ_PERMISSIONS: HQPermission[] = [
  {
    key: 'hq.dashboard',
    label: 'HQ Dashboard Access',
    description: 'Access cross-salon analytics dashboard',
    roles: ['hq_owner', 'hq_manager', 'hq_analyst'],
  },
  {
    key: 'hq.salons.manage',
    label: 'Manage Salons',
    description: 'Create, edit, deactivate salons',
    roles: ['hq_owner', 'hq_manager'],
  },
  {
    key: 'hq.users.manage',
    label: 'Manage HQ Users',
    description: 'Assign HQ roles to users',
    roles: ['hq_owner'],
  },
  {
    key: 'hq.analytics.view',
    label: 'View Cross-Salon Analytics',
    description: 'See aggregated metrics across all salons',
    roles: ['hq_owner', 'hq_manager', 'hq_analyst'],
  },
  {
    key: 'hq.analytics.export',
    label: 'Export Analytics Data',
    description: 'Download cross-salon reports',
    roles: ['hq_owner', 'hq_manager', 'hq_analyst'],
  },
  {
    key: 'hq.settings.manage',
    label: 'Manage HQ Settings',
    description: 'Configure global settings',
    roles: ['hq_owner'],
  },
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function hasHQPermission(hqRole: HQRole, permissionKey: string): boolean {
  const permission = HQ_PERMISSIONS.find(p => p.key === permissionKey)
  if (!permission) return false
  return permission.roles.includes(hqRole)
}

export function getHQPermissions(hqRole: HQRole): HQPermission[] {
  return HQ_PERMISSIONS.filter(p => p.roles.includes(hqRole))
}

/**
 * Check if user has HQ access to specific salons
 */
export function canAccessSalon(hqUser: HQUser, salonId: string): boolean {
  // HQ Owner has access to all salons
  if (hqUser.hqRole === 'hq_owner') {
    return true
  }

  // Others need explicit salon access
  return hqUser.salonAccess.includes(salonId)
}

/**
 * Check if user has HQ access to ALL salons (unrestricted)
 */
export function hasUnrestrictedAccess(hqUser: HQUser): boolean {
  return hqUser.hqRole === 'hq_owner'
}
