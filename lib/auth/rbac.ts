/**
 * Role-Based Access Control (RBAC)
 *
 * Helper functions for checking user roles and permissions
 */

import { createClient } from '@/lib/db/client'

export type UserRole = 'admin' | 'staff' | 'customer'

export interface UserWithRoles {
  id: string
  email: string
  roles: Array<{
    role: UserRole
    salonId: string
  }>
}

/**
 * Get current user with roles
 */
export async function getCurrentUser(): Promise<UserWithRoles | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user roles from database
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      role:roles(name),
      salon_id
    `)
    .eq('user_id', user.id)

  const roles = (userRoles || []).map(ur => ({
    role: ur.role?.name as UserRole,
    salonId: ur.salon_id,
  }))

  return {
    id: user.id,
    email: user.email || '',
    roles,
  }
}

/**
 * Check if user has a specific role in a salon
 */
export async function hasRole(
  salonId: string,
  role: UserRole
): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) return false

  return user.roles.some(r => r.salonId === salonId && r.role === role)
}

/**
 * Check if user is admin in any salon
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) return false

  return user.roles.some(r => r.role === 'admin')
}

/**
 * Check if user is staff (or admin) in a salon
 */
export async function isStaff(salonId: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) return false

  return user.roles.some(
    r => r.salonId === salonId && (r.role === 'staff' || r.role === 'admin')
  )
}

/**
 * Get all salons where user has admin access
 */
export async function getAdminSalons(): Promise<string[]> {
  const user = await getCurrentUser()

  if (!user) return []

  return user.roles
    .filter(r => r.role === 'admin')
    .map(r => r.salonId)
}

/**
 * Require admin access or redirect
 * Use in Server Components or Route Handlers
 */
export async function requireAdmin(salonId?: string): Promise<void> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Nicht authentifiziert')
  }

  if (salonId) {
    const hasAccess = user.roles.some(
      r => r.salonId === salonId && r.role === 'admin'
    )

    if (!hasAccess) {
      throw new Error('Keine Berechtigung für diesen Salon')
    }
  } else {
    // Check if user is admin in any salon
    const hasAccess = user.roles.some(r => r.role === 'admin')

    if (!hasAccess) {
      throw new Error('Keine Admin-Berechtigung')
    }
  }
}

/**
 * Require staff access (or admin) or redirect
 */
export async function requireStaff(salonId: string): Promise<void> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Nicht authentifiziert')
  }

  const hasAccess = user.roles.some(
    r => r.salonId === salonId && (r.role === 'staff' || r.role === 'admin')
  )

  if (!hasAccess) {
    throw new Error('Keine Berechtigung')
  }
}

/**
 * Get customer ID for current authenticated user
 */
export async function getCurrentCustomerId(
  salonId?: string
): Promise<string | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const supabase = createClient()

    let query = supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)

    if (salonId) {
      query = query.eq('salon_id', salonId)
    }

    const { data, error } = await query.maybeSingle()

    if (error || !data) return null

    return data.id
  } catch {
    return null
  }
}
