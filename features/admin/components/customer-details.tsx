'use client'

/**
 * Customer Details Component
 * Display and manage customer details with history
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  User,
  Mail,
  Phone,
  Star,
  TrendingUp,
  Edit,
  Save,
  MapPin,
  CalendarDays,
} from 'lucide-react'
import type { CustomerWithStats } from '../types/customers'
import { updateCustomer } from '../actions/customers'
import { getAppointments } from '../actions/appointments'
import { GENDER_LABELS, SOURCE_LABELS } from '../types/customers'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface CustomerDetailsProps {
  customer: CustomerWithStats
  salonId: string
}

export function CustomerDetails({ customer, salonId }: CustomerDetailsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(customer.notes || '')
  const [appointments, setAppointments] = useState<any[]>([])

  // Load customer appointments
  useEffect(() => {
    const loadAppointments = async () => {
      const result = await getAppointments(salonId)
      if (result.success && result.data) {
        const customerAppts = result.data.filter((a) => a.customerId === customer.id)
        setAppointments(customerAppts.slice(0, 10)) // Last 10 appointments
      }
    }
    loadAppointments()
  }, [salonId, customer.id])

  const handleSaveNotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await updateCustomer(salonId, customer.id, {
        notes,
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

  const toggleVip = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await updateCustomer(salonId, customer.id, {
        isVip: !customer.isVip,
      })

      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Aktualisieren des VIP-Status')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const getCustomerName = () => {
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

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Customer Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(customer.profile.firstName, customer.profile.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {getCustomerName()}
                  {customer.isVip && (
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  )}
                </h2>
                <p className="text-muted-foreground">{customer.profile.email}</p>
                {customer.customerNumber && (
                  <p className="text-sm text-muted-foreground">
                    Kundennr: {customer.customerNumber}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={customer.isVip ? 'default' : 'outline'}
                size="sm"
                onClick={toggleVip}
                disabled={loading}
              >
                <Star className="mr-2 h-4 w-4" />
                {customer.isVip ? 'VIP' : 'Als VIP markieren'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Termine</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {customer.stats.completedAppointments} abgeschlossen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Umsatz</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(customer.stats.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Gesamt ausgegeben</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Letzter Besuch</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(customer.stats.lastAppointmentDate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {customer.stats.lastAppointmentDate ? 'war hier' : 'Noch kein Besuch'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storniert</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.cancelledAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {customer.stats.noShowAppointments} nicht erschienen
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Kontaktinformationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.profile.email}</span>
            </div>
            {customer.profile.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.profile.phone}</span>
              </div>
            )}

            <Separator />

            {customer.birthday && (
              <div className="text-sm">
                <span className="text-muted-foreground">Geburtstag:</span>{' '}
                <span className="font-medium">{formatDate(customer.birthday)}</span>
              </div>
            )}
            {customer.gender && (
              <div className="text-sm">
                <span className="text-muted-foreground">Geschlecht:</span>{' '}
                <span className="font-medium">{GENDER_LABELS[customer.gender]}</span>
              </div>
            )}
            {customer.source && (
              <div className="text-sm">
                <span className="text-muted-foreground">Quelle:</span>{' '}
                <span className="font-medium">{SOURCE_LABELS[customer.source] || customer.source}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Präferenzen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.preferredStaff && (
              <div className="text-sm">
                <span className="text-muted-foreground">Bevorzugter Mitarbeiter:</span>{' '}
                <span className="font-medium">{customer.preferredStaff.displayName}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Marketing-Einwilligung:</span>{' '}
              <Badge variant={customer.marketingConsent ? 'default' : 'secondary'}>
                {customer.marketingConsent ? 'Ja' : 'Nein'}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Status:</span>{' '}
              <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                {customer.isActive ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Kunde seit:</span>{' '}
              <span className="font-medium">{formatDate(customer.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notizen</CardTitle>
          {!editingNotes ? (
            <Button size="sm" variant="outline" onClick={() => setEditingNotes(true)}>
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
                  setNotes(customer.notes || '')
                }}
                disabled={loading}
              >
                Abbrechen
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Notizen zum Kunden..."
            />
          ) : (
            <p className="text-sm rounded-md border p-3 min-h-[100px]">
              {customer.notes || (
                <span className="text-muted-foreground">Keine Notizen vorhanden</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle>Terminverlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Noch keine Termine vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{formatDateTime(appointment.startsAt)}</div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.services.length} Leistung(en) •{' '}
                      {appointment.staff.displayName || 'Mitarbeiter'}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        appointment.status === 'completed'
                          ? 'default'
                          : appointment.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {appointment.status === 'completed' && 'Abgeschlossen'}
                      {appointment.status === 'cancelled' && 'Storniert'}
                      {appointment.status === 'confirmed' && 'Bestätigt'}
                      {appointment.status === 'no_show' && 'Nicht erschienen'}
                    </Badge>
                    {appointment.totalPriceChf && (
                      <div className="text-sm font-medium mt-1">
                        {formatPrice(appointment.totalPriceChf)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
