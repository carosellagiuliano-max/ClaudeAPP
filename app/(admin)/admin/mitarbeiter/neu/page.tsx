import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import { StaffForm } from '@/features/admin/components/staff-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewStaffPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

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
          <h1 className="text-3xl font-bold">Neuer Mitarbeiter</h1>
          <p className="text-muted-foreground">
            Fügen Sie einen neuen Mitarbeiter zu Ihrem Team hinzu
          </p>
        </div>
      </div>

      {/* Form */}
      <StaffForm salonId={salon.id} />
    </div>
  )
}
