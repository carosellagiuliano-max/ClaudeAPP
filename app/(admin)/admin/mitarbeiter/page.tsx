import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, UserCheck, Calendar } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getStaffMembers } from '@/features/admin/actions/staff'
import { StaffTable } from '@/features/admin/components/staff-table'
import Link from 'next/link'

export default async function StaffPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const staffResult = await getStaffMembers(salon.id)
  const staff = staffResult.success ? staffResult.data! : []

  // Statistics
  const activeStaff = staff.filter((s) => s.isActive).length
  const bookableStaff = staff.filter((s) => s.acceptsOnlineBookings && s.isActive).length

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mitarbeiter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihr Team und deren Fähigkeiten</p>
        </div>
        <Link href="/admin/mitarbeiter/neu">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Mitarbeiter
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Mitarbeiter</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaff}</div>
            <p className="text-xs text-muted-foreground">von {staff.length} gesamt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Buchbar</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookableStaff}</div>
            <p className="text-xs text-muted-foreground">akzeptieren Online-Buchungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team-Seite</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => s.showInTeamPage && s.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">auf der Website sichtbar</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Mitarbeiter</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTable staff={staff} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
