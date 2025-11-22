/**
 * Roles & Permissions Types
 * User roles, permissions, and audit log types
 */

import { z } from 'zod'

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Inhaber',
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Mitarbeiter',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Vollzugriff auf alle Funktionen und Einstellungen',
  admin: 'Verwaltung von Mitarbeitern, Kunden und Einstellungen',
  manager: 'Terminverwaltung, Berichte und Personal',
  staff: 'Eigene Termine und Kundenprofile',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  staff: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

// ============================================================
// CORE TYPES
// ============================================================

export interface UserWithRole {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  salonId: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  salonId: string
  userId: string
  action: string
  entityType: string
  entityId: string | null
  changes: Record<string, any> | null
  metadata: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLogWithUser extends AuditLog {
  user: {
    email: string
    firstName: string | null
    lastName: string | null
  }
}

// ============================================================
// FILTERS
// ============================================================

export interface AuditLogFilters {
  userId?: string
  action?: string
  entityType?: string
  dateFrom?: string
  dateTo?: string
  search?: string
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

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'staff']),
})

export type AssignRoleInput = z.infer<typeof assignRoleSchema>

// ============================================================
// PERMISSIONS MATRIX
// ============================================================

export interface Permission {
  key: string
  label: string
  description: string
  roles: UserRole[]
}

export const PERMISSIONS: Permission[] = [
  {
    key: 'salon.settings',
    label: 'Salon-Einstellungen',
    description: 'Öffnungszeiten, Kontaktdaten, Branding',
    roles: ['owner', 'admin'],
  },
  {
    key: 'staff.manage',
    label: 'Mitarbeiter verwalten',
    description: 'Mitarbeiter erstellen, bearbeiten, löschen',
    roles: ['owner', 'admin'],
  },
  {
    key: 'staff.view',
    label: 'Mitarbeiter anzeigen',
    description: 'Mitarbeiterliste und Profile ansehen',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'services.manage',
    label: 'Services verwalten',
    description: 'Services erstellen, bearbeiten, löschen',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'appointments.manage_all',
    label: 'Alle Termine verwalten',
    description: 'Termine aller Mitarbeiter verwalten',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'appointments.manage_own',
    label: 'Eigene Termine verwalten',
    description: 'Nur eigene Termine verwalten',
    roles: ['staff'],
  },
  {
    key: 'customers.manage',
    label: 'Kunden verwalten',
    description: 'Kundenprofile erstellen und bearbeiten',
    roles: ['owner', 'admin', 'manager', 'staff'],
  },
  {
    key: 'products.manage',
    label: 'Produkte verwalten',
    description: 'Produktkatalog und Lagerbestand',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'orders.manage',
    label: 'Bestellungen verwalten',
    description: 'Bestellungen ansehen und bearbeiten',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'orders.refund',
    label: 'Rückerstattungen',
    description: 'Rückerstattungen verarbeiten',
    roles: ['owner', 'admin'],
  },
  {
    key: 'analytics.view',
    label: 'Analytics anzeigen',
    description: 'Umsatzberichte und Statistiken',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'roles.manage',
    label: 'Rollen verwalten',
    description: 'Benutzerrollen zuweisen',
    roles: ['owner', 'admin'],
  },
  {
    key: 'audit.view',
    label: 'Audit-Logs anzeigen',
    description: 'System-Aktivitäten einsehen',
    roles: ['owner', 'admin'],
  },
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function hasPermission(userRole: UserRole, permissionKey: string): boolean {
  const permission = PERMISSIONS.find((p) => p.key === permissionKey)
  if (!permission) return false
  return permission.roles.includes(userRole)
}

export function getUserPermissions(userRole: UserRole): Permission[] {
  return PERMISSIONS.filter((p) => p.roles.includes(userRole))
}

export function formatUserName(user: {
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim()
  }
  return user.email
}
