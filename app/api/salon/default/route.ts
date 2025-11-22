import { NextResponse } from 'next/server'
import { getDefaultSalon } from '@/lib/db/queries'

/**
 * GET /api/salon/default
 * Returns the default salon for the current user
 */
export async function GET() {
  try {
    const salon = await getDefaultSalon()

    if (!salon) {
      return NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 })
    }

    return NextResponse.json({ id: salon.id, name: salon.name })
  } catch (error) {
    console.error('Error fetching default salon:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Salons' },
      { status: 500 }
    )
  }
}
