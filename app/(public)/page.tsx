/**
 * Home Page
 * SCHNITTWERK - Public landing page
 *
 * Features:
 * - Hero section with branding
 * - 3 info cards (Location, Hours, Premium)
 * - Featured services preview
 * - CTA buttons
 * - Dynamic data from Supabase
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { getDefaultSalon, getFeaturedServices, formatOpeningHours, getOpeningHours } from '@/lib/db/queries'
import { formatCurrency, formatDuration } from '@/lib/utils'

export default async function HomePage() {
  // Fetch data from Supabase
  const salon = await getDefaultSalon()
  const featuredServices = await getFeaturedServices(salon?.id || '')
  const openingHours = salon ? await getOpeningHours(salon.id) : []
  const formattedHours = formatOpeningHours(openingHours)

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-background to-muted/20">
        <div className="container py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Main Heading */}
            <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              SCHNITTWERK
            </h1>
            <p className="mb-2 text-xl text-muted-foreground sm:text-2xl">
              by Vanessa Carosella
            </p>

            {/* Subheading */}
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Ihr professioneller Friseursalon im Herzen von St. Gallen. Spezialisiert auf
              Haarschnitte, Färben, Balayage und exklusives Styling.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/termin-buchen">
                  Jetzt Termin buchen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/leistungen">Unsere Leistungen</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Location Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Standort</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {salon && (
                <>
                  <p className="text-sm text-muted-foreground">{salon.address_street}</p>
                  <p className="text-sm text-muted-foreground">
                    {salon.address_postal_code} {salon.address_city}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${salon.address_street}, ${salon.address_postal_code} ${salon.address_city}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    Auf Google Maps öffnen
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                </>
              )}
            </CardContent>
          </Card>

          {/* Opening Hours Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Öffnungszeiten</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montag - Freitag:</span>
                  <span className="font-medium">
                    {formattedHours.get(1) || '09:00 - 18:00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Samstag:</span>
                  <span className="font-medium">
                    {formattedHours.get(6) || '08:00 - 16:00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sonntag:</span>
                  <span className="font-medium">Geschlossen</span>
                </div>
              </div>
              <Link
                href="/kontakt"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                Kontakt aufnehmen
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Premium Services Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Premium Service</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>✓ Über 15 Jahre Erfahrung</p>
                <p>✓ Meisterfriseurin</p>
                <p>✓ Individuelle Beratung</p>
                <p>✓ Hochwertige Produkte</p>
              </div>
              <Link
                href="/team"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                Unser Team kennenlernen
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Services */}
      {featuredServices.length > 0 && (
        <section className="bg-muted/50 py-16">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Beliebte Leistungen
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Entdecken Sie unsere meistgebuchten Services
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featuredServices.map((service) => (
                <Card key={service.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>{service.public_title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {service.description || 'Professioneller Service für Ihr Wohlbefinden.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ab</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(service.base_price_chf)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Dauer</p>
                        <p className="font-medium">
                          {formatDuration(service.base_duration_minutes)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" variant="outline" asChild>
                <Link href="/leistungen">
                  Alle Leistungen anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="container py-16">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="flex flex-col items-center justify-between gap-6 p-12 sm:flex-row">
            <div>
              <h3 className="mb-2 text-2xl font-bold">Bereit für eine Typveränderung?</h3>
              <p className="text-muted-foreground">
                Buchen Sie jetzt Ihren Termin online – schnell und unkompliziert.
              </p>
            </div>
            <Button size="lg" asChild className="flex-shrink-0">
              <Link href="/termin-buchen">Jetzt Termin buchen</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
