import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Package, Mail, Home } from 'lucide-react'
import { getOrderById } from '@/features/shop/actions'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface OrderSuccessPageProps {
  params: {
    orderId: string
  }
}

export const metadata: Metadata = { title: 'Bestellung erfolgreich' }

export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const order = await getOrderById(params.orderId)

  if (!order) {
    return notFound()
  }

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        {/* Success Message */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Vielen Dank für Ihre Bestellung!</h1>
          <p className="text-lg text-muted-foreground">
            Wir haben Ihre Bestellung erhalten und werden sie schnellstmöglich bearbeiten.
          </p>
        </div>

        {/* Order Number */}
        <Card className="mb-8 border-2 border-primary">
          <CardContent className="pt-6 text-center">
            <div className="mb-2 text-sm text-muted-foreground">
              Ihre Bestellnummer
            </div>
            <Badge variant="secondary" className="text-2xl font-mono px-6 py-2">
              {order.orderNumber}
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">
              Bitte notieren Sie sich diese Nummer für Ihre Unterlagen
            </p>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bestelldetails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                    {item.variantName && ` (${item.variantName})`}
                  </span>
                  <span className="font-medium">{formatCurrency(item.totalChf)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Zwischensumme</span>
                  <span>{formatCurrency(order.subtotalChf)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Versand ({order.shippingMethodName})</span>
                  <span>{formatCurrency(order.shippingCostChf)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>inkl. MwSt. ({order.taxRatePercent}%)</span>
                  <span>{formatCurrency(order.taxAmountChf)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Gesamt</span>
                <span>{formatCurrency(order.totalChf)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Lieferadresse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {order.customerFirstName} {order.customerLastName}<br />
              {order.shippingAddressStreet}<br />
              {order.shippingAddressPostcode} {order.shippingAddressCity}
            </p>
          </CardContent>
        </Card>

        {/* Email Confirmation */}
        <Card className="mb-8 bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold mb-1">Bestätigungs-E-Mail</div>
                <p className="text-sm text-muted-foreground">
                  Wir haben eine Bestätigung an <strong>{order.customerEmail}</strong> gesendet
                  mit allen Details zu Ihrer Bestellung.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Wichtige Informationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <strong>Versand:</strong>
                <p className="text-muted-foreground">
                  Ihre Bestellung wird in 1-2 Werktagen versendet. Sie erhalten eine
                  E-Mail mit der Sendungsverfolgungsnummer.
                </p>
              </div>
            </div>
            <div>
              <strong>Zahlungsart:</strong>
              <p className="text-muted-foreground">
                {order.paymentMethod === 'stripe_card' ? 'Kreditkarte' : 'Rechnung'}
              </p>
            </div>
            <div>
              <strong>Rückgaberecht:</strong>
              <p className="text-muted-foreground">
                Sie haben ein 30-tägiges Rückgaberecht ab Erhalt der Ware.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="default" size="lg" className="flex-1">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Zur Startseite
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/shop">
              Weiter einkaufen
            </Link>
          </Button>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Bei Fragen erreichen Sie uns unter{' '}
            <a href="tel:+41712345678" className="text-primary hover:underline">
              +41 71 123 45 67
            </a>
            {' '}oder{' '}
            <a href="mailto:info@schnittwerk.ch" className="text-primary hover:underline">
              info@schnittwerk.ch
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
