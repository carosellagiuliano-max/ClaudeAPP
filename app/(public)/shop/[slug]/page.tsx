import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getProductBySlug } from '@/features/shop/actions'
import { AddToCartForm } from '@/features/shop/components/add-to-cart-form'
import { getDefaultSalon } from '@/lib/db/queries'
import { formatCurrency } from '@/lib/utils'
import { Package, Truck, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ProductPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const salon = await getDefaultSalon()
  if (!salon) return { title: 'Produkt nicht gefunden' }

  const product = await getProductBySlug(salon.id, params.slug)
  if (!product) return { title: 'Produkt nicht gefunden' }

  return {
    title: `${product.name} - Shop`,
    description: product.shortDescription || product.description || `${product.name} online kaufen`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    return notFound()
  }

  const product = await getProductBySlug(salon.id, params.slug)

  if (!product) {
    return notFound()
  }

  // Determine current price
  const currentPrice = product.salePriceChf || product.basePriceChf
  const hasDiscount = product.salePriceChf && product.salePriceChf < product.basePriceChf

  // Check stock
  const inStock = !product.trackInventory || product.stockQuantity > 0 || product.allowBackorder
  const lowStock = product.trackInventory && product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0

  // Primary and additional images
  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0]
  const additionalImages = product.images?.filter(img => !img.isPrimary) || []

  return (
    <div className="container py-8">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/shop">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Shop
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          {/* Primary Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {primaryImage ? (
              <Image
                src={primaryImage.imageUrl}
                alt={primaryImage.altText || product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.isFeatured && (
                <Badge variant="default">Empfohlen</Badge>
              )}
              {hasDiscount && (
                <Badge variant="destructive">Sale</Badge>
              )}
              {lowStock && (
                <Badge variant="secondary">Nur noch {product.stockQuantity}</Badge>
              )}
              {!inStock && (
                <Badge variant="secondary">Ausverkauft</Badge>
              )}
            </div>
          </div>

          {/* Additional Images */}
          {additionalImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {additionalImages.slice(0, 4).map(image => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                  <Image
                    src={image.imageUrl}
                    alt={image.altText || product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category */}
          {product.categoryName && (
            <Badge variant="outline">{product.categoryName}</Badge>
          )}

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.brand && (
              <p className="mt-2 text-lg text-muted-foreground">{product.brand}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xl text-muted-foreground line-through">
                {formatCurrency(product.basePriceChf)}
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.shortDescription && (
            <p className="text-lg">{product.shortDescription}</p>
          )}

          {/* Add to Cart Form */}
          <AddToCartForm
            product={product}
            salonId={salon.id}
            inStock={inStock}
          />

          {/* Features */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <span>Kostenloser Versand ab CHF 50</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span>30 Tage Rückgaberecht</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span>Lieferung in 2-4 Werktagen</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2 border-t pt-6">
              <h2 className="text-xl font-semibold">Produktbeschreibung</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                {product.description}
              </div>
            </div>
          )}

          {/* Product Details */}
          <div className="space-y-2 border-t pt-6">
            <h2 className="text-xl font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              {product.sku && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Artikelnummer:</dt>
                  <dd className="font-medium">{product.sku}</dd>
                </div>
              )}
              {product.manufacturer && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Hersteller:</dt>
                  <dd className="font-medium">{product.manufacturer}</dd>
                </div>
              )}
              {product.trackInventory && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Verfügbarkeit:</dt>
                  <dd className="font-medium">
                    {inStock ? (
                      <span className="text-green-600">Auf Lager</span>
                    ) : (
                      <span className="text-destructive">Ausverkauft</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
