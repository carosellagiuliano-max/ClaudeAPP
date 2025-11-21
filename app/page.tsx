import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
      <div className="container flex flex-col items-center gap-8 px-4 py-16 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            SCHNITTWERK
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">
            by Vanessa Carosella
          </p>
        </div>

        {/* Subheading */}
        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Professioneller Friseursalon in St. Gallen. Ihr Experte für Haarschnitte, Färben,
          Balayage und Styling.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/booking">Termin buchen</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/leistungen">Unsere Leistungen</Link>
          </Button>
        </div>

        {/* Info Cards */}
        <div className="mt-16 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">📍 Standort</h3>
            <p className="text-sm text-muted-foreground">
              Rorschacherstrasse 152
              <br />
              9000 St. Gallen
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">🕒 Öffnungszeiten</h3>
            <p className="text-sm text-muted-foreground">
              Mo - Fr: 09:00 - 18:00
              <br />
              Sa: 08:00 - 16:00
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">✨ Premium Service</h3>
            <p className="text-sm text-muted-foreground">
              15+ Jahre Erfahrung
              <br />
              Meisterfriseurin
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Phase 2: Design System ✅</p>
          <p className="mt-1 opacity-70">
            Database Schema ✅ | UI Foundation ✅ | Next: Public Website
          </p>
        </div>
      </div>
    </main>
  )
}
