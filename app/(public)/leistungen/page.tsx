/**
 * Services Page
 * SCHNITTWERK - Service Catalog
 *
 * Features:
 * - Dynamic service listing from database
 * - Grouped by categories
 * - Prices, durations, descriptions
 * - CTA to book
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowRight } from 'lucide-react'
import {
  getDefaultSalon,
  getServices,
  getServiceCategories,
} from '@/lib/db/queries'
import { formatCurrency, formatDuration } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Leistungen',
  description:
    'Entdecken Sie unser vielfältiges Angebot: Haarschnitte, Färben, Balayage, Strähnchen, Styling und mehr. Professionelle Services für jeden Typ.',
  openGraph: {
    title: 'Leistungen | SCHNITTWERK',
    description: 'Professionelle Friseurleistungen in St. Gallen',
  },
}

export default async function LeistungenPage() {
  const salon = await getDefaultSalon()
  if (!salon) {
    return <div>Salon nicht gefunden</div>
  }

  const services = await getServices(salon.id)
  const categories = await getServiceCategories(salon.id)

  // Group services by category
  const servicesByCategory = categories.map((category) => ({
    category,
    services: services.filter((s) => s.category_id === category.id),
  }))

  // Services without category
  const uncategorizedServices = services.filter((s) => !s.category_id)

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted/20 py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Unsere Leistungen
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Professionelle Services für Ihr Wohlbefinden
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Von klassischen Haarschnitten über moderne Färbetechniken bis hin zu exklusivem
              Styling – wir bieten Ihnen ein umfassendes Angebot für jeden Anlass.
            </p>
          </div>
        </div>
      </section>

      {/* Services by Category */}
      <section className="container py-16">
        <div className="space-y-16">
          {servicesByCategory.map(({ category, services: categoryServices }) => (
            <div key={category.id} id={category.slug}>
              {/* Category Header */}
              <div className="mb-8">
                <h2 className="mb-2 text-3xl font-bold tracking-tight">{category.name}</h2>
                {category.description && (
                  <p className="text-lg text-muted-foreground">{category.description}</p>
                )}
              </div>

              {/* Service Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categoryServices.map((service) => (
                  <Card key={service.id} className="flex flex-col transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle>{service.public_title}</CardTitle>
                      {service.description && (
                        <CardDescription className="line-clamp-3">
                          {service.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="mt-auto">
                      <div className="mb-4 flex items-end justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Preis</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(service.base_price_chf)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {formatDuration(service.base_duration_minutes)}
                          </span>
                        </div>
                      </div>

                      {service.online_bookable && (
                        <Button asChild className="w-full">
                          <Link href={`/termin-buchen?service=${service.id}`}>
                            Jetzt buchen
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}

                      {!service.online_bookable && (
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/kontakt">Anfrage stellen</Link>
                        </Button>
                      )}

                      {service.requires_deposit && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          * Anzahlung erforderlich:{' '}
                          {service.deposit_amount_chf
                            ? formatCurrency(service.deposit_amount_chf)
                            : 'Auf Anfrage'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Uncategorized Services */}
          {uncategorizedServices.length > 0 && (
            <div>
              <h2 className="mb-8 text-3xl font-bold tracking-tight">Weitere Leistungen</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {uncategorizedServices.map((service) => (
                  <Card key={service.id} className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle>{service.public_title}</CardTitle>
                      {service.description && (
                        <CardDescription>{service.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-2xl font-bold">
                          {formatCurrency(service.base_price_chf)}
                        </p>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {formatDuration(service.base_duration_minutes)}
                          </span>
                        </div>
                      </div>
                      <Button asChild className="w-full">
                        <Link href="/termin-buchen">Jetzt buchen</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <Card className="border-2 border-primary/20">
            <CardContent className="flex flex-col items-center justify-between gap-6 p-12 text-center sm:flex-row sm:text-left">
              <div>
                <h3 className="mb-2 text-2xl font-bold">Haben Sie Fragen zu unseren Leistungen?</h3>
                <p className="text-muted-foreground">
                  Kontaktieren Sie uns für eine persönliche Beratung oder buchen Sie direkt online.
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-4">
                <Button variant="outline" asChild>
                  <Link href="/kontakt">Kontakt</Link>
                </Button>
                <Button asChild>
                  <Link href="/termin-buchen">Termin buchen</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
