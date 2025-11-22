import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, Clock, CheckCircle2 } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getAppointments } from '@/features/admin/actions/appointments'
import { AppointmentsTable } from '@/features/admin/components/appointments-table'
import Link from 'next/link'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'

export default async function AppointmentsPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  // Get appointments for today and next 7 days
  const today = new Date()
  const nextWeek = addDays(today, 7)

  const appointmentsResult = await getAppointments(
    salon.id,
    startOfDay(today).toISOString(),
    endOfDay(nextWeek).toISOString()
  )

  const appointments = appointmentsResult.success ? appointmentsResult.data! : []

  // Statistics
  const todayAppointments = appointments.filter(
    (apt) =>
      new Date(apt.startsAt) >= startOfDay(today) &&
      new Date(apt.startsAt) <= endOfDay(today)
  )
  const confirmedCount = appointments.filter((apt) => apt.status === 'confirmed').length
  const completedToday = todayAppointments.filter((apt) => apt.status === 'completed').length

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Termine</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Termine und Buchungen</p>
        </div>
        <Link href="/admin/termine/neu">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Termin
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Heute</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Termine heute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Diese Woche</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">Nächste 7 Tage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bestätigt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground">bestätigte Termine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abgeschlossen</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">heute abgeschlossen</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Termine (Nächste 7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsTable appointments={appointments} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
