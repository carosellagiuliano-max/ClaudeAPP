'use client'

/**
 * Staff Form Component
 * Create and edit staff members
 */

import { useState } from 'react'
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
import type { StaffMember, StaffMemberInput } from '../types/staff'
import { createStaffMember, updateStaffMember } from '../actions/staff'
import {
  POSITION_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from '../types/staff'

interface StaffFormProps {
  salonId: string
  staff?: StaffMember
  profileId?: string // For creating new staff from existing profile
}

export function StaffForm({ salonId, staff, profileId }: StaffFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<StaffMemberInput>>({
    profileId: staff?.profileId || profileId || '',
    staffNumber: staff?.staffNumber || '',
    position: (staff?.position as any) || undefined,
    bio: staff?.bio || '',
    employmentType: (staff?.employmentType as any) || undefined,
    displayName: staff?.displayName || '',
    displayOrder: staff?.displayOrder || 0,
    photoUrl: staff?.photoUrl || '',
    acceptsOnlineBookings: staff?.acceptsOnlineBookings ?? true,
    showInTeamPage: staff?.showInTeamPage ?? true,
    commissionRate: staff?.commissionRate || undefined,
    isActive: staff?.isActive ?? true,
    hiredAt: staff?.hiredAt || '',
    terminatedAt: staff?.terminatedAt || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = staff
        ? await updateStaffMember(salonId, staff.id, formData)
        : await createStaffMember(salonId, formData as StaffMemberInput)

      if (result.success) {
        router.push('/admin/mitarbeiter')
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

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!staff && !profileId && (
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Hinweis:</p>
              <p>
                Mitarbeiter müssen zuerst ein Benutzerkonto haben. Geben Sie die Profil-ID
                des Benutzers ein oder erstellen Sie zuerst einen Benutzer.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profileId">Profil-ID *</Label>
              <Input
                id="profileId"
                value={formData.profileId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, profileId: e.target.value }))
                }
                required
                disabled={!!staff}
                placeholder="UUID des Benutzerprofils"
              />
              {staff && (
                <p className="text-xs text-muted-foreground">
                  Kann nach Erstellung nicht geändert werden
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffNumber">Mitarbeiternummer</Label>
              <Input
                id="staffNumber"
                value={formData.staffNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, staffNumber: e.target.value }))
                }
                placeholder="z.B. EMP001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Anzeigename *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
              }
              required
              placeholder="z.B. Maria Müller"
            />
            <p className="text-xs text-muted-foreground">
              Name wie er Kunden angezeigt wird
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, position: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Position wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">Anstellungsart</Label>
              <Select
                value={formData.employmentType || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, employmentType: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anstellungsart wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografie</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              rows={4}
              placeholder="Öffentliche Biografie für die Team-Seite..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoUrl">Foto-URL</Label>
            <Input
              id="photoUrl"
              type="url"
              value={formData.photoUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, photoUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Anstellungsdetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hiredAt">Eintrittsdatum</Label>
              <Input
                id="hiredAt"
                type="date"
                value={formData.hiredAt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hiredAt: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminatedAt">Austrittsdatum</Label>
              <Input
                id="terminatedAt"
                type="date"
                value={formData.terminatedAt || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, terminatedAt: e.target.value || null }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionRate">Provisionssatz (%)</Label>
            <Input
              id="commissionRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.commissionRate || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  commissionRate: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              placeholder="z.B. 40.00"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Prozentsatz für Provisionsberechnungen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Anzeigeeinstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Anzeigereihenfolge</Label>
            <Input
              id="displayOrder"
              type="number"
              min="0"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  displayOrder: parseInt(e.target.value),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Niedrigere Zahlen werden zuerst angezeigt
            </p>
          </div>

          <div className="space-y-4">
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
                id="acceptsOnlineBookings"
                checked={formData.acceptsOnlineBookings}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    acceptsOnlineBookings: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="acceptsOnlineBookings" className="cursor-pointer">
                Akzeptiert Online-Buchungen
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showInTeamPage"
                checked={formData.showInTeamPage}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    showInTeamPage: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="showInTeamPage" className="cursor-pointer">
                Auf Team-Seite anzeigen
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Wird gespeichert...'
            : staff
              ? 'Änderungen speichern'
              : 'Mitarbeiter erstellen'}
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
