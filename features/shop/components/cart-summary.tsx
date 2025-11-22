'use client'

/**
 * Cart Summary
 * Shows cart totals and checkout button
 */

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ShoppingBag } from 'lucide-react'
import { type CartWithItems } from '../types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface CartSummaryProps {
  cart: CartWithItems
  salonId: string
}

export function CartSummary({ cart }: CartSummaryProps) {
  const subtotal = cart.totalPrice
  const shipping = subtotal >= 50 ? 0 : 9.90 // Free shipping over CHF 50
  const tax = subtotal * 0.081 // 8.1% Swiss VAT
  const total = subtotal + shipping + tax

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Zusammenfassung</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Item Count */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {cart.totalItems} {cart.totalItems === 1 ? 'Artikel' : 'Artikel'}
          </span>
        </div>

        <Separator />

        {/* Subtotal */}
        <div className="flex justify-between">
          <span>Zwischensumme</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {/* Shipping */}
        <div className="flex justify-between">
          <span>Versand</span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600">Kostenlos</span>
            ) : (
              formatCurrency(shipping)
            )}
          </span>
        </div>

        {subtotal < 50 && shipping > 0 && (
          <p className="text-xs text-muted-foreground">
            Noch {formatCurrency(50 - subtotal)} bis zum kostenlosen Versand
          </p>
        )}

        {/* Tax */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">inkl. MwSt. (8.1%)</span>
          <span className="text-muted-foreground">{formatCurrency(tax)}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between text-lg font-bold">
          <span>Gesamt</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild size="lg" className="w-full">
          <Link href="/kasse">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Zur Kasse
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
