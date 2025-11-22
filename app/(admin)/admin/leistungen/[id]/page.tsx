import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import {
  getServiceById,
  getServiceCategories,
  getTaxRates,
} from '@/features/admin/actions/services'
import { ServiceForm } from '@/features/admin/components/service-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EditServicePageProps {
  params: {
    id: string
  }
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const [serviceResult, categoriesResult, taxRatesResult] = await Promise.all([
    getServiceById(salon.id, params.id),
    getServiceCategories(salon.id),
    getTaxRates(salon.id),
  ])

  if (!serviceResult.success || !serviceResult.data) {
    redirect('/admin/leistungen')
  }

  const service = serviceResult.data
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
          <h1 className="text-3xl font-bold">Leistung bearbeiten</h1>
          <p className="text-muted-foreground">{service.publicTitle}</p>
        </div>
      </div>

      {/* Form */}
      <ServiceForm
        salonId={salon.id}
        service={service}
        categories={categories}
        taxRates={taxRates}
      />
    </div>
  )
}
