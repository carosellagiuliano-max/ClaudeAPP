'use client'

/**
 * Orders Table Component
 * Searchable table with filters and actions
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Eye, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { OrderWithDetails, OrderStatus, PaymentStatus } from '../types/orders'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../types/orders'

interface OrdersTableProps {
  orders: OrderWithDetails[]
  salonId: string
}

export function OrdersTable({ orders, salonId }: OrdersTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')

  const filteredOrders = orders.filter((order) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const customerName =
        `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.toLowerCase()
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.invoiceNumber.toLowerCase().includes(searchLower) ||
        order.customerEmail.toLowerCase().includes(searchLower) ||
        customerName.includes(searchLower)

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all' && order.paymentStatus !== paymentStatusFilter) {
      return false
    }

    return true
  })

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(price))
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  const getCustomerName = (order: OrderWithDetails) => {
    const { firstName, lastName } = order.customer
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim()
    }
    return order.customerEmail
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Noch keine Bestellungen vorhanden.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Bestellnummer, Rechnungsnummer, Kunde..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Zahlung filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zahlungsstatus</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bestellung</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Zahlung</TableHead>
              <TableHead>Zahlungsmethode</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Keine Bestellungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.invoiceNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{getCustomerName(order)}</div>
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(order.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(order.totalChf)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.paymentStatus === 'captured' ? 'default' : 'secondary'
                      }
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/bestellungen/${order.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Count */}
      {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' ? (
        <p className="text-sm text-muted-foreground">
          {filteredOrders.length} von {orders.length} Bestellungen
        </p>
      ) : null}
    </div>
  )
}
