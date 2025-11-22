import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Galerie' }

export default function GaleriePage() {
  return (
    <div className="container py-16">
      <Badge variant="secondary" className="mb-4">Galerie</Badge>
      <h1 className="mb-4 text-4xl font-bold">Unsere Arbeiten</h1>
      <p className="text-muted-foreground">Galerie kommt in Phase 4...</p>
    </div>
  )
}
