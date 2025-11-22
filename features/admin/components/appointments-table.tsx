'use client'

/**
 * Appointments Table Component
 * Display appointments in a table with actions
 */

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { AppointmentWithDetails } from '../types/appointments'
import { deleteAppointment, updateAppointment } from '../actions/appointments'
import { useRouter } from 'next/navigation'
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '../types/appointments'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface AppointmentsTableProps {
  appointments: AppointmentWithDetails[]
  salonId: string
}

export function AppointmentsTable({ appointments, salonId }: AppointmentsTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const handleDelete = async (appointmentId: string, customerName: string) => {
    if (
      !confirm(
        `Möchten Sie den Termin mit ${customerName} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return
    }

    setDeleting(appointmentId)
    const result = await deleteAppointment(salonId, appointmentId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Löschen des Termins')
    }
    setDeleting(null)
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    setUpdating(appointmentId)
    const result = await updateAppointment(salonId, appointmentId, {
      status: newStatus as any,
    })

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren des Status')
    }
    setUpdating(null)
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  const getCustomerName = (apt: AppointmentWithDetails) => {
    const { firstName, lastName } = apt.customer.profile
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    return apt.customer.profile.email
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'C'
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Keine Termine gefunden.</p>
        <Link href="/admin/termine/neu">
          <Button className="mt-4">Ersten Termin erstellen</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kunde</TableHead>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Datum & Zeit</TableHead>
            <TableHead>Leistungen</TableHead>
            <TableHead>Preis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => (
            <TableRow key={apt.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(
                        apt.customer.profile.firstName,
                        apt.customer.profile.lastName
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{getCustomerName(apt)}</div>
                    {apt.customer.profile.phone && (
                      <div className="text-sm text-muted-foreground">
                        {apt.customer.profile.phone}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={apt.staff.photoUrl || undefined} />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{apt.staff.displayName || 'Mitarbeiter'}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{formatDateTime(apt.startsAt)}</div>
                  <div className="text-muted-foreground">
                    {apt.totalDurationMinutes} Min
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {apt.services.map((svc) => (
                    <div key={svc.id} className="text-sm">
                      {svc.snapshotServiceName}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{formatPrice(apt.totalPriceChf)}</TableCell>
              <TableCell>
                <Badge variant={APPOINTMENT_STATUS_COLORS[apt.status]}>
                  {APPOINTMENT_STATUS_LABELS[apt.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {apt.status === 'confirmed' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStatusUpdate(apt.id, 'checked_in')}
                      disabled={updating === apt.id}
                      title="Einchecken"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  {apt.status === 'checked_in' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStatusUpdate(apt.id, 'completed')}
                      disabled={updating === apt.id}
                      title="Abschließen"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Link href={`/admin/termine/${apt.id}`}>
                    <Button size="icon" variant="ghost" title="Details anzeigen">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(apt.id, getCustomerName(apt))}
                    disabled={deleting === apt.id}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
