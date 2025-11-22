'use client'

/**
 * Booking Success Component
 * Shown after successful booking confirmation
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Calendar, Clock, User, Mail, Home } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

interface BookingSuccessProps {
  confirmationNumber: string
  date: string
  startTime: string
  endTime: string
  staffName: string
  services: Array<{
    name: string
    durationMinutes: number
  }>
  customerEmail: string
}

export function BookingSuccess({
  confirmationNumber,
  date,
  startTime,
  endTime,
  staffName,
  services,
  customerEmail,
}: BookingSuccessProps) {
  const dateObj = new Date(date)

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Buchung erfolgreich!</h1>
          <p className="text-lg text-muted-foreground">
            Ihre Terminanfrage wurde erfolgreich übermittelt.
          </p>
        </div>
      </div>

      {/* Confirmation Number */}
      <Card className="border-2 border-primary">
        <CardContent className="pt-6 text-center">
          <div className="text-sm text-muted-foreground mb-2">
            Ihre Bestätigungsnummer
          </div>
          <Badge variant="secondary" className="text-2xl font-mono px-6 py-2">
            {confirmationNumber}
          </Badge>
          <p className="text-xs text-muted-foreground mt-3">
            Bitte notieren Sie sich diese Nummer für Ihre Unterlagen
          </p>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Termindetails</CardTitle>
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
                {startTime} - {endTime}
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
            <div className="font-semibold mb-2">Gebuchte Leistungen:</div>
            <ul className="space-y-1">
              {services.map((service, index) => (
                <li key={index} className="text-sm">
                  • {service.name} ({service.durationMinutes} Min.)
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Email Confirmation Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-1">Bestätigung per E-Mail</div>
              <p className="text-sm text-muted-foreground">
                Wir haben eine Bestätigungs-E-Mail an <strong>{customerEmail}</strong> gesendet
                mit allen Details zu Ihrem Termin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>Wichtige Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Stornierung:</strong>
            <p className="text-muted-foreground">
              Falls Sie Ihren Termin nicht wahrnehmen können, bitten wir Sie um eine rechtzeitige
              Absage mindestens 24 Stunden im Voraus.
            </p>
          </div>
          <div>
            <strong>Verspätung:</strong>
            <p className="text-muted-foreground">
              Sollten Sie sich verspäten, informieren Sie uns bitte telefonisch. Bei mehr als
              15 Minuten Verspätung müssen wir den Termin möglicherweise verkürzen.
            </p>
          </div>
          <div>
            <strong>Zahlung:</strong>
            <p className="text-muted-foreground">
              Die Bezahlung erfolgt nach der Behandlung vor Ort. Wir akzeptieren Barzahlung,
              Kreditkarten und TWINT.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="default" size="lg" className="flex-1">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Zur Startseite
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/customer/appointments">
            Meine Termine ansehen
          </Link>
        </Button>
      </div>

      {/* Contact Information */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>
          Bei Fragen erreichen Sie uns unter{' '}
          <a href="tel:+41712345678" className="text-primary hover:underline">
            +41 71 123 45 67
          </a>
        </p>
      </div>
    </div>
  )
}
