import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import { getStaffMemberById } from '@/features/admin/actions/staff'
import { StaffForm } from '@/features/admin/components/staff-form'
import { StaffSkillsManager } from '@/features/admin/components/staff-skills-manager'
import { StaffWorkingHoursManager } from '@/features/admin/components/staff-working-hours-manager'
import { StaffAbsencesManager } from '@/features/admin/components/staff-absences-manager'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface EditStaffPageProps {
  params: {
    id: string
  }
}

export default async function EditStaffPage({ params }: EditStaffPageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const staffResult = await getStaffMemberById(salon.id, params.id)

  if (!staffResult.success || !staffResult.data) {
    redirect('/admin/mitarbeiter')
  }

  const staff = staffResult.data

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/mitarbeiter">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Mitarbeiter bearbeiten</h1>
          <p className="text-muted-foreground">{staff.displayName}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="skills">Fähigkeiten</TabsTrigger>
          <TabsTrigger value="hours">Arbeitszeiten</TabsTrigger>
          <TabsTrigger value="absences">Abwesenheiten</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <StaffForm salonId={salon.id} staff={staff} />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <StaffSkillsManager salonId={salon.id} staff={staff} />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <StaffWorkingHoursManager salonId={salon.id} staffId={staff.id} />
        </TabsContent>

        <TabsContent value="absences" className="space-y-6">
          <StaffAbsencesManager salonId={salon.id} staffId={staff.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
