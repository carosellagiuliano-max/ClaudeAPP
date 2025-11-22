'use client'

/**
 * Customer Form Component
 * Create and edit customers
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer, CustomerInput } from '../types/customers'
import { createCustomer, updateCustomer } from '../actions/customers'
import { getStaffMembers } from '../actions/staff'
import { GENDER_LABELS, SOURCE_LABELS } from '../types/customers'

interface CustomerFormProps {
  salonId: string
  customer?: Customer
  profileId?: string
}

export function CustomerForm({ salonId, customer, profileId }: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState<Partial<CustomerInput>>({
    profileId: customer?.profileId || profileId || '',
    customerNumber: customer?.customerNumber || '',
    birthday: customer?.birthday || '',
    gender: (customer?.gender as any) || undefined,
    preferredStaffId: customer?.preferredStaffId || undefined,
    notes: customer?.notes || '',
    source: customer?.source || undefined,
    referralCode: customer?.referralCode || '',
    marketingConsent: customer?.marketingConsent ?? false,
    isActive: customer?.isActive ?? true,
    isVip: customer?.isVip ?? false,
  })

  // Load staff
  useEffect(() => {
    const loadStaff = async () => {
      const result = await getStaffMembers(salonId)
      if (result.success && result.data) {
        setStaff(result.data.filter((s) => s.isActive))
      }
    }
    loadStaff()
  }, [salonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = customer
        ? await updateCustomer(salonId, customer.id, formData)
        : await createCustomer(salonId, formData as CustomerInput)

      if (result.success) {
        router.push('/admin/kunden')
        router.refresh()
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Profile ID (for new customers) */}
      {!customer && (
        <Card>
          <CardHeader>
            <CardTitle>Profil-ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="profileId">Profil-ID *</Label>
              <Input
                id="profileId"
                value={formData.profileId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, profileId: e.target.value }))
                }
                required
                disabled={!!customer}
                placeholder="UUID des Benutzerprofils"
              />
              <p className="text-xs text-muted-foreground">
                Der Kunde muss zuerst ein Benutzerkonto haben
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerNumber">Kundennummer</Label>
              <Input
                id="customerNumber"
                value={formData.customerNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customerNumber: e.target.value }))
                }
                placeholder="z.B. K001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Geburtstag</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, birthday: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select
                value={formData.gender || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Geschlecht wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredStaffId">Bevorzugter Mitarbeiter</Label>
              <Select
                value={formData.preferredStaffId || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, preferredStaffId: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Kein bevorzugter Mitarbeiter</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing & Source */}
      <Card>
        <CardHeader>
          <CardTitle>Quelle & Marketing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source">Quelle</Label>
              <Select
                value={formData.source || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, source: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Quelle wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Empfehlungscode</Label>
              <Input
                id="referralCode"
                value={formData.referralCode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, referralCode: e.target.value }))
                }
                placeholder="z.B. FRIEND2024"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="marketingConsent"
                checked={formData.marketingConsent}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    marketingConsent: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="marketingConsent" className="cursor-pointer">
                Marketing-Einwilligung
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Interne Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={4}
              placeholder="Notizen zum Kunden..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isVip"
              checked={formData.isVip}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isVip: checked as boolean }))
              }
            />
            <Label htmlFor="isVip" className="cursor-pointer">
              VIP Kunde
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Wird gespeichert...'
            : customer
              ? 'Änderungen speichern'
              : 'Kunde erstellen'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
