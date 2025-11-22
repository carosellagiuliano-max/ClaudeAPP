'use server'

/**
 * Analytics & Finance Server Actions
 * Revenue reports, statistics, and exports
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  RevenueMetrics,
  RevenueByPeriod,
  StaffPerformance,
  ServiceStatistics,
  ProductSales,
  VatReport,
  VatSummary,
  AnalyticsFilters,
} from '../types/analytics'

// ============================================================
// REVENUE ANALYTICS
// ============================================================

/**
 * Get revenue metrics for a period
 */
export async function getRevenueMetrics(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<RevenueMetrics>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get orders revenue
    const { data: orders } = await supabase
      .from('orders')
      .select('total_chf, status')
      .eq('salon_id', salonId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])

    // Get appointments revenue
    const { data: appointments } = await supabase
      .from('appointments')
      .select('total_price_chf, status')
      .eq('salon_id', salonId)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)
      .eq('status', 'completed')

    const ordersRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total_chf || '0'), 0) || 0
    const appointmentsRevenue =
      appointments?.reduce((sum, a) => sum + parseFloat(a.total_price_chf || '0'), 0) || 0

    const totalRevenue = ordersRevenue + appointmentsRevenue
    const totalOrders = orders?.length || 0
    const totalAppointments = appointments?.length || 0

    return {
      success: true,
      data: {
        totalRevenue,
        appointmentsRevenue,
        productsRevenue: ordersRevenue,
        averageOrderValue: totalOrders > 0 ? ordersRevenue / totalOrders : 0,
        totalOrders,
        totalAppointments,
        periodStart: dateFrom,
        periodEnd: dateTo,
      },
    }
  } catch (error) {
    console.error('Error fetching revenue metrics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Umsatzmetriken',
    }
  }
}

/**
 * Get revenue grouped by period (day, week, month)
 */
export async function getRevenueByPeriod(
  salonId: string,
  dateFrom: string,
  dateTo: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<ApiResponse<RevenueByPeriod[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('total_chf, created_at, status')
      .eq('salon_id', salonId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])

    // Get appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('total_price_chf, starts_at, status')
      .eq('salon_id', salonId)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)
      .eq('status', 'completed')

    // Group by period (client-side aggregation)
    const periodMap = new Map<string, { revenue: number; orders: number; appointments: number }>()

    const getPeriodKey = (dateStr: string) => {
      const date = new Date(dateStr)
      if (groupBy === 'day') {
        return date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const week = getWeekNumber(date)
        return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`
      } else {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      }
    }

    // Aggregate orders
    orders?.forEach((order) => {
      const period = getPeriodKey(order.created_at)
      const current = periodMap.get(period) || { revenue: 0, orders: 0, appointments: 0 }
      current.revenue += parseFloat(order.total_chf || '0')
      current.orders += 1
      periodMap.set(period, current)
    })

    // Aggregate appointments
    appointments?.forEach((appointment) => {
      const period = getPeriodKey(appointment.starts_at)
      const current = periodMap.get(period) || { revenue: 0, orders: 0, appointments: 0 }
      current.revenue += parseFloat(appointment.total_price_chf || '0')
      current.appointments += 1
      periodMap.set(period, current)
    })

    const data = Array.from(periodMap.entries())
      .map(([period, stats]) => ({
        period,
        revenue: stats.revenue,
        orders: stats.orders,
        appointments: stats.appointments,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error fetching revenue by period:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Umsatzdaten',
    }
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ============================================================
// STAFF PERFORMANCE
// ============================================================

/**
 * Get staff performance statistics
 */
export async function getStaffPerformance(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<StaffPerformance[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    const { data: appointments } = await supabase
      .from('appointments')
      .select(
        `
        id,
        staff_id,
        status,
        total_price_chf,
        staff:staff!staff_id(id, display_name)
      `
      )
      .eq('salon_id', salonId)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)

    if (!appointments) {
      return { success: true, data: [] }
    }

    // Group by staff
    const staffMap = new Map<string, any>()

    appointments.forEach((appt) => {
      if (!appt.staff_id) return

      const staffId = appt.staff_id
      const current = staffMap.get(staffId) || {
        staffId,
        staffName: appt.staff?.display_name || 'Unbekannt',
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        totalRevenue: 0,
      }

      current.totalAppointments += 1

      if (appt.status === 'completed') {
        current.completedAppointments += 1
        current.totalRevenue += parseFloat(appt.total_price_chf || '0')
      } else if (appt.status === 'cancelled') {
        current.cancelledAppointments += 1
      }

      staffMap.set(staffId, current)
    })

    const data: StaffPerformance[] = Array.from(staffMap.values()).map((staff) => ({
      staffId: staff.staffId,
      staffName: staff.staffName,
      totalAppointments: staff.totalAppointments,
      completedAppointments: staff.completedAppointments,
      cancelledAppointments: staff.cancelledAppointments,
      totalRevenue: staff.totalRevenue,
      averageRevenue:
        staff.completedAppointments > 0
          ? staff.totalRevenue / staff.completedAppointments
          : 0,
      topService: null, // TODO: Calculate from appointment_services
    }))

    return {
      success: true,
      data: data.sort((a, b) => b.totalRevenue - a.totalRevenue),
    }
  } catch (error) {
    console.error('Error fetching staff performance:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Mitarbeiterstatistiken',
    }
  }
}

// ============================================================
// SERVICE STATISTICS
// ============================================================

/**
 * Get service booking statistics
 */
export async function getServiceStatistics(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<ServiceStatistics[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get appointment services
    const { data: appointmentServices } = await supabase
      .from('appointment_services')
      .select(
        `
        service_id,
        service_name,
        price_snapshot_chf,
        appointment:appointments!appointment_id(
          status,
          starts_at,
          salon_id
        )
      `
      )
      .gte('appointment.starts_at', dateFrom)
      .lte('appointment.starts_at', dateTo)
      .eq('appointment.salon_id', salonId)

    if (!appointmentServices) {
      return { success: true, data: [] }
    }

    // Group by service
    const serviceMap = new Map<string, any>()

    appointmentServices.forEach((svc) => {
      const serviceId = svc.service_id
      const current = serviceMap.get(serviceId) || {
        serviceId,
        serviceName: svc.service_name,
        categoryName: null,
        totalBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
      }

      current.totalBookings += 1

      if (svc.appointment?.status === 'completed') {
        current.completedBookings += 1
        current.totalRevenue += parseFloat(svc.price_snapshot_chf || '0')
      }

      serviceMap.set(serviceId, current)
    })

    const data: ServiceStatistics[] = Array.from(serviceMap.values()).map((svc) => ({
      serviceId: svc.serviceId,
      serviceName: svc.serviceName,
      categoryName: svc.categoryName,
      totalBookings: svc.totalBookings,
      completedBookings: svc.completedBookings,
      totalRevenue: svc.totalRevenue,
      averagePrice: svc.completedBookings > 0 ? svc.totalRevenue / svc.completedBookings : 0,
    }))

    return {
      success: true,
      data: data.sort((a, b) => b.totalRevenue - a.totalRevenue),
    }
  } catch (error) {
    console.error('Error fetching service statistics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Dienstleistungsstatistiken',
    }
  }
}

// ============================================================
// PRODUCT SALES
// ============================================================

/**
 * Get product sales statistics
 */
export async function getProductSales(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<ProductSales[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get order items from completed orders
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(
        `
        product_id,
        product_name,
        quantity,
        total_chf,
        order:orders!order_id(
          status,
          created_at,
          salon_id
        )
      `
      )
      .gte('order.created_at', dateFrom)
      .lte('order.created_at', dateTo)
      .eq('order.salon_id', salonId)
      .in('order.status', ['paid', 'processing', 'shipped', 'delivered'])

    if (!orderItems) {
      return { success: true, data: [] }
    }

    // Group by product
    const productMap = new Map<string, any>()

    orderItems.forEach((item) => {
      if (!item.product_id) return

      const productId = item.product_id
      const current = productMap.get(productId) || {
        productId,
        productName: item.product_name,
        categoryName: null,
        totalQuantity: 0,
        totalRevenue: 0,
        orders: new Set(),
      }

      current.totalQuantity += item.quantity
      current.totalRevenue += parseFloat(item.total_chf || '0')
      current.orders.add(item.order)

      productMap.set(productId, current)
    })

    const data: ProductSales[] = Array.from(productMap.values()).map((prod) => ({
      productId: prod.productId,
      productName: prod.productName,
      categoryName: prod.categoryName,
      totalQuantity: prod.totalQuantity,
      totalRevenue: prod.totalRevenue,
      totalOrders: prod.orders.size,
      averageOrderQuantity: prod.orders.size > 0 ? prod.totalQuantity / prod.orders.size : 0,
    }))

    return {
      success: true,
      data: data.sort((a, b) => b.totalRevenue - a.totalRevenue),
    }
  } catch (error) {
    console.error('Error fetching product sales:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Produktverkäufe',
    }
  }
}

// ============================================================
// VAT REPORTS
// ============================================================

/**
 * Get VAT summary for accounting
 */
export async function getVatReport(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<VatReport>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get orders with VAT
    const { data: orders } = await supabase
      .from('orders')
      .select('subtotal_chf, tax_total_chf, total_chf')
      .eq('salon_id', salonId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])

    // Get order items for VAT breakdown by rate
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(
        `
        tax_rate_percent,
        subtotal_chf,
        tax_amount_chf,
        total_chf,
        order:orders!order_id(status, salon_id, created_at)
      `
      )
      .gte('order.created_at', dateFrom)
      .lte('order.created_at', dateTo)
      .eq('order.salon_id', salonId)
      .in('order.status', ['paid', 'processing', 'shipped', 'delivered'])

    // Get appointments with VAT
    const { data: appointments } = await supabase
      .from('appointments')
      .select('total_price_chf, tax_total_chf')
      .eq('salon_id', salonId)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)
      .eq('status', 'completed')

    // Aggregate by VAT rate
    const vatRateMap = new Map<string, VatSummary>()

    // Process order items
    orderItems?.forEach((item) => {
      const rate = item.tax_rate_percent
      const current = vatRateMap.get(rate) || {
        vatRate: rate,
        netAmount: 0,
        vatAmount: 0,
        grossAmount: 0,
        transactionCount: 0,
      }

      current.netAmount += parseFloat(item.subtotal_chf || '0')
      current.vatAmount += parseFloat(item.tax_amount_chf || '0')
      current.grossAmount += parseFloat(item.total_chf || '0')
      current.transactionCount += 1

      vatRateMap.set(rate, current)
    })

    // Process appointments (assume 8.1% VAT for now - should be from service data)
    const appointmentVatRate = '8.1'
    appointments?.forEach((appt) => {
      const rate = appointmentVatRate
      const current = vatRateMap.get(rate) || {
        vatRate: rate,
        netAmount: 0,
        vatAmount: 0,
        grossAmount: 0,
        transactionCount: 0,
      }

      const grossAmount = parseFloat(appt.total_price_chf || '0')
      const vatAmount = parseFloat(appt.tax_total_chf || '0')
      const netAmount = grossAmount - vatAmount

      current.netAmount += netAmount
      current.vatAmount += vatAmount
      current.grossAmount += grossAmount
      current.transactionCount += 1

      vatRateMap.set(rate, current)
    })

    const byRate = Array.from(vatRateMap.values()).sort((a, b) =>
      parseFloat(b.vatRate) - parseFloat(a.vatRate)
    )

    const totalNet = byRate.reduce((sum, r) => sum + r.netAmount, 0)
    const totalVat = byRate.reduce((sum, r) => sum + r.vatAmount, 0)
    const totalGross = byRate.reduce((sum, r) => sum + r.grossAmount, 0)

    return {
      success: true,
      data: {
        periodStart: dateFrom,
        periodEnd: dateTo,
        totalNet,
        totalVat,
        totalGross,
        byRate,
      },
    }
  } catch (error) {
    console.error('Error fetching VAT report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des MwSt.-Reports',
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

/**
 * Generate CSV export for accounting
 * Returns CSV string
 */
export async function generateAccountingExport(
  salonId: string,
  dateFrom: string,
  dateTo: string
): Promise<ApiResponse<string>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()

    // Get all orders with items
    const { data: orders } = await supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items(*),
        customer:customers!customer_id(
          profile:profiles!profile_id(first_name, last_name, email)
        )
      `
      )
      .eq('salon_id', salonId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])
      .order('created_at', { ascending: true })

    // Get all appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select(
        `
        *,
        customer:customers!customer_id(
          profile:profiles!profile_id(first_name, last_name, email)
        ),
        staff:staff!staff_id(display_name)
      `
      )
      .eq('salon_id', salonId)
      .gte('starts_at', dateFrom)
      .lte('starts_at', dateTo)
      .eq('status', 'completed')
      .order('starts_at', { ascending: true })

    // Generate CSV
    const csvLines = [
      'Datum,Typ,Nummer,Kunde,Beschreibung,Netto CHF,MwSt. CHF,Brutto CHF,MwSt.-Satz',
    ]

    // Add orders
    orders?.forEach((order) => {
      const customerName =
        `${order.customer?.profile?.first_name || ''} ${order.customer?.profile?.last_name || ''}`.trim() ||
        order.customer_email
      const date = new Date(order.created_at).toLocaleDateString('de-CH')

      csvLines.push(
        `${date},Bestellung,${order.invoice_number},"${customerName}","${order.items.length} Produkte",${order.subtotal_chf},${order.tax_total_chf},${order.total_chf},gemischt`
      )
    })

    // Add appointments
    appointments?.forEach((appt) => {
      const customerName =
        `${appt.customer?.profile?.first_name || ''} ${appt.customer?.profile?.last_name || ''}`.trim() ||
        'Unbekannt'
      const date = new Date(appt.starts_at).toLocaleDateString('de-CH')
      const netAmount = parseFloat(appt.total_price_chf || '0') - parseFloat(appt.tax_total_chf || '0')

      csvLines.push(
        `${date},Termin,${appt.id},"${customerName}","${appt.staff?.display_name || 'Unbekannt'}",${netAmount.toFixed(2)},${appt.tax_total_chf},${appt.total_price_chf},8.1%`
      )
    })

    const csv = csvLines.join('\n')

    return {
      success: true,
      data: csv,
    }
  } catch (error) {
    console.error('Error generating accounting export:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Generieren des Exports',
    }
  }
}
