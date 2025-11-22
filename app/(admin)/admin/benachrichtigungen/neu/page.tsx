import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { NotificationTemplateForm } from '@/features/admin/components/notification-template-form'
import type { NotificationTemplateType } from '@/features/admin/types/notifications'
import Link from 'next/link'

interface NewTemplatePageProps {
  searchParams: {
    type?: NotificationTemplateType
  }
}

export default async function NewTemplatePage({ searchParams }: NewTemplatePageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/benachrichtigungen">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neues Template</h1>
          <p className="text-muted-foreground">
            Erstellen Sie ein neues E-Mail-Benachrichtigungs-Template
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Template-Informationen</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationTemplateForm salonId={salon.id} defaultType={searchParams.type} />
        </CardContent>
      </Card>
    </div>
  )
}
