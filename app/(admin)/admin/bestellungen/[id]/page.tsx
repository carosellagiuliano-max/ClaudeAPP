'use client'

/**
 * Order Detail Page
 * View order details and process refunds
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Edit, DollarSign, Package, Calendar, User, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import type { OrderWithDetails } from '@/features/admin/types/orders'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/features/admin/types/orders'
import {
  getOrderById,
  updateOrderStatus,
  updateOrderNotes,
  processRefund,
} from '@/features/admin/actions/orders'
import { getDefaultSalon } from '@/lib/db/queries'

interface OrderDetailPageProps {
  params: {
    id: string
  }
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [salonId, setSalonId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [internalNotes, setInternalNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  // Refund state
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundShipping, setRefundShipping] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      const salon = await getDefaultSalon()
      if (!salon) {
        router.push('/admin')
        return
      }

      setSalonId(salon.id)

      const result = await getOrderById(salon.id, params.id)
      if (result.success && result.data) {
        setOrder(result.data)
        setInternalNotes(result.data.internalNotes || '')
      } else {
        setError(result.error || 'Bestellung nicht gefunden')
      }
      setLoading(false)
    }

    loadOrder()
  }, [params.id, router])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || !salonId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const result = await updateOrderStatus(salonId, order.id, newStatus)

    if (result.success && result.data) {
      setOrder((prev) => (prev ? { ...prev, ...result.data } : null))
      setSuccess('Status aktualisiert')
    } else {
      setError(result.error || 'Fehler beim Aktualisieren')
    }

    setSaving(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSaveNotes = async () => {
    if (!order || !salonId) return

    setSaving(true)
    setError(null)

    const result = await updateOrderNotes(salonId, order.id, internalNotes)

    if (result.success) {
      setSuccess('Notizen gespeichert')
      setEditingNotes(false)
    } else {
      setError(result.error || 'Fehler beim Speichern')
    }

    setSaving(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleProcessRefund = async () => {
    if (!order || !salonId || !refundAmount || !refundReason) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const result = await processRefund(salonId, {
      orderId: order.id,
      amountChf: refundAmount,
      reason: refundReason,
      refundShipping,
    })

    if (result.success) {
      setSuccess('Rückerstattung erfolgreich')
      setRefundDialogOpen(false)
      setRefundAmount('')
      setRefundReason('')
      setRefundShipping(false)

      // Reload order
      const reloadResult = await getOrderById(salonId, order.id)
      if (reloadResult.success && reloadResult.data) {
        setOrder(reloadResult.data)
      }
    } else {
      setError(result.error || 'Fehler bei der Rückerstattung')
    }

    setSaving(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(price))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  const getCustomerName = () => {
    if (!order) return ''
    const { firstName, lastName } = order.customer
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim()
    }
    return order.customerEmail
  }

  const formatAddress = (address: any) => {
    if (!address) return null
    return (
      <div className="text-sm">
        <div>{address.firstName} {address.lastName}</div>
        {address.company && <div>{address.company}</div>}
        <div>{address.street}</div>
        {address.street2 && <div>{address.street2}</div>}
        <div>{address.postalCode} {address.city}</div>
        {address.state && <div>{address.state}</div>}
        <div>{address.country}</div>
        {address.phone && <div>Tel: {address.phone}</div>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center p-8">
        <p className="text-muted-foreground">Lädt Bestellung...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="space-y-4 p-8">
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        <Link href="/admin/bestellungen">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/bestellungen">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Bestellung {order.orderNumber}</h1>
            <p className="text-muted-foreground">Rechnung: {order.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={ORDER_STATUS_COLORS[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">{success}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bestellpositionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produkt</TableHead>
                      <TableHead className="text-right">Menge</TableHead>
                      <TableHead className="text-right">Einzelpreis</TableHead>
                      <TableHead className="text-right">MwSt.</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {item.productSku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {item.productSku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.unitPriceChf)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.taxRatePercent}% ({formatPrice(item.taxAmountChf)})
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.totalChf)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zwischensumme:</span>
                  <span>{formatPrice(order.subtotalChf)}</span>
                </div>
                {parseFloat(order.discountTotalChf) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Rabatt:</span>
                    <span>-{formatPrice(order.discountTotalChf)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MwSt.:</span>
                  <span>{formatPrice(order.taxTotalChf)}</span>
                </div>
                {parseFloat(order.shippingCostChf) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Versand:</span>
                    <span>{formatPrice(order.shippingCostChf)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Gesamt:</span>
                  <span>{formatPrice(order.totalChf)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Interne Notizen</CardTitle>
                {!editingNotes && (
                  <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-4">
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={4}
                    placeholder="Interne Notizen zur Bestellung..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNotes} disabled={saving}>
                      {saving ? 'Speichert...' : 'Speichern'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInternalNotes(order.internalNotes || '')
                        setEditingNotes(false)
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {order.internalNotes || 'Keine internen Notizen'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bestellstatus</Label>
                <Select value={order.status} onValueChange={handleStatusUpdate} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zahlung:</span>
                  <Badge variant={order.paymentStatus === 'captured' ? 'default' : 'secondary'}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Methode:</span>
                  <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
                </div>
              </div>

              {/* Refund Button */}
              {(order.paymentStatus === 'captured' || order.paymentStatus === 'authorized') &&
                order.status !== 'refunded' && (
                  <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Rückerstattung
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rückerstattung verarbeiten</DialogTitle>
                        <DialogDescription>
                          Geben Sie den Rückerstattungsbetrag und den Grund an.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Betrag (CHF)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            max={order.totalChf}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder={formatPrice(order.totalChf)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Max: {formatPrice(order.totalChf)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Grund</Label>
                          <Textarea
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            rows={3}
                            placeholder="Grund für die Rückerstattung..."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={refundShipping}
                            onCheckedChange={(checked) => setRefundShipping(checked as boolean)}
                          />
                          <Label className="cursor-pointer">Versandkosten erstatten</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRefundDialogOpen(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleProcessRefund}
                          disabled={saving || !refundAmount || !refundReason}
                        >
                          {saving ? 'Verarbeitet...' : 'Rückerstattung verarbeiten'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kunde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="font-medium">{getCustomerName()}</div>
                <div className="text-muted-foreground">{order.customerEmail}</div>
                {order.customerPhone && (
                  <div className="text-muted-foreground">{order.customerPhone}</div>
                )}
              </div>
              <Link href={`/admin/kunden?search=${order.customerEmail}`}>
                <Button variant="outline" size="sm" className="w-full">
                  Kundenprofil anzeigen
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adressen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.shippingAddressSnapshot && (
                <div>
                  <h4 className="mb-2 font-medium">Versandadresse</h4>
                  {formatAddress(order.shippingAddressSnapshot)}
                </div>
              )}
              {order.billingAddressSnapshot && (
                <div>
                  <h4 className="mb-2 font-medium">Rechnungsadresse</h4>
                  {formatAddress(order.billingAddressSnapshot)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Zeitachse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Erstellt:</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bezahlt:</span>
                  <span>{formatDate(order.paidAt)}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versendet:</span>
                  <span>{formatDate(order.shippedAt)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zugestellt:</span>
                  <span>{formatDate(order.deliveredAt)}</span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storniert:</span>
                  <span>{formatDate(order.cancelledAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
