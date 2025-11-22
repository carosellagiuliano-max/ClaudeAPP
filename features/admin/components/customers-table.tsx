'use client'

/**
 * Customers Table Component
 * Display customers in a table with actions
 */

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Eye, Star, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { CustomerWithProfile } from '../types/customers'
import { deleteCustomer, updateCustomer } from '../actions/customers'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface CustomersTableProps {
  customers: CustomerWithProfile[]
  salonId: string
}

export function CustomersTable({ customers, salonId }: CustomersTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (customerId: string, customerName: string) => {
    if (
      !confirm(
        `Möchten Sie ${customerName} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return
    }

    setDeleting(customerId)
    const result = await deleteCustomer(salonId, customerId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Löschen des Kunden')
    }
    setDeleting(null)
  }

  const toggleVip = async (customerId: string, currentStatus: boolean) => {
    const result = await updateCustomer(salonId, customerId, {
      isVip: !currentStatus,
    })

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren des Kunden')
    }
  }

  const toggleActive = async (customerId: string, currentStatus: boolean) => {
    const result = await updateCustomer(salonId, customerId, {
      isActive: !currentStatus,
    })

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren des Kunden')
    }
  }

  const getCustomerName = (customer: CustomerWithProfile) => {
    const { firstName, lastName } = customer.profile
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    return customer.profile.email
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'C'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de })
    } catch {
      return dateStr
    }
  }

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const name = getCustomerName(customer).toLowerCase()
    const email = customer.profile.email.toLowerCase()
    const customerNumber = customer.customerNumber?.toLowerCase() || ''
    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      customerNumber.includes(searchLower)
    )
  })

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Noch keine Kunden vorhanden.</p>
        <Link href="/admin/kunden/neu">
          <Button className="mt-4">Ersten Kunden hinzufügen</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Suchen nach Name, E-Mail oder Kundennummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Kundennr.</TableHead>
              <TableHead>Letzter Besuch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Kunden gefunden.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(customer.profile.firstName, customer.profile.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {getCustomerName(customer)}
                          {customer.isVip && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        {customer.preferredStaff && (
                          <div className="text-sm text-muted-foreground">
                            Bevorzugt: {customer.preferredStaff.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{customer.profile.email}</span>
                      </div>
                      {customer.profile.phone && (
                        <div className="text-muted-foreground">{customer.profile.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.customerNumber || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(customer.lastVisitAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {customer.isActive ? (
                        <Badge variant="default" className="w-fit">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit">
                          Inaktiv
                        </Badge>
                      )}
                      {customer.marketingConsent && (
                        <Badge variant="outline" className="w-fit text-xs">
                          Marketing
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleVip(customer.id, customer.isVip)}
                        title={customer.isVip ? 'VIP entfernen' : 'Als VIP markieren'}
                      >
                        <Star
                          className={`h-4 w-4 ${customer.isVip ? 'fill-yellow-400 text-yellow-400' : ''}`}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleActive(customer.id, customer.isActive)}
                        title={customer.isActive ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        {customer.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Link href={`/admin/kunden/${customer.id}`}>
                        <Button size="icon" variant="ghost" title="Details anzeigen">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(customer.id, getCustomerName(customer))}
                        disabled={deleting === customer.id}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredCustomers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {filteredCustomers.length} von {customers.length} Kunden angezeigt
        </div>
      )}
    </div>
  )
}
