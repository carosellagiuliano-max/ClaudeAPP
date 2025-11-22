import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getNotificationTemplateById } from '@/features/admin/actions/notifications'
import { NotificationTemplateForm } from '@/features/admin/components/notification-template-form'
import Link from 'next/link'

interface EditTemplatePageProps {
  params: {
    id: string
  }
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const templateResult = await getNotificationTemplateById(salon.id, params.id)

  if (!templateResult.success || !templateResult.data) {
    redirect('/admin/benachrichtigungen')
  }

  const template = templateResult.data

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
          <h1 className="text-3xl font-bold">Template bearbeiten</h1>
          <p className="text-muted-foreground">{template.name}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Template-Informationen</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationTemplateForm salonId={salon.id} template={template} />
        </CardContent>
      </Card>
    </div>
  )
}
