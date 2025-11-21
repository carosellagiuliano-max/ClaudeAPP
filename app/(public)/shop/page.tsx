import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Shop' }

export default function ShopPage() {
  return (
    <div className="container py-16">
      <Badge variant="secondary" className="mb-4">Shop</Badge>
      <h1 className="mb-4 text-4xl font-bold">Unser Shop</h1>
      <p className="text-muted-foreground">Shop kommt in Phase 5...</p>
    </div>
  )
}
