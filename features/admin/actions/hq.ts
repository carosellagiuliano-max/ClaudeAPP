'use server'

/**
 * HQ (Headquarters) Server Actions
 * Cross-salon analytics and management
 */

import { createClient } from '@/lib/supabase/server'
import type {
  ApiResponse,
  HQUser,
  SalonSummary,
  CrossSalonMetrics,
  CrossSalonComparison,
  HQFilters,
  AssignHQRoleInput,
} from '../types/hq'
import { assignHQRoleSchema, canAccessSalon, hasUnrestrictedAccess } from '../types/hq'

// ============================================================
// HQ USER MANAGEMENT
// ============================================================

/**
 * Get current user's HQ status
 */
export async function getMyHQStatus(): Promise<ApiResponse<HQUser | null>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: true, data: null }
    }

    // Check if user has HQ role (stored in profiles table)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, hq_role, hq_salon_access')
      .eq('id', user.id)
      .single()

    if (error) throw error

    if (!data.hq_role) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        hqRole: data.hq_role,
        salonAccess: data.hq_salon_access || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Error getting HQ status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des HQ-Status',
    }
  }
}

/**
 * Assign HQ role to user (requires hq_owner role)
 */
export async function assignHQRole(input: AssignHQRoleInput): Promise<ApiResponse<void>> {
  try {
    // Verify current user has hq_owner role
    const statusResult = await getMyHQStatus()
    if (!statusResult.success || !statusResult.data) {
      return { success: false, error: 'Keine HQ-Berechtigung' }
    }

    if (statusResult.data.hqRole !== 'hq_owner') {
      return { success: false, error: 'Nur HQ Owner können Rollen zuweisen' }
    }

    const validated = assignHQRoleSchema.parse(input)
    const supabase = await createClient()

    // Update user profile with HQ role
    const { error } = await supabase
      .from('profiles')
      .update({
        hq_role: validated.hqRole,
        hq_salon_access: validated.salonIds || null,
      })
      .eq('id', validated.userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error assigning HQ role:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Zuweisen der HQ-Rolle',
    }
  }
}

// ============================================================
// SALON MANAGEMENT
// ============================================================

/**
 * Get all salons (HQ view)
 */
export async function getAllSalons(): Promise<ApiResponse<SalonSummary[]>> {
  try {
    const hqStatus = await getMyHQStatus()
    if (!hqStatus.success || !hqStatus.data) {
      return { success: false, error: 'Keine HQ-Berechtigung' }
    }

    const supabase = await createClient()

    // If not unrestricted, filter to allowed salons
    let query = supabase.from('salons').select('*').order('name')

    if (!hasUnrestrictedAccess(hqStatus.data)) {
      query = query.in('id', hqStatus.data.salonAccess)
    }

    const { data: salons, error } = await query

    if (error) throw error

    // Get aggregated stats for each salon
    const summaries: SalonSummary[] = []

    for (const salon of salons || []) {
      // Get staff count
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon.id)
        .eq('active', true)

      // Get customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon.id)

      // Get this month's revenue
      const thisMonthStart = new Date()
      thisMonthStart.setDate(1)
      thisMonthStart.setHours(0, 0, 0, 0)

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount_chf')
        .eq('salon_id', salon.id)
        .gte('created_at', thisMonthStart.toISOString())
        .eq('payment_status', 'captured')

      const monthlyRevenue = orders?.reduce((sum, o) => sum + o.total_amount_chf, 0) || 0

      // Get this month's appointments
      const { count: monthlyAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon.id)
        .gte('starts_at', thisMonthStart.toISOString())

      // Get last activity (most recent appointment or order)
      const { data: lastAppointment } = await supabase
        .from('appointments')
        .select('created_at')
        .eq('salon_id', salon.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      summaries.push({
        id: salon.id,
        name: salon.name,
        city: salon.city,
        active: salon.active,
        staffCount: staffCount || 0,
        customerCount: customerCount || 0,
        monthlyRevenue,
        monthlyAppointments: monthlyAppointments || 0,
        lastActivity: lastAppointment?.created_at || null,
      })
    }

    return { success: true, data: summaries }
  } catch (error) {
    console.error('Error fetching salons:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Salons',
    }
  }
}

// ============================================================
// CROSS-SALON ANALYTICS
// ============================================================

/**
 * Get aggregated metrics across all salons
 */
export async function getCrossSalonMetrics(
  filters: HQFilters = {}
): Promise<ApiResponse<CrossSalonMetrics>> {
  try {
    const hqStatus = await getMyHQStatus()
    if (!hqStatus.success || !hqStatus.data) {
      return { success: false, error: 'Keine HQ-Berechtigung' }
    }

    const supabase = await createClient()

    // Date range defaults
    const dateFrom = filters.dateFrom || new Date(new Date().setDate(1)).toISOString().split('T')[0]
    const dateTo = filters.dateTo || new Date().toISOString().split('T')[0]

    // Get accessible salons
    let salonIds = filters.salonIds || []
    if (salonIds.length === 0) {
      if (hasUnrestrictedAccess(hqStatus.data)) {
        // Get all salons
        const { data: allSalons } = await supabase.from('salons').select('id')
        salonIds = allSalons?.map(s => s.id) || []
      } else {
        salonIds = hqStatus.data.salonAccess
      }
    }

    // Verify access to requested salons
    for (const salonId of salonIds) {
      if (!canAccessSalon(hqStatus.data, salonId)) {
        return { success: false, error: 'Keine Berechtigung für diesen Salon' }
      }
    }

    // Get orders data
    const { data: orders } = await supabase
      .from('orders')
      .select('salon_id, total_amount_chf, salons(name)')
      .in('salon_id', salonIds)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .eq('payment_status', 'captured')

    // Get appointments data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('salon_id, total_price_chf, salons(name)')
      .in('salon_id', salonIds)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)
      .eq('status', 'completed')

    // Get unique customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .in('salon_id', salonIds)

    // Calculate totals
    const totalOrderRevenue = orders?.reduce((sum, o) => sum + o.total_amount_chf, 0) || 0
    const totalAppointmentRevenue =
      appointments?.reduce((sum, a) => sum + a.total_price_chf, 0) || 0
    const totalRevenue = totalOrderRevenue + totalAppointmentRevenue

    const totalOrders = orders?.length || 0
    const totalAppointments = appointments?.length || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Revenue by salon
    const revenueMap = new Map<
      string,
      { salonName: string; revenue: number; appointments: number; orders: number }
    >()

    for (const order of orders || []) {
      const salonId = order.salon_id
      const existing = revenueMap.get(salonId) || {
        salonName: (order.salons as any)?.name || 'Unknown',
        revenue: 0,
        appointments: 0,
        orders: 0,
      }
      existing.revenue += order.total_amount_chf
      existing.orders += 1
      revenueMap.set(salonId, existing)
    }

    for (const apt of appointments || []) {
      const salonId = apt.salon_id
      const existing = revenueMap.get(salonId) || {
        salonName: (apt.salons as any)?.name || 'Unknown',
        revenue: 0,
        appointments: 0,
        orders: 0,
      }
      existing.revenue += apt.total_price_chf
      existing.appointments += 1
      revenueMap.set(salonId, existing)
    }

    const revenueByS alon = Array.from(revenueMap.entries())
      .map(([salonId, data]) => ({
        salonId,
        salonName: data.salonName,
        revenue: data.revenue,
        appointments: data.appointments,
        orders: data.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const topSalon =
      revenueByS alon.length > 0
        ? {
            id: revenueByS alon[0].salonId,
            name: revenueByS alon[0].salonName,
            revenue: revenueByS alon[0].revenue,
          }
        : null

    return {
      success: true,
      data: {
        periodStart: dateFrom,
        periodEnd: dateTo,
        totalRevenue,
        totalAppointments,
        totalOrders,
        totalCustomers: totalCustomers || 0,
        averageOrderValue,
        topSalon,
        revenueByS alon,
      },
    }
  } catch (error) {
    console.error('Error getting cross-salon metrics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Metriken',
    }
  }
}

/**
 * Get comparison of specific metric across salons
 */
export async function getSalonComparison(
  metric: 'revenue' | 'appointments' | 'customers' | 'orders',
  filters: HQFilters = {}
): Promise<ApiResponse<CrossSalonComparison>> {
  try {
    const hqStatus = await getMyHQStatus()
    if (!hqStatus.success || !hqStatus.data) {
      return { success: false, error: 'Keine HQ-Berechtigung' }
    }

    const metricsResult = await getCrossSalonMetrics(filters)
    if (!metricsResult.success || !metricsResult.data) {
      return { success: false, error: metricsResult.error }
    }

    const metrics = metricsResult.data

    // Extract values based on metric
    const values = metrics.revenueByS alon.map(salon => {
      let value = 0
      switch (metric) {
        case 'revenue':
          value = salon.revenue
          break
        case 'appointments':
          value = salon.appointments
          break
        case 'orders':
          value = salon.orders
          break
        case 'customers':
          // Would need separate query, for now use 0
          value = 0
          break
      }

      return {
        salonId: salon.salonId,
        salonName: salon.salonName,
        value,
      }
    })

    // Calculate total for percentage
    const total = values.reduce((sum, v) => sum + v.value, 0)

    // Sort and rank
    values.sort((a, b) => b.value - a.value)

    const comparison: CrossSalonComparison = {
      metric,
      salons: values.map((v, index) => ({
        ...v,
        rank: index + 1,
        percentageOfTotal: total > 0 ? (v.value / total) * 100 : 0,
      })),
    }

    return { success: true, data: comparison }
  } catch (error) {
    console.error('Error getting salon comparison:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Vergleich',
    }
  }
}

/**
 * Export cross-salon data as CSV
 */
export async function exportCrossSalonData(filters: HQFilters = {}): Promise<ApiResponse<string>> {
  try {
    const metricsResult = await getCrossSalonMetrics(filters)
    if (!metricsResult.success || !metricsResult.data) {
      return { success: false, error: metricsResult.error }
    }

    const metrics = metricsResult.data

    // Generate CSV
    const headers = ['Salon', 'Umsatz (CHF)', 'Termine', 'Bestellungen', 'Anteil (%)']
    const total = metrics.totalRevenue

    const rows = metrics.revenueByS alon.map(salon => [
      salon.salonName,
      salon.revenue.toFixed(2),
      salon.appointments.toString(),
      salon.orders.toString(),
      total > 0 ? ((salon.revenue / total) * 100).toFixed(1) : '0.0',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Total,${total.toFixed(2)},${metrics.totalAppointments},${metrics.totalOrders},100.0`,
    ].join('\n')

    return { success: true, data: csv }
  } catch (error) {
    console.error('Error exporting data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Exportieren',
    }
  }
}
