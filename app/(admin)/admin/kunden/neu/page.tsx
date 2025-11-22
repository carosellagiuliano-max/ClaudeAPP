import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { CustomerForm } from '@/features/admin/components/customer-form'
import Link from 'next/link'

export default async function NewCustomerPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/kunden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neuer Kunde</h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Kunden für Ihr Salon
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Kundeninformationen</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
