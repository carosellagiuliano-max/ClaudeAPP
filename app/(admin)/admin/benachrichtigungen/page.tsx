import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Mail, Edit, Eye, Star } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getNotificationTemplates } from '@/features/admin/actions/notifications'
import {
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_DESCRIPTIONS,
  type NotificationTemplateType,
} from '@/features/admin/types/notifications'
import Link from 'next/link'

export default async function NotificationTemplatesPage() {
  const salon = await getDefaultSalon()

  if (!salon) {
    redirect('/admin')
  }

  const templatesResult = await getNotificationTemplates(salon.id)
  const templates = templatesResult.success ? templatesResult.data! : []

  // Group templates by type
  const templatesByType = templates.reduce(
    (acc, template) => {
      if (!acc[template.templateType]) {
        acc[template.templateType] = []
      }
      acc[template.templateType].push(template)
      return acc
    },
    {} as Record<NotificationTemplateType, typeof templates>
  )

  // Get all template types
  const allTypes = Object.keys(TEMPLATE_TYPE_LABELS) as NotificationTemplateType[]

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benachrichtigungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre E-Mail-Templates und Benachrichtigungen
          </p>
        </div>
        <Link href="/admin/benachrichtigungen/neu">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Template
          </Button>
        </Link>
      </div>

      {/* Templates by Type */}
      <div className="space-y-6">
        {allTypes.map((type) => {
          const typeTemplates = templatesByType[type] || []
          const defaultTemplate = typeTemplates.find((t) => t.isDefault)
          const otherTemplates = typeTemplates.filter((t) => !t.isDefault)

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{TEMPLATE_TYPE_LABELS[type]}</CardTitle>
                      <CardDescription>{TEMPLATE_TYPE_DESCRIPTIONS[type]}</CardDescription>
                    </div>
                  </div>
                  <Link href={`/admin/benachrichtigungen/neu?type=${type}`}>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-3 w-3" />
                      Template hinzufügen
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {typeTemplates.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Noch kein Template für diesen Typ.{' '}
                      <Link
                        href={`/admin/benachrichtigungen/neu?type=${type}`}
                        className="text-primary hover:underline"
                      >
                        Jetzt erstellen
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Default Template */}
                    {defaultTemplate && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <h4 className="font-medium">{defaultTemplate.name}</h4>
                              <Badge variant="default">Standard</Badge>
                              {defaultTemplate.isActive ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Aktiv
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inaktiv</Badge>
                              )}
                            </div>
                            {defaultTemplate.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {defaultTemplate.description}
                              </p>
                            )}
                            <p className="mt-2 text-sm">
                              <span className="font-medium">Betreff:</span>{' '}
                              {defaultTemplate.subject}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/admin/benachrichtigungen/${defaultTemplate.id}/vorschau`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Vorschau
                              </Button>
                            </Link>
                            <Link href={`/admin/benachrichtigungen/${defaultTemplate.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other Templates */}
                    {otherTemplates.map((template) => (
                      <div key={template.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.name}</h4>
                              {template.isActive ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Aktiv
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inaktiv</Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            )}
                            <p className="mt-2 text-sm">
                              <span className="font-medium">Betreff:</span> {template.subject}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/admin/benachrichtigungen/${template.id}/vorschau`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Vorschau
                              </Button>
                            </Link>
                            <Link href={`/admin/benachrichtigungen/${template.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
