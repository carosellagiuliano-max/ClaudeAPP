import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Termin buchen' }

export default function TerminBuchenPage() {
  return (
    <div className="container py-16">
      <Badge variant="secondary" className="mb-4">Termin buchen</Badge>
      <h1 className="mb-4 text-4xl font-bold">Online Termin buchen</h1>
      <p className="text-muted-foreground">Booking Engine kommt in Phase 4...</p>
    </div>
  )
}
