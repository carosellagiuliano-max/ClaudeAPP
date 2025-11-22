'use client'

/**
 * Inventory Transaction Manager Component
 * Manage stock adjustments and view transaction history
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { InventoryTransactionWithProduct, InventoryTransactionInput } from '../types/products'
import { createInventoryTransaction, getInventoryTransactions } from '../actions/products'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../types/products'

interface InventoryTransactionManagerProps {
  salonId: string
  productId: string
  productName: string
  currentUserId: string
}

export function InventoryTransactionManager({
  salonId,
  productId,
  productName,
  currentUserId,
}: InventoryTransactionManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transactions, setTransactions] = useState<InventoryTransactionWithProduct[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<InventoryTransactionInput>>({
    productId,
    transactionType: 'adjustment',
    quantity: 0,
    unitCostChf: '',
    totalCostChf: '',
    notes: '',
  })

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      const result = await getInventoryTransactions(salonId, { productId })
      if (result.success && result.data) {
        setTransactions(result.data)
      }
    }
    loadTransactions()
  }, [salonId, productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createInventoryTransaction(
        salonId,
        currentUserId,
        formData as InventoryTransactionInput
      )

      if (result.success) {
        // Reset form
        setFormData({
          productId,
          transactionType: 'adjustment',
          quantity: 0,
          unitCostChf: '',
          totalCostChf: '',
          notes: '',
        })
        setShowForm(false)

        // Reload transactions
        const txnsResult = await getInventoryTransactions(salonId, { productId })
        if (txnsResult.success && txnsResult.data) {
          setTransactions(txnsResult.data)
        }

        router.refresh()
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  const formatPrice = (price: string | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(price))
  }

  const getPersonName = (txn: InventoryTransactionWithProduct) => {
    const { firstName, lastName } = txn.performedByProfile
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim()
    }
    return txn.performedByProfile.email
  }

  return (
    <div className="space-y-6">
      {/* Add Transaction Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Transaktion
        </Button>
      )}

      {/* Transaction Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Transaktion für {productName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaktionstyp *</Label>
                  <Select
                    value={formData.transactionType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, transactionType: value as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Menge *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) }))
                    }
                    required
                    placeholder="Positiv für Zugang, negativ für Abgang"
                  />
                  <p className="text-xs text-muted-foreground">
                    Positiv für Zugang (+), negativ für Abgang (-)
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unitCostChf">Stückpreis (CHF)</Label>
                  <Input
                    id="unitCostChf"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostChf}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, unitCostChf: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalCostChf">Gesamtkosten (CHF)</Label>
                  <Input
                    id="totalCostChf"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalCostChf}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, totalCostChf: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Wird gespeichert...' : 'Transaktion erstellen'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setError(null)
                  }}
                  disabled={loading}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaktionsverlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Noch keine Transaktionen für dieses Produkt
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Menge</TableHead>
                    <TableHead className="text-right">Stückpreis</TableHead>
                    <TableHead className="text-right">Gesamt</TableHead>
                    <TableHead>Durchgeführt von</TableHead>
                    <TableHead>Notizen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(txn.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TRANSACTION_TYPE_COLORS[txn.transactionType]}>
                          {TRANSACTION_TYPE_LABELS[txn.transactionType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {txn.quantity > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span
                            className={txn.quantity > 0 ? 'text-green-600' : 'text-red-600'}
                          >
                            {txn.quantity > 0 ? '+' : ''}
                            {txn.quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(txn.unitCostChf)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(txn.totalCostChf)}
                      </TableCell>
                      <TableCell>{getPersonName(txn)}</TableCell>
                      <TableCell>
                        {txn.notes ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {txn.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
