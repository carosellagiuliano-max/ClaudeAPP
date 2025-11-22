/**
 * Analytics & Finance Types
 * Type definitions for reports and statistics
 */

// ============================================================
// REVENUE METRICS
// ============================================================

export interface RevenueMetrics {
  totalRevenue: number
  appointmentsRevenue: number
  productsRevenue: number
  averageOrderValue: number
  totalOrders: number
  totalAppointments: number
  periodStart: string
  periodEnd: string
}

export interface RevenueByPeriod {
  period: string // e.g., "2025-01-15" or "2025-W03"
  revenue: number
  orders: number
  appointments: number
}

// ============================================================
// STAFF PERFORMANCE
// ============================================================

export interface StaffPerformance {
  staffId: string
  staffName: string
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  totalRevenue: number
  averageRevenue: number
  topService: string | null
}

// ============================================================
// SERVICE STATISTICS
// ============================================================

export interface ServiceStatistics {
  serviceId: string
  serviceName: string
  categoryName: string | null
  totalBookings: number
  completedBookings: number
  totalRevenue: number
  averagePrice: number
}

// ============================================================
// PRODUCT SALES
// ============================================================

export interface ProductSales {
  productId: string
  productName: string
  categoryName: string | null
  totalQuantity: number
  totalRevenue: number
  totalOrders: number
  averageOrderQuantity: number
}

// ============================================================
// VAT SUMMARY
// ============================================================

export interface VatSummary {
  vatRate: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  transactionCount: number
}

export interface VatReport {
  periodStart: string
  periodEnd: string
  totalNet: number
  totalVat: number
  totalGross: number
  byRate: VatSummary[]
}

// ============================================================
// FILTERS
// ============================================================

export interface AnalyticsFilters {
  dateFrom: string
  dateTo: string
  groupBy?: 'day' | 'week' | 'month'
  staffId?: string
  serviceId?: string
  productId?: string
}

// ============================================================
// EXPORT TYPES
// ============================================================

export type ExportFormat = 'csv' | 'excel' | 'pdf'

export type ExportType =
  | 'revenue'
  | 'appointments'
  | 'orders'
  | 'vat'
  | 'staff_performance'
  | 'product_sales'

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
