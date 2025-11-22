'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppointmentForm } from '@/features/admin/components/appointment-form'
import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewAppointmentPage() {
  const [salonId, setSalonId] = useState<string>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Load salon and customers
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      // Get default salon
      const { data: salons } = await supabase.from('salons').select('id').limit(1).single()

      if (salons) {
        setSalonId(salons.id)

        // Load customers for this salon
        const { data: customersData } = await supabase
          .from('customers')
          .select(
            `
            id,
            customer_number,
            profile:profiles!profile_id(
              first_name,
              last_name,
              email,
              phone
            )
          `
          )
          .eq('salon_id', salons.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (customersData) {
          setCustomers(customersData)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const getCustomerName = (customer: any) => {
    const { first_name, last_name, email } = customer.profile
    if (first_name && last_name) {
      return `${first_name} ${last_name}`
    }
    return email
  }

  const filteredCustomers = customers.filter((customer) => {
    const name = getCustomerName(customer).toLowerCase()
    const email = customer.profile.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || email.includes(search)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Wird geladen...</p>
      </div>
    )
  }

  if (!selectedCustomerId) {
    return (
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/termine">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Neuer Termin</h1>
            <p className="text-muted-foreground">Wählen Sie zuerst einen Kunden aus</p>
          </div>
        </div>

        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Kunde auswählen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Kunde suchen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nach Name oder E-Mail suchen..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kunden ({filteredCustomers.length})</Label>
              <div className="max-h-[400px] overflow-y-auto space-y-2 rounded-md border p-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Keine Kunden gefunden.</p>
                    {searchTerm && <p className="text-sm">Versuchen Sie eine andere Suche.</p>}
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{getCustomerName(customer)}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.profile.email}
                      </div>
                      {customer.customer_number && (
                        <div className="text-xs text-muted-foreground">
                          Kundennr: {customer.customer_number}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/termine">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neuer Termin</h1>
          <p className="text-muted-foreground">
            Für: {selectedCustomer ? getCustomerName(selectedCustomer) : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedCustomerId('')}
          className="ml-auto"
        >
          Kunde ändern
        </Button>
      </div>

      {/* Form */}
      <AppointmentForm salonId={salonId} customerId={selectedCustomerId} />
    </div>
  )
}
