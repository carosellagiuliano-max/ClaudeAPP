'use client'

/**
 * Products Table Component
 * Searchable table with stock levels and inline actions
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Eye, Edit, Star, StarOff, AlertTriangle } from 'lucide-react'
import type { ProductWithCategory } from '../types/products'
import { PRODUCT_UNIT_LABELS } from '../types/products'
import { updateProduct } from '../actions/products'

interface ProductsTableProps {
  products: ProductWithCategory[]
  salonId: string
}

export function ProductsTable({ products, salonId }: ProductsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    const name = product.name.toLowerCase()
    const sku = product.sku?.toLowerCase() || ''
    const barcode = product.barcode?.toLowerCase() || ''
    const category = product.category?.name.toLowerCase() || ''
    const brand = product.brand?.name.toLowerCase() || ''

    return (
      name.includes(searchLower) ||
      sku.includes(searchLower) ||
      barcode.includes(searchLower) ||
      category.includes(searchLower) ||
      brand.includes(searchLower)
    )
  })

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(price))
  }

  const toggleFeatured = async (productId: string, currentStatus: boolean) => {
    if (isUpdating) return

    setIsUpdating(productId)
    const result = await updateProduct(salonId, productId, {
      isFeatured: !currentStatus,
    })

    if (result.success) {
      router.refresh()
    }

    setIsUpdating(null)
  }

  const getStockStatus = (product: ProductWithCategory) => {
    if (product.stockQuantity === 0) {
      return { label: 'Ausverkauft', color: 'destructive' as const }
    }

    const threshold = product.lowStockThreshold || 10
    if (product.stockQuantity < threshold) {
      return { label: 'Niedrig', color: 'secondary' as const }
    }

    return { label: 'Auf Lager', color: 'default' as const }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Noch keine Produkte. Erstellen Sie Ihr erstes Produkt.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Name, SKU, Barcode, Kategorie oder Marke..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Marke</TableHead>
              <TableHead className="text-right">Preis</TableHead>
              <TableHead className="text-right">Bestand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Keine Produkte gefunden
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product)
                const isLowStock =
                  product.stockQuantity < (product.lowStockThreshold || 10) &&
                  product.stockQuantity > 0

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.isFeatured && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{product.sku || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{product.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.brand ? (
                        <Badge variant="outline">{product.brand.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(product.retailPriceChf)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isLowStock && (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span className={isLowStock ? 'text-yellow-600' : ''}>
                          {product.stockQuantity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {PRODUCT_UNIT_LABELS[product.unit]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/produkte/${product.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/produkte/${product.id}/bearbeiten`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFeatured(product.id, product.isFeatured)}
                          disabled={isUpdating === product.id}
                        >
                          {product.isFeatured ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Count */}
      {searchTerm && (
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} von {products.length} Produkten
        </p>
      )}
    </div>
  )
}
