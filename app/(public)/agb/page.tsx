import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AGB',
  robots: { index: true, follow: true },
}

export default function AGBPage() {
  return (
    <div className="container prose prose-gray mx-auto max-w-3xl py-16 dark:prose-invert">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB regeln die Rechtsbeziehungen zwischen SCHNITTWERK by Vanessa Carosella und ihren
        Kunden.
      </p>

      <h2>2. Terminvereinbarung</h2>
      <p>
        Termine können online, telefonisch oder persönlich vereinbart werden. Eine Bestätigung erfolgt
        per E-Mail oder SMS.
      </p>

      <h2>3. Stornierung</h2>
      <p>
        Termine können bis 24 Stunden vor dem vereinbarten Termin kostenlos storniert werden. Bei
        kurzfristigeren Absagen oder Nichterscheinen können Stornogebühren anfallen.
      </p>

      <h2>4. Zahlungsbedingungen</h2>
      <p>
        Die Bezahlung erfolgt nach Erbringung der Dienstleistung bar, mit Karte oder online. Alle
        Preise verstehen sich in CHF inkl. MwSt.
      </p>

      <h2>5. Haftung</h2>
      <p>
        Wir arbeiten nach bestem Wissen und Gewissen. Für Schäden, die aufgrund besonderer
        Haarstrukturen oder Vorschädigungen auftreten, übernehmen wir keine Haftung.
      </p>

      <h2>6. Änderungen</h2>
      <p>
        Wir behalten uns das Recht vor, diese AGB jederzeit zu ändern. Die jeweils aktuelle Version
        ist auf unserer Website einsehbar.
      </p>

      <p className="text-sm text-muted-foreground">
        Stand: {new Date().toLocaleDateString('de-CH')}
      </p>
    </div>
  )
}
