import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Über uns' }

export default function UeberUnsPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-background to-muted/20 py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Über uns</Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Die Geschichte von SCHNITTWERK
            </h1>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <Card>
            <CardContent className="prose prose-gray p-8 dark:prose-invert">
              <h2>Unsere Geschichte</h2>
              <p>
                SCHNITTWERK wurde von Vanessa Carosella mit der Vision gegründet, einen Ort zu schaffen,
                an dem sich Menschen wohlfühlen und ihre Persönlichkeit durch ihr Haar ausdrücken können.
              </p>

              <h2>Unsere Philosophie</h2>
              <p>
                Wir glauben, dass jeder Mensch einzigartig ist. Daher bieten wir individuelle Beratungen
                und massgeschneiderte Lösungen für jeden Kunden.
              </p>

              <h2>Unsere Werte</h2>
              <ul>
                <li>Qualität und Professionalität</li>
                <li>Individuelle Beratung</li>
                <li>Hochwertige Produkte</li>
                <li>Nachhaltigkeit</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
