import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { getCart, getShippingMethods } from '@/features/shop/actions'
import { CheckoutForm } from '@/features/shop/components/checkout-form'
import { getDefaultSalon } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Kasse' }

export default async function CheckoutPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/shop')
  }

  const cart = await getCart(salon.id)

  // Redirect if cart is empty
  if (!cart || cart.items.length === 0) {
    redirect('/warenkorb')
  }

  const shippingMethods = await getShippingMethods(salon.id)

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">Kasse</Badge>
          <h1 className="mb-4 text-4xl font-bold">Bestellung abschließen</h1>
          <p className="text-muted-foreground">
            Bitte füllen Sie das Formular aus, um Ihre Bestellung abzuschließen.
          </p>
        </div>

        <CheckoutForm
          cart={cart}
          shippingMethods={shippingMethods}
          salonId={salon.id}
        />
      </div>
    </div>
  )
}
