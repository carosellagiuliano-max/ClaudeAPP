import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Star, AlertTriangle } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getProductById } from '@/features/admin/actions/products'
import { InventoryTransactionManager } from '@/features/admin/components/inventory-transaction-manager'
import { PRODUCT_UNIT_LABELS } from '@/features/admin/types/products'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'

interface ProductDetailPageProps {
  params: {
    id: string
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const salon = await getDefaultSalon()
  const user = await getCurrentUser()

  if (!salon || !user) {
    redirect('/admin')
  }

  const productResult = await getProductById(salon.id, params.id)

  if (!productResult.success || !productResult.data) {
    redirect('/admin/produkte')
  }

  const product = productResult.data

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(price))
  }

  const getStockStatus = () => {
    if (product.stockQuantity === 0) {
      return { label: 'Ausverkauft', color: 'destructive' as const, showAlert: true }
    }

    const threshold = product.lowStockThreshold || 10
    if (product.stockQuantity < threshold) {
      return { label: 'Niedrig', color: 'secondary' as const, showAlert: true }
    }

    return { label: 'Auf Lager', color: 'default' as const, showAlert: false }
  }

  const stockStatus = getStockStatus()
  const margin = product.costPriceChf
    ? ((parseFloat(product.retailPriceChf) - parseFloat(product.costPriceChf)) /
        parseFloat(product.retailPriceChf)) *
      100
    : null

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/produkte">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {product.isFeatured && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
              {!product.isActive && <Badge variant="secondary">Inaktiv</Badge>}
            </div>
            <p className="text-muted-foreground">{product.description || 'Keine Beschreibung'}</p>
          </div>
        </div>
        <Link href={`/admin/produkte/${product.id}/bearbeiten`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </Link>
      </div>

      {/* Product Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Produktinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p className="font-mono">{product.sku || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                <p className="font-mono">{product.barcode || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kategorie</p>
                <p>{product.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marke</p>
                <p>{product.brand?.name || '-'}</p>
              </div>
            </div>

            {product.tags && product.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Preise & Marge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verkaufspreis</p>
                <p className="text-2xl font-bold">{formatPrice(product.retailPriceChf)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Einkaufspreis</p>
                <p className="text-2xl font-bold">
                  {product.costPriceChf ? formatPrice(product.costPriceChf) : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MwSt.</p>
                <p>{product.taxRate}%</p>
              </div>
              {margin !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marge</p>
                  <p className="font-medium text-green-600">{margin.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Lagerbestand
            {stockStatus.showAlert && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktueller Bestand</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{product.stockQuantity}</p>
                <p className="text-muted-foreground">{PRODUCT_UNIT_LABELS[product.unit]}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={stockStatus.color} className="mt-2">
                {stockStatus.label}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Mindestbestand</p>
              <p className="text-2xl font-bold">{product.lowStockThreshold || 10}</p>
            </div>

            {product.costPriceChf && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lagerwert</p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    (parseFloat(product.costPriceChf) * product.stockQuantity).toString()
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Transactions */}
      <InventoryTransactionManager
        salonId={salon.id}
        productId={product.id}
        productName={product.name}
        currentUserId={user.id}
      />
    </div>
  )
}
