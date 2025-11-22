import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import { getAppointmentById } from '@/features/admin/actions/appointments'
import { AppointmentDetails } from '@/features/admin/components/appointment-details'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AppointmentDetailPageProps {
  params: {
    id: string
  }
}

export default async function AppointmentDetailPage({
  params,
}: AppointmentDetailPageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const appointmentResult = await getAppointmentById(salon.id, params.id)

  if (!appointmentResult.success || !appointmentResult.data) {
    redirect('/admin/termine')
  }

  const appointment = appointmentResult.data

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/termine">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Termindetails</h1>
          <p className="text-muted-foreground">
            Termin vom{' '}
            {new Date(appointment.startsAt).toLocaleDateString('de-CH', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Details */}
      <AppointmentDetails appointment={appointment} salonId={salon.id} />
    </div>
  )
}
