import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCart } from '@/features/shop/actions'
import { CartItemList } from '@/features/shop/components/cart-item-list'
import { CartSummary } from '@/features/shop/components/cart-summary'
import { getDefaultSalon } from '@/lib/db/queries'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Warenkorb' }

export default async function CartPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    return (
      <div className="container py-16">
        <p className="text-destructive">Salon nicht gefunden</p>
      </div>
    )
  }

  const cart = await getCart(salon.id)

  return (
    <div className="container py-16">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">Warenkorb</Badge>
        <h1 className="mb-4 text-4xl font-bold">Ihr Warenkorb</h1>
      </div>

      {!cart || cart.items.length === 0 ? (
        /* Empty Cart */
        <div className="rounded-lg border border-dashed p-16 text-center">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
          <h2 className="mb-2 text-2xl font-semibold">Ihr Warenkorb ist leer</h2>
          <p className="mb-6 text-muted-foreground">
            Entdecken Sie unsere Produkte und fügen Sie Artikel hinzu.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">
              Zum Shop
            </Link>
          </Button>
        </div>
      ) : (
        /* Cart with Items */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Button variant="ghost" asChild className="mb-6">
              <Link href="/shop">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Weiter einkaufen
              </Link>
            </Button>

            <CartItemList cart={cart} salonId={salon.id} />
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary cart={cart} salonId={salon.id} />
          </div>
        </div>
      )}
    </div>
  )
}
