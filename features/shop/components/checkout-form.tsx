'use client'

/**
 * Checkout Form
 * Complete checkout with shipping/billing address and payment
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Loader2, CreditCard } from 'lucide-react'
import { type CartWithItems, type ShippingMethod, checkoutSchema } from '../types'
import { createOrder } from '../actions'
import { formatCurrency } from '@/lib/utils'

interface CheckoutFormProps {
  cart: CartWithItems
  shippingMethods: ShippingMethod[]
  salonId: string
}

export function CheckoutForm({ cart, shippingMethods, salonId }: CheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    shippingStreet: '',
    shippingCity: '',
    shippingPostcode: '',
    shippingCountry: 'CH',
    billingSameAsShipping: true,
    billingStreet: '',
    billingCity: '',
    billingPostcode: '',
    billingCountry: 'CH',
    shippingMethodId: shippingMethods[0]?.id || '',
    customerNotes: '',
    acceptedTerms: false,
    acceptedPrivacy: false,
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const checkoutData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        shippingAddress: {
          street: formData.shippingStreet,
          city: formData.shippingCity,
          postcode: formData.shippingPostcode,
          country: formData.shippingCountry,
        },
        billingSameAsShipping: formData.billingSameAsShipping,
        billingAddress: formData.billingSameAsShipping
          ? undefined
          : {
              street: formData.billingStreet,
              city: formData.billingCity,
              postcode: formData.billingPostcode,
              country: formData.billingCountry,
            },
        shippingMethodId: formData.shippingMethodId,
        customerNotes: formData.customerNotes,
        acceptedTerms: formData.acceptedTerms,
        acceptedPrivacy: formData.acceptedPrivacy,
      }

      const validated = checkoutSchema.parse(checkoutData)
      const result = await createOrder(salonId, validated)

      if (result.success && result.data) {
        router.push(`/bestellung/${result.data.orderId}`)
      } else {
        setError(result.error || 'Fehler beim Erstellen der Bestellung')
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Absenden')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = cart.totalPrice
  const selectedShipping = shippingMethods.find(m => m.id === formData.shippingMethodId)
  const shippingCost = selectedShipping?.priceChf || 0
  const tax = (subtotal + shippingCost) * 0.081
  const total = subtotal + shippingCost + tax

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
      {/* Form Fields */}
      <div className="space-y-6 lg:col-span-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Kontaktinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>Lieferadresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shippingStreet">Straße und Hausnummer *</Label>
              <Input
                id="shippingStreet"
                value={formData.shippingStreet}
                onChange={e => handleChange('shippingStreet', e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shippingPostcode">PLZ *</Label>
                <Input
                  id="shippingPostcode"
                  value={formData.shippingPostcode}
                  onChange={e => handleChange('shippingPostcode', e.target.value)}
                  maxLength={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCity">Ort *</Label>
                <Input
                  id="shippingCity"
                  value={formData.shippingCity}
                  onChange={e => handleChange('shippingCity', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle>Rechnungsadresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="billingSame"
                checked={formData.billingSameAsShipping}
                onCheckedChange={checked => handleChange('billingSameAsShipping', checked)}
              />
              <Label htmlFor="billingSame" className="cursor-pointer">
                Gleich wie Lieferadresse
              </Label>
            </div>

            {!formData.billingSameAsShipping && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billingStreet">Straße und Hausnummer *</Label>
                  <Input
                    id="billingStreet"
                    value={formData.billingStreet}
                    onChange={e => handleChange('billingStreet', e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingPostcode">PLZ *</Label>
                    <Input
                      id="billingPostcode"
                      value={formData.billingPostcode}
                      onChange={e => handleChange('billingPostcode', e.target.value)}
                      maxLength={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">Ort *</Label>
                    <Input
                      id="billingCity"
                      value={formData.billingCity}
                      onChange={e => handleChange('billingCity', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Method */}
        <Card>
          <CardHeader>
            <CardTitle>Versandart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shippingMethods.map(method => (
              <label
                key={method.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${
                  formData.shippingMethodId === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    value={method.id}
                    checked={formData.shippingMethodId === method.id}
                    onChange={e => handleChange('shippingMethodId', e.target.value)}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium">{method.name}</div>
                    {method.description && (
                      <div className="text-sm text-muted-foreground">{method.description}</div>
                    )}
                  </div>
                </div>
                <div className="font-semibold">{formatCurrency(method.priceChf)}</div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Anmerkungen (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.customerNotes}
              onChange={e => handleChange('customerNotes', e.target.value)}
              placeholder="Besondere Wünsche oder Hinweise zur Lieferung..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Bestellung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-2">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.product?.name}
                    {item.variant && ` (${item.variant.name})`}
                  </span>
                  <span className="font-medium">{formatCurrency(item.subtotalChf)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Costs */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Zwischensumme</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Versand</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>inkl. MwSt. (8.1%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>Gesamt</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Separator />

            {/* Terms */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={checked => handleChange('acceptedTerms', checked)}
                  required
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                  Ich akzeptiere die{' '}
                  <a href="/agb" target="_blank" className="text-primary hover:underline">
                    AGB
                  </a>{' '}
                  *
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={formData.acceptedPrivacy}
                  onCheckedChange={checked => handleChange('acceptedPrivacy', checked)}
                  required
                />
                <Label htmlFor="privacy" className="text-sm cursor-pointer leading-relaxed">
                  Ich habe die{' '}
                  <a href="/datenschutz" target="_blank" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </a>{' '}
                  zur Kenntnis genommen *
                </Label>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Zahlungspflichtig bestellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
