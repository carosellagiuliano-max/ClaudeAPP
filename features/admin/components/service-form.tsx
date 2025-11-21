'use client'

/**
 * Service Form Component
 * Create and edit services
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
import type {
  Service,
  ServiceCategory,
  ServiceInput,
  TaxRate,
} from '../types/services'
import { createService, updateService } from '../actions/services'

interface ServiceFormProps {
  salonId: string
  service?: Service
  categories: ServiceCategory[]
  taxRates: TaxRate[]
}

export function ServiceForm({ salonId, service, categories, taxRates }: ServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<ServiceInput>>({
    categoryId: service?.categoryId || null,
    internalName: service?.internalName || '',
    publicTitle: service?.publicTitle || '',
    slug: service?.slug || '',
    description: service?.description || '',
    basePriceChf: service?.basePriceChf || 0,
    baseDurationMinutes: service?.baseDurationMinutes || 30,
    bufferBeforeMinutes: service?.bufferBeforeMinutes || 0,
    bufferAfterMinutes: service?.bufferAfterMinutes || 0,
    taxRateId: service?.taxRateId || null,
    onlineBookable: service?.onlineBookable ?? true,
    requiresDeposit: service?.requiresDeposit ?? false,
    depositAmountChf: service?.depositAmountChf || undefined,
    imageUrl: service?.imageUrl || '',
    displayOrder: service?.displayOrder || 0,
    seoTitle: service?.seoTitle || '',
    seoDescription: service?.seoDescription || '',
    tags: service?.tags || [],
    isActive: service?.isActive ?? true,
    isFeatured: service?.isFeatured ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = service
        ? await updateService(salonId, service.id, formData)
        : await createService(salonId, formData as ServiceInput)

      if (result.success) {
        router.push('/admin/leistungen')
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

  // Auto-generate slug from public title
  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      publicTitle: value,
      slug: prev.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="internalName">Interner Name *</Label>
              <Input
                id="internalName"
                value={formData.internalName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, internalName: e.target.value }))
                }
                required
                placeholder="z.B. haircut-short"
              />
              <p className="text-xs text-muted-foreground">Nur für interne Verwendung</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategorie</Label>
              <Select
                value={formData.categoryId || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoryId: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicTitle">Öffentlicher Titel *</Label>
            <Input
              id="publicTitle"
              value={formData.publicTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="z.B. Damenhaarschnitt kurz"
            />
            <p className="text-xs text-muted-foreground">
              Dieser Name wird Kunden angezeigt
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              required
              pattern="[a-z0-9-]+"
              placeholder="z.B. damenhaarschnitt-kurz"
            />
            <p className="text-xs text-muted-foreground">
              Nur Kleinbuchstaben, Zahlen und Bindestriche
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              placeholder="Detaillierte Beschreibung der Leistung..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Preis & Dauer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="basePriceChf">Basispreis (CHF) *</Label>
              <Input
                id="basePriceChf"
                type="number"
                step="0.01"
                min="0"
                value={formData.basePriceChf}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    basePriceChf: parseFloat(e.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRateId">Steuersatz</Label>
              <Select
                value={formData.taxRateId || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, taxRateId: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Steuersatz wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {taxRates.map((rate) => (
                    <SelectItem key={rate.id} value={rate.id}>
                      {rate.description} ({rate.ratePercent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="baseDurationMinutes">Dauer (Minuten) *</Label>
              <Input
                id="baseDurationMinutes"
                type="number"
                min="1"
                value={formData.baseDurationMinutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    baseDurationMinutes: parseInt(e.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferBeforeMinutes">Puffer davor (Min)</Label>
              <Input
                id="bufferBeforeMinutes"
                type="number"
                min="0"
                value={formData.bufferBeforeMinutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bufferBeforeMinutes: parseInt(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferAfterMinutes">Puffer danach (Min)</Label>
              <Input
                id="bufferAfterMinutes"
                type="number"
                min="0"
                value={formData.bufferAfterMinutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bufferAfterMinutes: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresDeposit"
                checked={formData.requiresDeposit}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    requiresDeposit: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="requiresDeposit" className="cursor-pointer">
                Anzahlung erforderlich
              </Label>
            </div>

            {formData.requiresDeposit && (
              <div className="space-y-2">
                <Label htmlFor="depositAmountChf">Anzahlungsbetrag (CHF) *</Label>
                <Input
                  id="depositAmountChf"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.depositAmountChf || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      depositAmountChf: parseFloat(e.target.value),
                    }))
                  }
                  required={formData.requiresDeposit}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Bild-URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>

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
                id="onlineBookable"
                checked={formData.onlineBookable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    onlineBookable: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="onlineBookable" className="cursor-pointer">
                Online buchbar
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isFeatured: checked as boolean }))
                }
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">
                Featured (hervorgehoben)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>SEO (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">SEO-Titel</Label>
            <Input
              id="seoTitle"
              value={formData.seoTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))
              }
              maxLength={60}
              placeholder="Max. 60 Zeichen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoDescription">SEO-Beschreibung</Label>
            <Textarea
              id="seoDescription"
              value={formData.seoDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))
              }
              maxLength={160}
              rows={3}
              placeholder="Max. 160 Zeichen"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Wird gespeichert...' : service ? 'Änderungen speichern' : 'Leistung erstellen'}
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
