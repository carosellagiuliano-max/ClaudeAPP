import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  robots: { index: true, follow: true },
}

export default function DatenschutzPage() {
  return (
    <div className="container prose prose-gray mx-auto max-w-3xl py-16 dark:prose-invert">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Einleitung</h2>
      <p>
        Mit dieser Datenschutzerklärung informieren wir, welche Personendaten wir im Zusammenhang mit
        unseren Aktivitäten und Tätigkeiten einschliesslich unserer Website sammeln. Wir informieren
        insbesondere, wofür, wie und wo wir Personendaten verarbeiten.
      </p>

      <h2>2. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung ist:
        <br />
        SCHNITTWERK by Vanessa Carosella
        <br />
        Rorschacherstrasse 152, 9000 St. Gallen
      </p>

      <h2>3. Erfassung und Verarbeitung von Personendaten</h2>
      <p>
        Wir verarbeiten in erster Linie Personendaten, die wir im Rahmen unserer Geschäftsbeziehung
        mit unseren Kunden und anderen Geschäftspartnern von diesen und weiteren daran beteiligten
        Personen erhalten oder die wir beim Betrieb unserer Website von deren Nutzern erheben.
      </p>

      <h2>4. Zweck der Datenverarbeitung</h2>
      <ul>
        <li>Terminverwaltung und Kundenkommunikation</li>
        <li>Zahlungsabwicklung</li>
        <li>Marketing und Newsletter (mit Einwilligung)</li>
        <li>Vertragserfüllung und Kundenbetreuung</li>
      </ul>

      <h2>5. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch. Kontaktieren Sie uns dazu unter info@schnittwerk.ch.
      </p>

      <p className="text-sm text-muted-foreground">
        Stand: {new Date().toLocaleDateString('de-CH')}
      </p>
    </div>
  )
}
