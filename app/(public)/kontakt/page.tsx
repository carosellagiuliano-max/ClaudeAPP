import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktieren Sie SCHNITTWERK. Wir freuen uns auf Ihre Anfrage!',
}

export default async function KontaktPage() {
  const salon = await getDefaultSalon()

  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-background to-muted/20 py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Kontakt</Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Wir freuen uns auf Sie!
            </h1>
            <p className="text-lg text-muted-foreground">
              Haben Sie Fragen oder möchten Sie einen Termin vereinbaren? Kontaktieren Sie uns!
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-semibold">Adresse</h3>
                  {salon && (
                    <div className="text-sm text-muted-foreground">
                      <p>{salon.address_street}</p>
                      <p>{salon.address_postal_code} {salon.address_city}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-semibold">Telefon</h3>
                  <a href="tel:+41711234567" className="text-sm hover:underline">
                    +41 71 123 45 67
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <Mail className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-semibold">E-Mail</h3>
                  <a href="mailto:info@schnittwerk.ch" className="text-sm hover:underline">
                    info@schnittwerk.ch
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <Clock className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="mb-2 font-semibold">Öffnungszeiten</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between"><span>Mo - Fr:</span><span>09:00 - 18:00</span></div>
                    <div className="flex justify-between"><span>Samstag:</span><span>08:00 - 16:00</span></div>
                    <div className="flex justify-between"><span>Sonntag:</span><span>Geschlossen</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Standort</h3>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2700.123456789!2d9.376894!3d47.423611!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDI1JzI1LjAiTiA5wrAyMiczNi44IkU!5e0!3m2!1sde!2sch!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
