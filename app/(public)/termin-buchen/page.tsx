import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { getBookableServices, getBookableStaff } from '@/features/booking/actions'
import { BookingFlow } from '@/features/booking/components/booking-flow'
import { getDefaultSalon } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Termin buchen' }

export default async function TerminBuchenPage() {
  // Fetch salon and services
  const salon = await getDefaultSalon()

  if (!salon) {
    return (
      <div className="container py-16">
        <Badge variant="secondary" className="mb-4">Termin buchen</Badge>
        <h1 className="mb-4 text-4xl font-bold">Online Termin buchen</h1>
        <p className="text-destructive">Salon nicht gefunden</p>
      </div>
    )
  }

  const services = await getBookableServices(salon.id)

  // Get all staff (will be filtered by selected services in the flow)
  const allServiceIds = services.map(s => s.id)
  const allStaff = await getBookableStaff(salon.id, allServiceIds)

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-4">Termin buchen</Badge>
          <h1 className="mb-4 text-4xl font-bold">Online Termin buchen</h1>
          <p className="text-muted-foreground">
            Buchen Sie Ihren Termin in nur wenigen Schritten
          </p>
        </div>

        <BookingFlow
          salonId={salon.id}
          services={services}
          allStaff={allStaff}
        />
      </div>
    </div>
  )
}
