'use client'

/**
 * Template Preview Page
 * Preview notification templates with sample data
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Eye, Code } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import { getNotificationTemplateById } from '@/features/admin/actions/notifications'
import type { NotificationTemplate } from '@/features/admin/types/notifications'
import { TEMPLATE_VARIABLES_BY_TYPE } from '@/features/admin/types/notifications'
import Link from 'next/link'

interface TemplatePreviewPageProps {
  params: {
    id: string
  }
}

export default function TemplatePreviewPage({ params }: TemplatePreviewPageProps) {
  const router = useRouter()
  const [template, setTemplate] = useState<NotificationTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')

  useEffect(() => {
    const loadTemplate = async () => {
      const salon = await getDefaultSalon()
      if (!salon) {
        router.push('/admin')
        return
      }

      const result = await getNotificationTemplateById(salon.id, params.id)
      if (result.success && result.data) {
        setTemplate(result.data)
        renderPreview(result.data)
      } else {
        router.push('/admin/benachrichtigungen')
      }
      setLoading(false)
    }

    loadTemplate()
  }, [params.id, router])

  const renderPreview = (template: NotificationTemplate) => {
    // Get sample data for this template type
    const variables = TEMPLATE_VARIABLES_BY_TYPE[template.templateType]
    const sampleData: Record<string, string> = {}

    variables.forEach((variable) => {
      sampleData[variable.key] = variable.example
    })

    // Replace variables in subject
    let renderedSubject = template.subject
    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      renderedSubject = renderedSubject.replace(regex, value)
    }

    // Replace variables in HTML
    let renderedHtml = template.bodyHtml
    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      renderedHtml = renderedHtml.replace(regex, value)
    }

    // Replace variables in text
    let renderedText = template.bodyText || ''
    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      renderedText = renderedText.replace(regex, value)
    }

    setPreviewSubject(renderedSubject)
    setPreviewHtml(renderedHtml)
    setPreviewText(renderedText)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center p-8">
        <p className="text-muted-foreground">Lädt Vorschau...</p>
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/benachrichtigungen">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Template-Vorschau</h1>
            <p className="text-muted-foreground">{template.name}</p>
          </div>
        </div>
        <Link href={`/admin/benachrichtigungen/${template.id}`}>
          <Button variant="outline">Template bearbeiten</Button>
        </Link>
      </div>

      {/* Subject Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Betreff</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{previewSubject}</p>
        </CardContent>
      </Card>

      {/* Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Vorschau</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList>
              <TabsTrigger value="preview">
                <Eye className="mr-2 h-4 w-4" />
                HTML Vorschau
              </TabsTrigger>
              <TabsTrigger value="html">
                <Code className="mr-2 h-4 w-4" />
                HTML Code
              </TabsTrigger>
              {template.bodyText && <TabsTrigger value="text">Text Version</TabsTrigger>}
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="rounded-md border bg-white p-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </TabsContent>

            <TabsContent value="html" className="mt-4">
              <div className="rounded-md border bg-muted p-4">
                <pre className="max-h-[600px] overflow-auto text-xs">
                  <code>{previewHtml}</code>
                </pre>
              </div>
            </TabsContent>

            {template.bodyText && (
              <TabsContent value="text" className="mt-4">
                <div className="rounded-md border bg-muted p-4">
                  <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap text-sm">
                    {previewText}
                  </pre>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Sample Data Info */}
      <Card>
        <CardHeader>
          <CardTitle>Hinweis zur Vorschau</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Diese Vorschau verwendet Beispieldaten. In tatsächlichen E-Mails werden die Variablen
            durch echte Kundendaten ersetzt.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
