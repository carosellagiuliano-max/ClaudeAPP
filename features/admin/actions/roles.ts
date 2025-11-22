'use server'

/**
 * Roles & Permissions Server Actions
 * Manage user roles and view audit logs
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  UserWithRole,
  AuditLog,
  AuditLogWithUser,
  AuditLogFilters,
  AssignRoleInput,
} from '../types/roles'
import { assignRoleSchema } from '../types/roles'

// ============================================================
// USER ROLES
// ============================================================

/**
 * Get all users with their roles for a salon
 */
export async function getSalonUsers(salonId: string): Promise<ApiResponse<UserWithRole[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('salon_staff')
      .select(
        `
        id,
        role,
        created_at,
        updated_at,
        staff:staff_id(
          id,
          profile:profiles!profile_id(
            email,
            first_name,
            last_name
          )
        )
      `
      )
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const users: UserWithRole[] = data.map((item: any) => ({
      id: item.staff.id,
      email: item.staff.profile.email,
      firstName: item.staff.profile.first_name,
      lastName: item.staff.profile.last_name,
      role: item.role,
      salonId: salonId,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return {
      success: true,
      data: users,
    }
  } catch (error) {
    console.error('Error fetching salon users:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Benutzer',
    }
  }
}

/**
 * Assign or update a user's role
 */
export async function assignRole(
  salonId: string,
  input: AssignRoleInput
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const validated = assignRoleSchema.parse(input)
    const supabase = await createClient()

    // Update role in salon_staff
    const { error } = await supabase
      .from('salon_staff')
      .update({ role: validated.role })
      .eq('salon_id', salonId)
      .eq('staff_id', validated.userId)

    if (error) throw error

    // Log the action
    await logAuditEntry(salonId, {
      action: 'role.update',
      entityType: 'user',
      entityId: validated.userId,
      changes: { role: validated.role },
    })

    revalidatePath('/admin/rollen')

    return { success: true }
  } catch (error) {
    console.error('Error assigning role:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Zuweisen der Rolle',
    }
  }
}

/**
 * Remove a user from the salon (soft delete)
 */
export async function removeUserFromSalon(
  salonId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()

    // Delete salon_staff record
    const { error } = await supabase
      .from('salon_staff')
      .delete()
      .eq('salon_id', salonId)
      .eq('staff_id', userId)

    if (error) throw error

    // Log the action
    await logAuditEntry(salonId, {
      action: 'user.remove',
      entityType: 'user',
      entityId: userId,
    })

    revalidatePath('/admin/rollen')

    return { success: true }
  } catch (error) {
    console.error('Error removing user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Entfernen des Benutzers',
    }
  }
}

// ============================================================
// AUDIT LOGS
// ============================================================

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(
  salonId: string,
  filters?: AuditLogFilters
): Promise<ApiResponse<AuditLogWithUser[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        user:profiles!user_id(
          email,
          first_name,
          last_name
        )
      `
      )
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply filters
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    let logs: AuditLogWithUser[] = data.map((log: any) => ({
      id: log.id,
      salonId: log.salon_id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      changes: log.changes,
      metadata: log.metadata,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
      user: {
        email: log.user.email,
        firstName: log.user.first_name,
        lastName: log.user.last_name,
      },
    }))

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(searchLower) ||
          log.entityType.toLowerCase().includes(searchLower) ||
          log.user.email.toLowerCase().includes(searchLower) ||
          `${log.user.firstName || ''} ${log.user.lastName || ''}`
            .toLowerCase()
            .includes(searchLower)
      )
    }

    return {
      success: true,
      data: logs,
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Audit-Logs',
    }
  }
}

/**
 * Get available actions for filtering
 */
export async function getAuditActions(salonId: string): Promise<ApiResponse<string[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action')
      .eq('salon_id', salonId)

    if (error) throw error

    const uniqueActions = [...new Set(data.map((log) => log.action))].sort()

    return {
      success: true,
      data: uniqueActions,
    }
  } catch (error) {
    console.error('Error fetching audit actions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Aktionen',
    }
  }
}

/**
 * Get available entity types for filtering
 */
export async function getAuditEntityTypes(salonId: string): Promise<ApiResponse<string[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('entity_type')
      .eq('salon_id', salonId)

    if (error) throw error

    const uniqueTypes = [...new Set(data.map((log) => log.entity_type))].sort()

    return {
      success: true,
      data: uniqueTypes,
    }
  } catch (error) {
    console.error('Error fetching entity types:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Entitätstypen',
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Log an audit entry (internal helper)
 */
async function logAuditEntry(
  salonId: string,
  entry: {
    action: string
    entityType: string
    entityId?: string | null
    changes?: Record<string, any>
    metadata?: Record<string, any>
  }
): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('audit_logs').insert({
      salon_id: salonId,
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      changes: entry.changes || null,
      metadata: entry.metadata || null,
      ip_address: null, // TODO: Get from request headers
      user_agent: null, // TODO: Get from request headers
    })
  } catch (error) {
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging should not break operations
  }
}
