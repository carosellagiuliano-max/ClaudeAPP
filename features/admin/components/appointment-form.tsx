'use client'

/**
 * Appointment Form Component
 * Create and edit appointments
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Appointment, AppointmentInput } from '../types/appointments'
import { createAppointment, updateAppointment } from '../actions/appointments'
import { getServices } from '../actions/services'
import { getStaffMembers } from '../actions/staff'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface AppointmentFormProps {
  salonId: string
  appointment?: Appointment
  customerId: string
}

export function AppointmentForm({ salonId, appointment, customerId }: AppointmentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState({
    customerId: customerId,
    staffId: appointment?.staffId || '',
    date: appointment?.startsAt ? format(new Date(appointment.startsAt), 'yyyy-MM-dd') : '',
    time: appointment?.startsAt ? format(new Date(appointment.startsAt), 'HH:mm') : '',
    bookedVia: (appointment?.bookedVia as any) || 'admin',
    customerNotes: appointment?.customerNotes || '',
    staffNotes: appointment?.staffNotes || '',
  })

  // Selected services
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      serviceId: string
      serviceName: string
      price: number
      duration: number
      taxRate?: number
    }>
  >([])

  // Load services and staff
  useEffect(() => {
    const loadData = async () => {
      const [servicesResult, staffResult] = await Promise.all([
        getServices(salonId),
        getStaffMembers(salonId),
      ])

      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data.filter((s) => s.isActive))
      }

      if (staffResult.success && staffResult.data) {
        setStaff(staffResult.data.filter((s) => s.isActive))
      }
    }
    loadData()
  }, [salonId])

  const handleAddService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return

    setSelectedServices([
      ...selectedServices,
      {
        serviceId: service.id,
        serviceName: service.publicTitle,
        price: service.basePriceChf,
        duration: service.baseDurationMinutes,
        taxRate: 8.1, // Default Swiss VAT
      },
    ])
  }

  const handleRemoveService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const totalPrice = selectedServices.reduce((sum, svc) => sum + svc.price, 0)
    const totalTax = selectedServices.reduce(
      (sum, svc) => sum + svc.price * ((svc.taxRate || 0) / 100),
      0
    )
    const totalDuration = selectedServices.reduce((sum, svc) => sum + svc.duration, 0)

    return { totalPrice, totalTax, totalDuration }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (selectedServices.length === 0) {
      setError('Bitte wählen Sie mindestens eine Leistung aus')
      setLoading(false)
      return
    }

    if (!formData.staffId) {
      setError('Bitte wählen Sie einen Mitarbeiter aus')
      setLoading(false)
      return
    }

    if (!formData.date || !formData.time) {
      setError('Bitte geben Sie Datum und Uhrzeit ein')
      setLoading(false)
      return
    }

    try {
      // Calculate start and end times
      const startsAt = new Date(`${formData.date}T${formData.time}:00`)
      const totals = calculateTotals()
      const endsAt = new Date(startsAt.getTime() + totals.totalDuration * 60000)

      const appointmentData: AppointmentInput = {
        customerId: formData.customerId,
        staffId: formData.staffId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        bookedVia: formData.bookedVia as any,
        customerNotes: formData.customerNotes || undefined,
        staffNotes: formData.staffNotes || undefined,
        services: selectedServices.map((svc, index) => ({
          serviceId: svc.serviceId,
          snapshotPriceChf: svc.price,
          snapshotTaxRatePercent: svc.taxRate,
          snapshotTaxChf: svc.price * ((svc.taxRate || 0) / 100),
          snapshotDurationMinutes: svc.duration,
          snapshotServiceName: svc.serviceName,
          sortOrder: index,
        })),
      }

      const result = appointment
        ? await updateAppointment(salonId, appointment.id, {
            staffId: formData.staffId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            customerNotes: formData.customerNotes,
            staffNotes: formData.staffNotes,
          })
        : await createAppointment(salonId, appointmentData)

      if (result.success) {
        router.push('/admin/termine')
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Datum & Uhrzeit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Uhrzeit *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, time: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffId">Mitarbeiter *</Label>
            <Select
              value={formData.staffId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, staffId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter wählen..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leistungen</CardTitle>
          <Select
            onValueChange={(value) => {
              handleAddService(value)
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Leistung hinzufügen..." />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.publicTitle} - {formatPrice(service.basePriceChf)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {selectedServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Noch keine Leistungen ausgewählt.</p>
              <p className="text-sm">Wählen Sie Leistungen aus dem Dropdown oben aus.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedServices.map((svc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{svc.serviceName}</div>
                    <div className="text-sm text-muted-foreground">
                      {svc.duration} Min • {formatPrice(svc.price)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveService(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Totals */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Gesamtdauer:</span>
                  <span className="font-medium">{totals.totalDuration} Minuten</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Zwischensumme:</span>
                  <span className="font-medium">{formatPrice(totals.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>MwSt (8.1%):</span>
                  <span className="font-medium">{formatPrice(totals.totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(totals.totalPrice + totals.totalTax)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notizen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Kundennotizen</Label>
            <Textarea
              id="customerNotes"
              value={formData.customerNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customerNotes: e.target.value }))
              }
              rows={3}
              placeholder="Notizen vom Kunden..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffNotes">Interne Notizen</Label>
            <Textarea
              id="staffNotes"
              value={formData.staffNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, staffNotes: e.target.value }))
              }
              rows={3}
              placeholder="Interne Notizen für Mitarbeiter..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Wird gespeichert...'
            : appointment
              ? 'Änderungen speichern'
              : 'Termin erstellen'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
