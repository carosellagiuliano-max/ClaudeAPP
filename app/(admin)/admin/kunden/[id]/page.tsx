import { redirect } from 'next/navigation'
import { getDefaultSalon } from '@/lib/db/queries'
import { getCustomerById } from '@/features/admin/actions/customers'
import { CustomerDetails } from '@/features/admin/components/customer-details'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface CustomerDetailPageProps {
  params: {
    id: string
  }
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const customerResult = await getCustomerById(salon.id, params.id)

  if (!customerResult.success || !customerResult.data) {
    redirect('/admin/kunden')
  }

  const customer = customerResult.data

  const getCustomerName = () => {
    const { firstName, lastName } = customer.profile
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    return customer.profile.email
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/kunden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Kundendetails</h1>
          <p className="text-muted-foreground">{getCustomerName()}</p>
        </div>
      </div>

      {/* Details */}
      <CustomerDetails customer={customer} salonId={salon.id} />
    </div>
  )
}
