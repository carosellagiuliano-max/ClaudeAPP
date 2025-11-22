'use server'

/**
 * Notification Template Server Actions
 * CRUD operations for email templates
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateType,
} from '../types/notifications'
import { notificationTemplateSchema } from '../types/notifications'

// ============================================================
// TEMPLATES
// ============================================================

/**
 * Get all templates for a salon
 */
export async function getNotificationTemplates(
  salonId: string
): Promise<ApiResponse<NotificationTemplate[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('salon_id', salonId)
      .order('template_type', { ascending: true })
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data.map((template) => ({
        id: template.id,
        salonId: template.salon_id,
        templateType: template.template_type,
        name: template.name,
        description: template.description,
        subject: template.subject,
        bodyHtml: template.body_html,
        bodyText: template.body_text,
        isActive: template.is_active,
        isDefault: template.is_default,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching notification templates:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Templates',
    }
  }
}

/**
 * Get a single template by ID
 */
export async function getNotificationTemplateById(
  salonId: string,
  templateId: string
): Promise<ApiResponse<NotificationTemplate>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: template.id,
        salonId: template.salon_id,
        templateType: template.template_type,
        name: template.name,
        description: template.description,
        subject: template.subject,
        bodyHtml: template.body_html,
        bodyText: template.body_text,
        isActive: template.is_active,
        isDefault: template.is_default,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching notification template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des Templates',
    }
  }
}

/**
 * Get templates by type
 */
export async function getNotificationTemplatesByType(
  salonId: string,
  templateType: NotificationTemplateType
): Promise<ApiResponse<NotificationTemplate[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('salon_id', salonId)
      .eq('template_type', templateType)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data.map((template) => ({
        id: template.id,
        salonId: template.salon_id,
        templateType: template.template_type,
        name: template.name,
        description: template.description,
        subject: template.subject,
        bodyHtml: template.body_html,
        bodyText: template.body_text,
        isActive: template.is_active,
        isDefault: template.is_default,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching notification templates by type:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Templates',
    }
  }
}

/**
 * Create a new template
 */
export async function createNotificationTemplate(
  salonId: string,
  input: NotificationTemplateInput
): Promise<ApiResponse<NotificationTemplate>> {
  try {
    await requireAdmin(salonId)

    const validated = notificationTemplateSchema.parse(input)
    const supabase = await createClient()

    // If this is set as default, unset other defaults of the same type
    if (validated.isDefault) {
      await supabase
        .from('notification_templates')
        .update({ is_default: false })
        .eq('salon_id', salonId)
        .eq('template_type', validated.templateType)
    }

    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        salon_id: salonId,
        template_type: validated.templateType,
        name: validated.name,
        description: validated.description,
        subject: validated.subject,
        body_html: validated.bodyHtml,
        body_text: validated.bodyText,
        is_active: validated.isActive,
        is_default: validated.isDefault,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/benachrichtigungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        templateType: data.template_type,
        name: data.name,
        description: data.description,
        subject: data.subject,
        bodyHtml: data.body_html,
        bodyText: data.body_text,
        isActive: data.is_active,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating notification template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Templates',
    }
  }
}

/**
 * Update a template
 */
export async function updateNotificationTemplate(
  salonId: string,
  templateId: string,
  input: Partial<NotificationTemplateInput>
): Promise<ApiResponse<NotificationTemplate>> {
  try {
    await requireAdmin(salonId)

    const validated = notificationTemplateSchema.partial().parse(input)
    const supabase = await createClient()

    // If this is set as default, unset other defaults of the same type
    if (validated.isDefault) {
      const { data: currentTemplate } = await supabase
        .from('notification_templates')
        .select('template_type')
        .eq('id', templateId)
        .single()

      if (currentTemplate) {
        await supabase
          .from('notification_templates')
          .update({ is_default: false })
          .eq('salon_id', salonId)
          .eq('template_type', currentTemplate.template_type)
          .neq('id', templateId)
      }
    }

    const updateData: Record<string, any> = {}
    if (validated.templateType !== undefined) updateData.template_type = validated.templateType
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.subject !== undefined) updateData.subject = validated.subject
    if (validated.bodyHtml !== undefined) updateData.body_html = validated.bodyHtml
    if (validated.bodyText !== undefined) updateData.body_text = validated.bodyText
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.isDefault !== undefined) updateData.is_default = validated.isDefault

    const { data, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/benachrichtigungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        templateType: data.template_type,
        name: data.name,
        description: data.description,
        subject: data.subject,
        bodyHtml: data.body_html,
        bodyText: data.body_text,
        isActive: data.is_active,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating notification template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Templates',
    }
  }
}

/**
 * Delete a template
 */
export async function deleteNotificationTemplate(
  salonId: string,
  templateId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()

    // Don't allow deleting default templates
    const { data: template } = await supabase
      .from('notification_templates')
      .select('is_default')
      .eq('id', templateId)
      .eq('salon_id', salonId)
      .single()

    if (template?.is_default) {
      return {
        success: false,
        error: 'Standard-Templates können nicht gelöscht werden',
      }
    }

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', templateId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/benachrichtigungen')

    return { success: true }
  } catch (error) {
    console.error('Error deleting notification template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen des Templates',
    }
  }
}

/**
 * Preview template with sample data
 */
export async function previewTemplate(
  templateHtml: string,
  variables: Record<string, string>
): Promise<ApiResponse<string>> {
  try {
    let rendered = templateHtml

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      rendered = rendered.replace(regex, value)
    }

    return {
      success: true,
      data: rendered,
    }
  } catch (error) {
    console.error('Error previewing template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler bei der Vorschau',
    }
  }
}

/**
 * Send a test email
 * Note: This is a placeholder - actual email sending would require an email service
 */
export async function sendTestEmail(
  salonId: string,
  templateId: string,
  recipientEmail: string,
  testData?: Record<string, string>
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('salon_id', salonId)
      .single()

    if (templateError) throw templateError

    // TODO: Implement actual email sending with a service like Resend, SendGrid, etc.
    // For now, just log that we would send an email
    console.log('Test email would be sent to:', recipientEmail)
    console.log('Template:', template.name)
    console.log('Test data:', testData)

    // Simulate email send
    const defaultTestData = testData || {
      salon_name: 'SCHNITTWERK',
      salon_address: 'Musterstrasse 123, 8000 Zürich',
      salon_phone: '+41 44 123 45 67',
      salon_email: 'info@schnittwerk.ch',
      customer_first_name: 'Max',
      customer_last_name: 'Mustermann',
      customer_email: recipientEmail,
      current_year: new Date().getFullYear().toString(),
      appointment_date: '15.01.2025',
      appointment_time: '14:30',
      appointment_duration: '60 Minuten',
      appointment_services: 'Haarschnitt, Färben',
      appointment_total: 'CHF 120.00',
      staff_name: 'Anna Schmidt',
      cancellation_link: 'https://schnittwerk.ch/termine/stornieren/test123',
      reschedule_link: 'https://schnittwerk.ch/termine/umbuchen/test123',
    }

    let renderedSubject = template.subject
    let renderedBody = template.body_html

    for (const [key, value] of Object.entries(defaultTestData)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      renderedSubject = renderedSubject.replace(regex, value)
      renderedBody = renderedBody.replace(regex, value)
    }

    console.log('Rendered subject:', renderedSubject)
    console.log('Rendered body preview:', renderedBody.substring(0, 200) + '...')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Senden der Test-E-Mail',
    }
  }
}
