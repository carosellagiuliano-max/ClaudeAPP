import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Scissors, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getServices, getServiceCategories } from '@/features/admin/actions/services'
import { ServicesTable } from '@/features/admin/components/services-table'
import Link from 'next/link'

export default async function ServicesPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const [servicesResult, categoriesResult] = await Promise.all([
    getServices(salon.id),
    getServiceCategories(salon.id),
  ])

  const services = servicesResult.success ? servicesResult.data! : []
  const categories = categoriesResult.success ? categoriesResult.data! : []

  // Statistics
  const activeServices = services.filter((s) => s.isActive).length
  const onlineBookable = services.filter((s) => s.onlineBookable && s.isActive).length
  const totalCategories = categories.filter((c) => c.isActive).length

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leistungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Dienstleistungen und Kategorien</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/leistungen/kategorien">
            <Button variant="outline">
              <Scissors className="mr-2 h-4 w-4" />
              Kategorien
            </Button>
          </Link>
          <Link href="/admin/leistungen/neu">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Leistung
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Leistungen</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeServices}</div>
            <p className="text-xs text-muted-foreground">von {services.length} gesamt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online buchbar</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineBookable}</div>
            <p className="text-xs text-muted-foreground">im Online-Booking verfügbar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kategorien</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">aktive Kategorien</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Leistungen</CardTitle>
        </CardHeader>
        <CardContent>
          <ServicesTable services={services} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
