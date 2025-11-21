'use client'

/**
 * Step 4: Confirmation & Customer Details
 * Final step where customer provides contact info and confirms booking
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Calendar, Clock, User, Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { type Step4Data, type SelectedService, type CompleteBooking } from '../types'
import { formatCurrency } from '@/lib/utils'
import { createBooking } from '../actions'

interface Step4Props {
  salonId: string
  services: SelectedService[]
  staffName: string
  date: string
  startTime: string
  endTime: string
  datetime: string
  onBack: () => void
  onSuccess: (appointmentId: string) => void
}

export function Step4Confirmation({
  salonId,
  services,
  staffName,
  date,
  startTime,
  endTime,
  datetime,
  onBack,
  onSuccess,
}: Step4Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalPrice = services.reduce((sum, s) => sum + s.priceChf, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Bitte akzeptieren Sie die AGB und Datenschutzerklärung')
      return
    }

    setLoading(true)

    try {
      // Parse date and time to get start/end minutes
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)

      const booking: CompleteBooking = {
        salonId,
        services,
        staffId: '', // Will be set from Step3Data
        date,
        startMinutes: startHour * 60 + startMin,
        endMinutes: endHour * 60 + endMin,
        datetime,
        customer: {
          firstName,
          lastName,
          email,
          phone,
          notes: notes || undefined,
          acceptedTerms,
          acceptedPrivacy,
        },
      }

      const response = await createBooking(booking)

      if (response.success && response.appointmentId) {
        onSuccess(response.appointmentId)
      } else {
        setError(response.error || 'Fehler beim Erstellen der Buchung')
      }
    } catch (err) {
      console.error('Booking error:', err)
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const dateObj = new Date(date)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Buchung bestätigen</h2>
        <p className="text-muted-foreground">
          Überprüfen Sie Ihre Angaben und geben Sie Ihre Kontaktdaten ein.
        </p>
      </div>

      {/* Booking Summary */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Ihre Buchung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">
                {format(dateObj, 'EEEE, dd. MMMM yyyy', { locale: de })}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {startTime} - {endTime} ({totalDuration} Min.)
              </div>
            </div>
          </div>

          {/* Staff */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">{staffName}</div>
              <div className="text-sm text-muted-foreground">Ihr Stylist</div>
            </div>
          </div>

          {/* Services */}
          <div className="pt-2 border-t">
            <div className="font-semibold mb-2">Leistungen:</div>
            <div className="space-y-2">
              {services.map((service, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <div>{service.name}</div>
                    <div className="text-muted-foreground">{service.durationMinutes} Min.</div>
                  </div>
                  <div className="font-semibold">{formatCurrency(service.priceChf)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-lg font-bold">
              <span>Gesamt</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ihre Kontaktdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Vorname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Nachname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Mustermann"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                E-Mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="max@beispiel.ch"
              />
              <p className="text-xs text-muted-foreground">
                Wir senden Ihre Buchungsbestätigung an diese E-Mail-Adresse.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+41 71 123 45 67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Besondere Wünsche oder Anmerkungen..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/500 Zeichen
              </p>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  required
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                  Ich akzeptiere die{' '}
                  <a href="/agb" target="_blank" className="text-primary hover:underline">
                    Allgemeinen Geschäftsbedingungen
                  </a>{' '}
                  <span className="text-destructive">*</span>
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                  required
                />
                <Label htmlFor="privacy" className="text-sm font-normal leading-relaxed cursor-pointer">
                  Ich habe die{' '}
                  <a href="/datenschutz" target="_blank" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </a>{' '}
                  zur Kenntnis genommen <span className="text-destructive">*</span>
                </Label>
              </div>
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gebucht...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Jetzt buchen
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
