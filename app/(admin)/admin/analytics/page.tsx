'use client'

/**
 * Analytics & Finance Dashboard
 * Revenue reports, VAT summaries, and performance metrics
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Users,
  Package,
  FileText,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  getRevenueMetrics,
  getRevenueByPeriod,
  getStaffPerformance,
  getServiceStatistics,
  getProductSales,
  getVatReport,
  generateAccountingExport,
} from '@/features/admin/actions/analytics'
import type {
  RevenueMetrics,
  RevenueByPeriod,
  StaffPerformance,
  ServiceStatistics,
  ProductSales,
  VatReport,
} from '@/features/admin/types/analytics'

type PeriodPreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

export default function AnalyticsPage() {
  const [salonId, setSalonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date filters
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last30days')
  const [dateFrom, setDateFrom] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  )
  const [dateTo, setDateTo] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  // Data
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueByPeriod[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([])
  const [serviceStats, setServiceStats] = useState<ServiceStatistics[]>([])
  const [productSales, setProductSales] = useState<ProductSales[]>([])
  const [vatReport, setVatReport] = useState<VatReport | null>(null)

  // Fetch salon ID on mount
  useEffect(() => {
    const fetchSalonId = async () => {
      try {
        const response = await fetch('/api/salon/default')
        if (!response.ok) throw new Error('Failed to fetch salon')
        const data = await response.json()
        setSalonId(data.id)
      } catch (err) {
        setError('Salon konnte nicht geladen werden')
        console.error(err)
      }
    }
    fetchSalonId()
  }, [])

  // Update dates when preset changes
  useEffect(() => {
    const now = new Date()
    switch (periodPreset) {
      case 'today':
        setDateFrom(format(now, 'yyyy-MM-dd'))
        setDateTo(format(now, 'yyyy-MM-dd'))
        setGroupBy('day')
        break
      case 'last7days':
        setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd'))
        setDateTo(format(now, 'yyyy-MM-dd'))
        setGroupBy('day')
        break
      case 'last30days':
        setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd'))
        setDateTo(format(now, 'yyyy-MM-dd'))
        setGroupBy('day')
        break
      case 'thisMonth':
        setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
        setGroupBy('day')
        break
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))
        setGroupBy('day')
        break
    }
  }, [periodPreset])

  // Fetch all analytics data
  useEffect(() => {
    if (!salonId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [metricsRes, revenueRes, staffRes, serviceRes, productRes, vatRes] =
          await Promise.all([
            getRevenueMetrics(salonId, dateFrom, dateTo),
            getRevenueByPeriod(salonId, dateFrom, dateTo, groupBy),
            getStaffPerformance(salonId, dateFrom, dateTo),
            getServiceStatistics(salonId, dateFrom, dateTo),
            getProductSales(salonId, dateFrom, dateTo),
            getVatReport(salonId, dateFrom, dateTo),
          ])

        if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data)
        if (revenueRes.success && revenueRes.data) setRevenueData(revenueRes.data)
        if (staffRes.success && staffRes.data) setStaffPerformance(staffRes.data)
        if (serviceRes.success && serviceRes.data) setServiceStats(serviceRes.data)
        if (productRes.success && productRes.data) setProductSales(productRes.data)
        if (vatRes.success && vatRes.data) setVatReport(vatRes.data)

        if (!metricsRes.success) {
          setError(metricsRes.error || 'Fehler beim Laden der Daten')
        }
      } catch (err) {
        setError('Fehler beim Laden der Analytics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [salonId, dateFrom, dateTo, groupBy])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  const handleExportCSV = async () => {
    if (!salonId) return

    const result = await generateAccountingExport(salonId, dateFrom, dateTo)
    if (result.success && result.data) {
      // Download CSV
      const blob = new Blob([result.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `buchhaltung_${dateFrom}_${dateTo}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Fehler</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Finanzen</h1>
          <p className="text-muted-foreground">Umsatzberichte, MwSt. und Leistungskennzahlen</p>
        </div>
        <Button onClick={handleExportCSV} disabled={loading || !salonId}>
          <Download className="mr-2 h-4 w-4" />
          CSV Exportieren
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Heute</SelectItem>
                <SelectItem value="last7days">Letzte 7 Tage</SelectItem>
                <SelectItem value="last30days">Letzte 30 Tage</SelectItem>
                <SelectItem value="thisMonth">Dieser Monat</SelectItem>
                <SelectItem value="lastMonth">Letzter Monat</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>

            {periodPreset === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Von:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Bis:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Tag</SelectItem>
                <SelectItem value="week">Woche</SelectItem>
                <SelectItem value="month">Monat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Daten werden geladen...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Revenue Metrics */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(metrics?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ø {formatPrice(metrics?.averageOrderValue || 0)} pro Bestellung
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Termine</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(metrics?.appointmentsRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.totalAppointments || 0} Termine
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Produkte</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(metrics?.productsRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.totalOrders || 0} Bestellungen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">MwSt. Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(vatReport?.totalVat || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Brutto: {formatPrice(vatReport?.totalGross || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Umsatzverlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Keine Umsatzdaten für diesen Zeitraum
                </div>
              ) : (
                <div className="space-y-4">
                  {revenueData.map((period) => (
                    <div key={period.period} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{period.period}</span>
                        <span className="text-muted-foreground">
                          {formatPrice(period.totalRevenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(
                              (period.totalRevenue / Math.max(...revenueData.map((p) => p.totalRevenue))) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Termine: {formatPrice(period.appointmentsRevenue)}</span>
                        <span>Produkte: {formatPrice(period.productsRevenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* VAT Summary */}
          <Card>
            <CardHeader>
              <CardTitle>MwSt. Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent>
              {vatReport && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Netto</p>
                      <p className="text-2xl font-bold">{formatPrice(vatReport.totalNet)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MwSt.</p>
                      <p className="text-2xl font-bold">{formatPrice(vatReport.totalVat)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Brutto</p>
                      <p className="text-2xl font-bold">{formatPrice(vatReport.totalGross)}</p>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>MwSt. Satz</TableHead>
                          <TableHead className="text-right">Netto</TableHead>
                          <TableHead className="text-right">MwSt.</TableHead>
                          <TableHead className="text-right">Brutto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vatReport.byRate.map((rate) => (
                          <TableRow key={rate.taxRate}>
                            <TableCell>{rate.taxRate}%</TableCell>
                            <TableCell className="text-right">{formatPrice(rate.netAmount)}</TableCell>
                            <TableCell className="text-right">{formatPrice(rate.vatAmount)}</TableCell>
                            <TableCell className="text-right">
                              {formatPrice(rate.grossAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mitarbeiter-Leistung
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staffPerformance.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Keine Mitarbeiterdaten verfügbar
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead className="text-right">Termine</TableHead>
                        <TableHead className="text-right">Abgeschlossen</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ø Umsatz</TableHead>
                        <TableHead>Top Service</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffPerformance.map((staff) => (
                        <TableRow key={staff.staffId}>
                          <TableCell className="font-medium">{staff.staffName}</TableCell>
                          <TableCell className="text-right">{staff.totalAppointments}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{staff.completedAppointments}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(staff.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatPrice(staff.averageRevenue)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {staff.topService || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services & Products Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Services */}
            <Card>
              <CardHeader>
                <CardTitle>Top Services</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceStats.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Keine Service-Daten verfügbar
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceStats.slice(0, 5).map((service, index) => (
                      <div key={service.serviceId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 w-6 justify-center p-0">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{service.serviceName}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatPrice(service.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{service.totalBookings} Buchungen</span>
                          <span>Ø {formatPrice(service.averageRevenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Produkte</CardTitle>
              </CardHeader>
              <CardContent>
                {productSales.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Keine Produktverkäufe
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productSales.slice(0, 5).map((product, index) => (
                      <div key={product.productId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 w-6 justify-center p-0">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{product.productName}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatPrice(product.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{product.totalQuantity} verkauft</span>
                          <span>Ø {formatPrice(product.averagePrice)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
