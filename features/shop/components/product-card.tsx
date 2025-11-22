'use client'

/**
 * Product Card Component
 * Displays a product with image, name, price, and add to cart button
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Check, Package } from 'lucide-react'
import { type Product } from '../types'
import { addToCart } from '../actions'
import { formatCurrency } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  salonId: string
}

export function ProductCard({ product, salonId }: ProductCardProps) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  // Determine current price (sale > base)
  const currentPrice = product.salePriceChf || product.basePriceChf
  const hasDiscount = product.salePriceChf && product.salePriceChf < product.basePriceChf

  // Check stock availability
  const inStock = !product.trackInventory || product.stockQuantity > 0 || product.allowBackorder
  const lowStock = product.trackInventory && product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0

  // Primary image
  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0]

  const handleAddToCart = async () => {
    if (!inStock) return

    setAdding(true)
    try {
      const result = await addToCart(salonId, {
        productId: product.id,
        quantity: 1,
      })

      if (result.success) {
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
      }
    } catch (error) {
      console.error('Add to cart error:', error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Image */}
      <Link href={`/shop/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage.imageUrl}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-2">
            {product.isFeatured && (
              <Badge variant="default" className="bg-primary">
                Empfohlen
              </Badge>
            )}
            {hasDiscount && (
              <Badge variant="destructive">
                Sale
              </Badge>
            )}
            {lowStock && (
              <Badge variant="secondary">
                Nur noch {product.stockQuantity}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <CardHeader className="flex-1">
        <Link href={`/shop/${product.slug}`} className="hover:underline">
          <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
        </Link>
        {product.brand && (
          <p className="text-sm text-muted-foreground">{product.brand}</p>
        )}
        {product.shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {product.shortDescription}
          </p>
        )}
      </CardHeader>

      {/* Footer */}
      <CardFooter className="flex flex-col gap-3">
        {/* Price */}
        <div className="flex w-full items-baseline gap-2">
          <span className="text-2xl font-bold">
            {formatCurrency(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.basePriceChf)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={adding || !inStock}
          variant={added ? 'outline' : 'default'}
        >
          {added ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Hinzugefügt
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {inStock ? 'In den Warenkorb' : 'Ausverkauft'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
