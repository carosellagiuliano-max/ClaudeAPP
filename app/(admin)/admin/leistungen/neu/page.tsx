import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import { getServiceCategories, getTaxRates } from '@/features/admin/actions/services'
import { ServiceForm } from '@/features/admin/components/service-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewServicePage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const [categoriesResult, taxRatesResult] = await Promise.all([
    getServiceCategories(salon.id),
    getTaxRates(salon.id),
  ])

  const categories = categoriesResult.success ? categoriesResult.data! : []
  const taxRates = taxRatesResult.success ? taxRatesResult.data! : []

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/leistungen">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neue Leistung</h1>
          <p className="text-muted-foreground">
            Erstellen Sie eine neue Dienstleistung für Ihren Salon
          </p>
        </div>
      </div>

      {/* Form */}
      <ServiceForm salonId={salon.id} categories={categories} taxRates={taxRates} />
    </div>
  )
}
