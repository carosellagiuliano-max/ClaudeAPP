'use client'

/**
 * Product Form Component
 * Create and edit products
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
import type {
  ProductWithCategory,
  ProductInput,
  ProductCategory,
  ProductBrand,
} from '../types/products'
import { createProduct, updateProduct } from '../actions/products'
import { getProductCategories, getProductBrands } from '../actions/products'
import { PRODUCT_UNIT_LABELS } from '../types/products'

interface ProductFormProps {
  salonId: string
  product?: ProductWithCategory
}

export function ProductForm({ salonId, product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])

  // Form state
  const [formData, setFormData] = useState<Partial<ProductInput>>({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || undefined,
    brandId: product?.brandId || undefined,
    retailPriceChf: product?.retailPriceChf || '',
    costPriceChf: product?.costPriceChf || '',
    taxRate: product?.taxRate || '8.1',
    stockQuantity: product?.stockQuantity || 0,
    lowStockThreshold: product?.lowStockThreshold || undefined,
    unit: (product?.unit as any) || 'piece',
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    imageUrl: product?.imageUrl || '',
    tags: product?.tags || [],
  })

  // Load categories and brands
  useEffect(() => {
    const loadData = async () => {
      const [categoriesResult, brandsResult] = await Promise.all([
        getProductCategories(salonId),
        getProductBrands(salonId),
      ])

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.filter((c) => c.isActive))
      }

      if (brandsResult.success && brandsResult.data) {
        setBrands(brandsResult.data.filter((b) => b.isActive))
      }
    }
    loadData()
  }, [salonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = product
        ? await updateProduct(salonId, product.id, formData)
        : await createProduct(salonId, formData as ProductInput)

      if (result.success) {
        router.push('/admin/produkte')
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
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Produktname *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              placeholder="z.B. Shampoo Professional 500ml"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Produktbeschreibung..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder="z.B. SHP-PRO-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                placeholder="z.B. 1234567890123"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategorie</Label>
              <Select
                value={formData.categoryId || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoryId: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Kategorie</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandId">Marke</Label>
              <Select
                value={formData.brandId || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, brandId: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Marke wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Marke</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Preise & Steuern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="retailPriceChf">Verkaufspreis (CHF) *</Label>
              <Input
                id="retailPriceChf"
                type="number"
                step="0.01"
                min="0"
                value={formData.retailPriceChf}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, retailPriceChf: e.target.value }))
                }
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPriceChf">Einkaufspreis (CHF)</Label>
              <Input
                id="costPriceChf"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPriceChf}
                onChange={(e) => setFormData((prev) => ({ ...prev, costPriceChf: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">MwSt. (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
                placeholder="8.1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Lagerbestand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Bestand</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stockQuantity: parseInt(e.target.value) }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Mindestbestand</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={formData.lowStockThreshold || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lowStockThreshold: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Warnung bei Unterschreitung
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Einheit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv (im Shop sichtbar)
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
              Hervorgehoben (auf Startseite anzeigen)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Wird gespeichert...'
            : product
              ? 'Änderungen speichern'
              : 'Produkt erstellen'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
