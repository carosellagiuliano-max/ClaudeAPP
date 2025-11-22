import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Star, UserCheck, TrendingUp } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getCustomers } from '@/features/admin/actions/customers'
import { CustomersTable } from '@/features/admin/components/customers-table'
import Link from 'next/link'

export default async function CustomersPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const customersResult = await getCustomers(salon.id, { isActive: true })
  const customers = customersResult.success ? customersResult.data! : []

  // Statistics
  const totalCustomers = customers.length
  const vipCustomers = customers.filter((c) => c.isVip).length
  const withMarketingConsent = customers.filter((c) => c.marketingConsent).length
  const recentCustomers = customers.filter((c) => {
    const createdDate = new Date(c.createdAt)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return createdDate >= thirtyDaysAgo
  }).length

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kunden</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Kunden und deren Informationen
          </p>
        </div>
        <Link href="/admin/kunden/neu">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kunde
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">aktive Kunden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">VIP Kunden</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {totalCustomers > 0
                ? `${((vipCustomers / totalCustomers) * 100).toFixed(1)}% der Kunden`
                : '0% der Kunden'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marketing</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withMarketingConsent}</div>
            <p className="text-xs text-muted-foreground">
              {totalCustomers > 0
                ? `${((withMarketingConsent / totalCustomers) * 100).toFixed(1)}% Zustimmung`
                : '0% Zustimmung'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Neue Kunden</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentCustomers}</div>
            <p className="text-xs text-muted-foreground">in den letzten 30 Tagen</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Kunden</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable customers={customers} salonId={salon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
