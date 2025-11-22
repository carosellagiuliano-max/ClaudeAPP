import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getProductById } from '@/features/admin/actions/products'
import { ProductForm } from '@/features/admin/components/product-form'
import Link from 'next/link'

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const productResult = await getProductById(salon.id, params.id)

  if (!productResult.success || !productResult.data) {
    redirect('/admin/produkte')
  }

  const product = productResult.data

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/produkte/${product.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Produkt bearbeiten</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Produktinformationen</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm salonId={salon.id} product={product} />
        </CardContent>
      </Card>
    </div>
  )
}
