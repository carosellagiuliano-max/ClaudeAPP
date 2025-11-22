'use client'

/**
 * Cart Item List
 * Displays cart items with quantity controls and remove button
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import { type CartWithItems } from '../types'
import { updateCartItem, removeFromCart } from '../actions'
import { formatCurrency } from '@/lib/utils'

interface CartItemListProps {
  cart: CartWithItems
  salonId: string
}

export function CartItemList({ cart, salonId }: CartItemListProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdating(itemId)
    try {
      await updateCartItem(salonId, {
        cartItemId: itemId,
        quantity: newQuantity,
      })
    } catch (error) {
      console.error('Update quantity error:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    setUpdating(itemId)
    try {
      await removeFromCart(salonId, itemId)
    } catch (error) {
      console.error('Remove item error:', error)
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      {cart.items.map(item => {
        const primaryImage = item.product?.images?.find(img => img.isPrimary) || item.product?.images?.[0]
        const isUpdating = updating === item.id

        return (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Product Image */}
                <Link
                  href={`/shop/${item.product?.slug}`}
                  className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  {primaryImage ? (
                    <Image
                      src={primaryImage.imageUrl}
                      alt={item.product?.name || 'Product'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </Link>

                {/* Product Info */}
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/shop/${item.product?.slug}`}
                        className="font-semibold hover:underline"
                      >
                        {item.product?.name}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.name}
                        </p>
                      )}
                      {item.product?.brand && (
                        <p className="text-sm text-muted-foreground">
                          {item.product.brand}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(item.subtotalChf)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPriceChf)} / Stk.
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <div className="flex h-8 w-12 items-center justify-center text-sm font-medium">
                          {item.quantity}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      disabled={isUpdating}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Entfernen
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
