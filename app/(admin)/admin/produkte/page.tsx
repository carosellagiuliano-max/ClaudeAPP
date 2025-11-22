import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Package,
  PackageCheck,
  AlertTriangle,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getProducts, getProductStats } from '@/features/admin/actions/products'
import { ProductsTable } from '@/features/admin/components/products-table'
import Link from 'next/link'

export default async function ProductsPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const productsResult = await getProducts(salon.id, { isActive: true })
  const products = productsResult.success ? productsResult.data! : []

  const statsResult = await getProductStats(salon.id)
  const stats = statsResult.success
    ? statsResult.data!
    : {
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalInventoryValue: 0,
      }

  // Format currency
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
          <h1 className="text-3xl font-bold">Produkte</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Produkte und Lagerbestände
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/produkte/kategorien">
            <Button variant="outline">Kategorien</Button>
          </Link>
          <Link href="/admin/produkte/marken">
            <Button variant="outline">Marken</Button>
          </Link>
          <Link href="/admin/produkte/neu">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Produkt
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Produkte im System</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProducts > 0
                ? `${((stats.activeProducts / stats.totalProducts) * 100).toFixed(1)}% aktiv`
                : '0% aktiv'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Niedriger Bestand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProducts > 0
                ? `${((stats.lowStockProducts / stats.totalProducts) * 100).toFixed(1)}% niedrig`
                : '0% niedrig'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ausverkauft</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.outOfStockProducts}
            </div>
            <p className="text-xs text-muted-foreground">Nachbestellung erforderlich</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lagerwert</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalInventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Gesamter Bestandswert</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Produkte</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsTable products={products} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
