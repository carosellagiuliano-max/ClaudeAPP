import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { getProducts, getFeaturedProducts } from '@/features/shop/actions'
import { ProductCard } from '@/features/shop/components/product-card'
import { getDefaultSalon } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Shop - Haarpflege & Styling Produkte' }

export default async function ShopPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    return (
      <div className="container py-16">
        <p className="text-destructive">Salon nicht gefunden</p>
      </div>
    )
  }

  const [featuredProducts, allProducts] = await Promise.all([
    getFeaturedProducts(salon.id),
    getProducts(salon.id),
  ])

  return (
    <div className="container py-16">
      <div className="mb-12">
        <Badge variant="secondary" className="mb-4">Shop</Badge>
        <h1 className="mb-4 text-4xl font-bold">Unser Shop</h1>
        <p className="text-lg text-muted-foreground">
          Premium Haarpflege- und Styling-Produkte für zu Hause
        </p>
      </div>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold">Empfohlene Produkte</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                salonId={salon.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Products */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">Alle Produkte</h2>
        {allProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              Derzeit sind keine Produkte verfügbar.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                salonId={salon.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
