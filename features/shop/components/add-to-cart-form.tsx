'use client'

/**
 * Add to Cart Form
 * Handles variant selection, quantity, and adding to cart
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react'
import { type ProductWithDetails } from '../types'
import { addToCart } from '../actions'
import { formatCurrency } from '@/lib/utils'

interface AddToCartFormProps {
  product: ProductWithDetails
  salonId: string
  inStock: boolean
}

export function AddToCartForm({ product, salonId, inStock }: AddToCartFormProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.hasVariants && product.variants?.length > 0
      ? product.variants.find(v => v.isDefault)?.id || product.variants[0].id
      : null
  )
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId)

  // Get current price based on selection
  const getCurrentPrice = () => {
    if (selectedVariant) {
      return selectedVariant.salePriceChf || selectedVariant.priceChf
    }
    return product.salePriceChf || product.basePriceChf
  }

  // Check stock for selected variant
  const checkStock = () => {
    if (!product.trackInventory) return true

    if (selectedVariant) {
      return selectedVariant.stockQuantity > 0 || product.allowBackorder
    }

    return product.stockQuantity > 0 || product.allowBackorder
  }

  const canAddToCart = inStock && checkStock()

  const handleAddToCart = async () => {
    if (!canAddToCart) return

    setAdding(true)
    try {
      const result = await addToCart(salonId, {
        productId: product.id,
        variantId: selectedVariantId || undefined,
        quantity,
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
    <div className="space-y-6">
      {/* Variant Selection */}
      {product.hasVariants && product.variants && product.variants.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Variante wählen:</label>
          <div className="flex flex-wrap gap-2">
            {product.variants
              .filter(v => v.isActive)
              .map(variant => {
                const isSelected = variant.id === selectedVariantId
                const variantInStock = !product.trackInventory || variant.stockQuantity > 0

                return (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={!variantInStock}
                    className={`
                      rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all
                      ${isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:border-primary/50'
                      }
                      ${!variantInStock && 'cursor-not-allowed opacity-50'}
                    `}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span>{variant.name}</span>
                      <span className="text-xs opacity-80">
                        {formatCurrency(variant.salePriceChf || variant.priceChf)}
                      </span>
                      {!variantInStock && (
                        <Badge variant="secondary" className="text-xs">
                          Ausverkauft
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Menge:</label>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-10 w-10 rounded-r-none"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-16 items-center justify-center border-x text-center font-semibold">
              {quantity}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuantity(quantity + 1)}
              disabled={
                product.trackInventory &&
                ((selectedVariant && quantity >= selectedVariant.stockQuantity) ||
                  (!selectedVariant && quantity >= product.stockQuantity))
              }
              className="h-10 w-10 rounded-l-none"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Stock Info */}
          {product.trackInventory && (
            <div className="text-sm text-muted-foreground">
              {selectedVariant
                ? `${selectedVariant.stockQuantity} verfügbar`
                : `${product.stockQuantity} verfügbar`}
            </div>
          )}
        </div>
      </div>

      {/* Total Price */}
      <div className="flex items-baseline justify-between border-t pt-4">
        <span className="text-lg font-medium">Gesamt:</span>
        <span className="text-2xl font-bold">
          {formatCurrency(getCurrentPrice() * quantity)}
        </span>
      </div>

      {/* Add to Cart Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={adding || !canAddToCart}
        variant={added ? 'outline' : 'default'}
      >
        {added ? (
          <>
            <Check className="mr-2 h-5 w-5" />
            In den Warenkorb gelegt
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-5 w-5" />
            {canAddToCart ? 'In den Warenkorb' : 'Ausverkauft'}
          </>
        )}
      </Button>
    </div>
  )
}
