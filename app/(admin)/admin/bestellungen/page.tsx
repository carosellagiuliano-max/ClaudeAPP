import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getOrders, getOrderStatistics } from '@/features/admin/actions/orders'
import { OrdersTable } from '@/features/admin/components/orders-table'

export default async function OrdersPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const ordersResult = await getOrders(salon.id)
  const orders = ordersResult.success ? ordersResult.data! : []

  const statsResult = await getOrderStatistics(salon.id)
  const stats = statsResult.success
    ? statsResult.data!
    : {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        refundedOrders: 0,
      }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bestellungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Bestellungen und Rechnungen
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Bestellungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Umsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Ø {formatPrice(stats.averageOrderValue)} pro Bestellung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Benötigen Bearbeitung</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abgeschlossen</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0
                ? `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}% erfolgreich`
                : '0% erfolgreich'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Bestellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersTable orders={orders} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
