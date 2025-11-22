'use client'

/**
 * Notification Template Form Component
 * Create and edit notification templates with variable picker
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Code, Eye, Send } from 'lucide-react'
import type {
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateType,
} from '../types/notifications'
import {
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_VARIABLES_BY_TYPE,
  DEFAULT_TEMPLATES,
} from '../types/notifications'
import {
  createNotificationTemplate,
  updateNotificationTemplate,
  sendTestEmail,
} from '../actions/notifications'

interface NotificationTemplateFormProps {
  salonId: string
  template?: NotificationTemplate
  defaultType?: NotificationTemplateType
}

export function NotificationTemplateForm({
  salonId,
  template,
  defaultType,
}: NotificationTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showTestEmail, setShowTestEmail] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<NotificationTemplateInput>>({
    templateType: template?.templateType || defaultType || 'booking_confirmation',
    name: template?.name || '',
    description: template?.description || '',
    subject: template?.subject || '',
    bodyHtml: template?.bodyHtml || '',
    bodyText: template?.bodyText || '',
    isActive: template?.isActive ?? true,
    isDefault: template?.isDefault ?? false,
  })

  const [cursorPosition, setCursorPosition] = useState<{
    field: 'subject' | 'bodyHtml' | 'bodyText'
    position: number
  } | null>(null)

  const availableVariables =
    TEMPLATE_VARIABLES_BY_TYPE[formData.templateType as NotificationTemplateType] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = template
        ? await updateNotificationTemplate(salonId, template.id, formData)
        : await createNotificationTemplate(salonId, formData as NotificationTemplateInput)

      if (result.success) {
        setSuccess('Template erfolgreich gespeichert')
        setTimeout(() => {
          router.push('/admin/benachrichtigungen')
          router.refresh()
        }, 1500)
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultTemplate = () => {
    const defaultTemplate =
      DEFAULT_TEMPLATES[formData.templateType as NotificationTemplateType]
    if (defaultTemplate) {
      setFormData((prev) => ({
        ...prev,
        subject: defaultTemplate.subject,
        bodyHtml: defaultTemplate.bodyHtml,
        bodyText: defaultTemplate.bodyText,
      }))
    }
  }

  const insertVariable = (variable: string, field: 'subject' | 'bodyHtml' | 'bodyText') => {
    const variableText = `{{${variable}}}`
    const currentValue = formData[field] || ''

    let newValue: string
    if (cursorPosition && cursorPosition.field === field) {
      // Insert at cursor position
      newValue =
        currentValue.slice(0, cursorPosition.position) +
        variableText +
        currentValue.slice(cursorPosition.position)
    } else {
      // Append at end
      newValue = currentValue + variableText
    }

    setFormData((prev) => ({ ...prev, [field]: newValue }))
  }

  const handleSendTestEmail = async () => {
    if (!testEmail || !template) return

    setSendingTest(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await sendTestEmail(salonId, template.id, testEmail)
      if (result.success) {
        setSuccess(`Test-E-Mail an ${testEmail} gesendet`)
        setTestEmail('')
        setShowTestEmail(false)
      } else {
        setError(result.error || 'Fehler beim Senden')
      }
    } catch (err) {
      setError('Fehler beim Senden der Test-E-Mail')
    } finally {
      setSendingTest(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">{success}</div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="templateType">Template-Typ *</Label>
              <Select
                value={formData.templateType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, templateType: value as any }))
                }
                disabled={!!template}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template && (
                <p className="text-xs text-muted-foreground">
                  Typ kann nach Erstellung nicht geändert werden
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Template-Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="z.B. Buchungsbestätigung Premium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Beschreibung des Templates..."
            />
          </div>

          {!template && (
            <Button type="button" variant="outline" onClick={loadDefaultTemplate}>
              Standard-Template laden
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Template Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template-Inhalt</CardTitle>
              <CardDescription>
                Verwenden Sie Variablen im Format {'{{'} variable_name {'}}'}
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Code className="mr-2 h-4 w-4" />
                  Variablen
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Verfügbare Variablen</h4>
                  <p className="text-xs text-muted-foreground">
                    Klicken Sie auf eine Variable, um sie einzufügen
                  </p>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {availableVariables.map((variable) => (
                      <div
                        key={variable.key}
                        className="space-y-1 rounded-md border p-2 hover:bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-mono">
                            {'{{'} {variable.key} {'}}'}
                          </code>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertVariable(variable.key, 'subject')}
                            >
                              Betreff
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => insertVariable(variable.key, 'bodyHtml')}
                            >
                              HTML
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                        <p className="text-xs">
                          <span className="font-medium">Beispiel:</span> {variable.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">E-Mail-Betreff *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
              onFocus={(e) =>
                setCursorPosition({
                  field: 'subject',
                  position: e.target.selectionStart || 0,
                })
              }
              onClick={(e) =>
                setCursorPosition({
                  field: 'subject',
                  position: e.currentTarget.selectionStart || 0,
                })
              }
              required
              placeholder="z.B. Ihre Buchung bei {{salon_name}}"
            />
          </div>

          <Tabs defaultValue="html" className="w-full">
            <TabsList>
              <TabsTrigger value="html">HTML Version</TabsTrigger>
              <TabsTrigger value="text">Text Version</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="space-y-2">
              <Label htmlFor="bodyHtml">E-Mail-Inhalt (HTML) *</Label>
              <Textarea
                id="bodyHtml"
                value={formData.bodyHtml}
                onChange={(e) => setFormData((prev) => ({ ...prev, bodyHtml: e.target.value }))}
                onFocus={(e) =>
                  setCursorPosition({
                    field: 'bodyHtml',
                    position: e.target.selectionStart || 0,
                  })
                }
                onClick={(e) =>
                  setCursorPosition({
                    field: 'bodyHtml',
                    position: e.currentTarget.selectionStart || 0,
                  })
                }
                rows={20}
                className="font-mono text-sm"
                required
                placeholder="HTML-Template..."
              />
            </TabsContent>

            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="bodyText">E-Mail-Inhalt (Text)</Label>
              <Textarea
                id="bodyText"
                value={formData.bodyText}
                onChange={(e) => setFormData((prev) => ({ ...prev, bodyText: e.target.value }))}
                onFocus={(e) =>
                  setCursorPosition({
                    field: 'bodyText',
                    position: e.target.selectionStart || 0,
                  })
                }
                onClick={(e) =>
                  setCursorPosition({
                    field: 'bodyText',
                    position: e.currentTarget.selectionStart || 0,
                  })
                }
                rows={20}
                className="font-mono text-sm"
                placeholder="Text-Version für E-Mail-Clients ohne HTML-Support..."
              />
              <p className="text-xs text-muted-foreground">
                Optional: Fallback für E-Mail-Clients ohne HTML-Unterstützung
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Template aktiv (wird für Benachrichtigungen verwendet)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isDefault: checked as boolean }))
              }
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              Als Standard-Template für diesen Typ festlegen
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Wird gespeichert...'
            : template
              ? 'Änderungen speichern'
              : 'Template erstellen'}
        </Button>

        {template && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/benachrichtigungen/${template.id}/vorschau`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Vorschau
            </Button>

            {!showTestEmail ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTestEmail(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Test-E-Mail senden
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-64"
                />
                <Button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? 'Sendet...' : 'Senden'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowTestEmail(false)
                    setTestEmail('')
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </>
        )}

        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Zurück
        </Button>
      </div>
    </form>
  )
}
