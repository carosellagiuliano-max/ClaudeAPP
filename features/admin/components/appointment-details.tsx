'use client'

/**
 * Appointment Details Component
 * Display and manage appointment details
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Scissors,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
} from 'lucide-react'
import type { AppointmentWithDetails, AppointmentStatus } from '../types/appointments'
import { updateAppointment } from '../actions/appointments'
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '../types/appointments'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface AppointmentDetailsProps {
  appointment: AppointmentWithDetails
  salonId: string
}

export function AppointmentDetails({ appointment, salonId }: AppointmentDetailsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState({
    staffNotes: appointment.staffNotes || '',
    customerNotes: appointment.customerNotes || '',
  })

  const handleStatusUpdate = async (newStatus: AppointmentStatus) => {
    if (
      !confirm(
        `Möchten Sie den Status wirklich auf "${APPOINTMENT_STATUS_LABELS[newStatus]}" ändern?`
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await updateAppointment(salonId, appointment.id, {
        status: newStatus,
      })

      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Aktualisieren des Status')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await updateAppointment(salonId, appointment.id, {
        staffNotes: notes.staffNotes,
        customerNotes: notes.customerNotes,
      })

      if (result.success) {
        setEditingNotes(false)
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Speichern der Notizen')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, dd. MMMM yyyy, HH:mm', { locale: de })
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

  const getCustomerName = () => {
    const { firstName, lastName } = appointment.customer.profile
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    return appointment.customer.profile.email
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'C'
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status</CardTitle>
            <Badge variant={APPOINTMENT_STATUS_COLORS[appointment.status]} className="text-sm">
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {appointment.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate('checked_in')}
                disabled={loading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Einchecken
              </Button>
            )}
            {appointment.status === 'checked_in' && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={loading}
              >
                <Clock className="mr-2 h-4 w-4" />
                Starten
              </Button>
            )}
            {appointment.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate('completed')}
                disabled={loading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Abschließen
              </Button>
            )}
            {!['cancelled', 'completed', 'no_show'].includes(appointment.status) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={loading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Stornieren
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('no_show')}
                disabled={loading}
              >
                Nicht erschienen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Kunde
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {getInitials(
                    appointment.customer.profile.firstName,
                    appointment.customer.profile.lastName
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{getCustomerName()}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.customer.profile.email}</span>
              </div>
              {appointment.customer.profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{appointment.customer.profile.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Mitarbeiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={appointment.staff.photoUrl || undefined} />
                <AvatarFallback>ST</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {appointment.staff.displayName || 'Mitarbeiter'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datum & Uhrzeit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDateTime(appointment.startsAt)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Dauer: {appointment.totalDurationMinutes} Minuten
          </div>
          <div className="text-sm text-muted-foreground">
            Endet um: {format(parseISO(appointment.endsAt), 'HH:mm', { locale: de })}
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Leistungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appointment.services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{service.snapshotServiceName}</div>
                  <div className="text-sm text-muted-foreground">
                    {service.snapshotDurationMinutes} Min
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatPrice(service.snapshotPriceChf)}</div>
                  {service.snapshotTaxChf && (
                    <div className="text-xs text-muted-foreground">
                      inkl. MwSt {formatPrice(service.snapshotTaxChf)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span>Zwischensumme:</span>
                <span className="font-medium">{formatPrice(appointment.totalPriceChf)}</span>
              </div>
              {appointment.totalTaxChf && (
                <div className="flex justify-between text-sm">
                  <span>MwSt (8.1%):</span>
                  <span className="font-medium">{formatPrice(appointment.totalTaxChf)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total:</span>
                <span>
                  {formatPrice(
                    (appointment.totalPriceChf || 0) + (appointment.totalTaxChf || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notizen</CardTitle>
          {!editingNotes ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingNotes(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingNotes(false)
                  setNotes({
                    staffNotes: appointment.staffNotes || '',
                    customerNotes: appointment.customerNotes || '',
                  })
                }}
                disabled={loading}
              >
                Abbrechen
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Kundennotizen</Label>
            {editingNotes ? (
              <Textarea
                id="customerNotes"
                value={notes.customerNotes}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, customerNotes: e.target.value }))
                }
                rows={3}
                placeholder="Notizen vom Kunden..."
              />
            ) : (
              <p className="text-sm rounded-md border p-3 min-h-[80px]">
                {appointment.customerNotes || (
                  <span className="text-muted-foreground">Keine Kundennotizen</span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffNotes">Interne Notizen</Label>
            {editingNotes ? (
              <Textarea
                id="staffNotes"
                value={notes.staffNotes}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, staffNotes: e.target.value }))
                }
                rows={3}
                placeholder="Interne Notizen für Mitarbeiter..."
              />
            ) : (
              <p className="text-sm rounded-md border p-3 min-h-[80px]">
                {appointment.staffNotes || (
                  <span className="text-muted-foreground">Keine internen Notizen</span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Weitere Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buchungsquelle:</span>
            <span className="font-medium">
              {appointment.bookedVia === 'online' && 'Online'}
              {appointment.bookedVia === 'phone' && 'Telefon'}
              {appointment.bookedVia === 'walk_in' && 'Walk-in'}
              {appointment.bookedVia === 'admin' && 'Admin'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Erstellt am:</span>
            <span className="font-medium">
              {format(parseISO(appointment.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
            </span>
          </div>
          {appointment.cancelledAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storniert am:</span>
              <span className="font-medium">
                {format(parseISO(appointment.cancelledAt), 'dd.MM.yyyy HH:mm', {
                  locale: de,
                })}
              </span>
            </div>
          )}
          {appointment.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abgeschlossen am:</span>
              <span className="font-medium">
                {format(parseISO(appointment.completedAt), 'dd.MM.yyyy HH:mm', {
                  locale: de,
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
