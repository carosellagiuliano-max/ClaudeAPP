'use client'

/**
 * Product Categories Management Page
 * Manage product categories
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import type { ProductCategory, ProductCategoryInput } from '@/features/admin/types/products'
import { getProductCategories, createProductCategory } from '@/features/admin/actions/products'
import { getDefaultSalon } from '@/lib/db/queries'

export default function CategoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [salonId, setSalonId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<ProductCategoryInput>>({
    name: '',
    description: '',
    slug: '',
    displayOrder: 0,
    isActive: true,
  })

  // Load salon and categories
  useEffect(() => {
    const loadData = async () => {
      const salon = await getDefaultSalon()
      if (!salon) return

      setSalonId(salon.id)

      const result = await getProductCategories(salon.id)
      if (result.success && result.data) {
        setCategories(result.data)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createProductCategory(salonId, formData as ProductCategoryInput)

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          slug: '',
          displayOrder: 0,
          isActive: true,
        })
        setShowForm(false)

        // Reload categories
        const categoriesResult = await getProductCategories(salonId)
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data)
        }

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

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/produkte">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Produkt-Kategorien</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihre Produktkategorien</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Kategorie
          </Button>
        )}
      </div>

      {/* Category Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        slug: generateSlug(name),
                      }))
                    }}
                    required
                    placeholder="z.B. Haarpflege"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    required
                    placeholder="z.B. haarpflege"
                    pattern="[a-z0-9-]+"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nur Kleinbuchstaben, Zahlen und Bindestriche
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Kategoriebeschreibung..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Anzeigereihenfolge</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) }))
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-end space-x-2 pb-2">
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
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Wird gespeichert...' : 'Kategorie erstellen'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setError(null)
                  }}
                  disabled={loading}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Kategorien ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Noch keine Kategorien. Erstellen Sie Ihre erste Kategorie.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Reihenfolge</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1 py-0.5 text-sm">
                          {category.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {category.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{category.displayOrder}</TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? 'default' : 'secondary'}>
                          {category.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
