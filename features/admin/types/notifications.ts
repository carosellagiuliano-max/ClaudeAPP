/**
 * Notification Template Types
 * Type definitions for email and notification templates
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface NotificationTemplate {
  id: string
  salonId: string
  templateType: NotificationTemplateType
  name: string
  description: string | null
  subject: string
  bodyHtml: string
  bodyText: string | null
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type NotificationTemplateType =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancellation'
  | 'booking_rescheduled'
  | 'welcome_email'
  | 'marketing_newsletter'
  | 'password_reset'
  | 'appointment_feedback'

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const notificationTemplateSchema = z.object({
  templateType: z.enum([
    'booking_confirmation',
    'booking_reminder',
    'booking_cancellation',
    'booking_rescheduled',
    'welcome_email',
    'marketing_newsletter',
    'password_reset',
    'appointment_feedback',
  ]),
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  description: z.string().max(500).optional(),
  subject: z.string().min(1, 'Betreff ist erforderlich').max(200),
  bodyHtml: z.string().min(1, 'E-Mail-Inhalt ist erforderlich'),
  bodyText: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
})

export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>

// ============================================================
// TEMPLATE VARIABLES
// ============================================================

export interface TemplateVariable {
  key: string
  label: string
  description: string
  example: string
}

export const COMMON_VARIABLES: TemplateVariable[] = [
  {
    key: 'salon_name',
    label: 'Salon Name',
    description: 'Name des Salons',
    example: 'SCHNITTWERK',
  },
  {
    key: 'salon_address',
    label: 'Salon Adresse',
    description: 'Vollständige Adresse des Salons',
    example: 'Musterstrasse 123, 8000 Zürich',
  },
  {
    key: 'salon_phone',
    label: 'Salon Telefon',
    description: 'Telefonnummer des Salons',
    example: '+41 44 123 45 67',
  },
  {
    key: 'salon_email',
    label: 'Salon E-Mail',
    description: 'E-Mail-Adresse des Salons',
    example: 'info@schnittwerk.ch',
  },
  {
    key: 'customer_first_name',
    label: 'Vorname',
    description: 'Vorname des Kunden',
    example: 'Max',
  },
  {
    key: 'customer_last_name',
    label: 'Nachname',
    description: 'Nachname des Kunden',
    example: 'Mustermann',
  },
  {
    key: 'customer_email',
    label: 'Kunden E-Mail',
    description: 'E-Mail-Adresse des Kunden',
    example: 'max@example.com',
  },
  {
    key: 'current_year',
    label: 'Aktuelles Jahr',
    description: 'Das aktuelle Jahr',
    example: '2025',
  },
]

export const APPOINTMENT_VARIABLES: TemplateVariable[] = [
  {
    key: 'appointment_date',
    label: 'Termin Datum',
    description: 'Datum des Termins',
    example: '15.01.2025',
  },
  {
    key: 'appointment_time',
    label: 'Termin Uhrzeit',
    description: 'Uhrzeit des Termins',
    example: '14:30',
  },
  {
    key: 'appointment_duration',
    label: 'Termin Dauer',
    description: 'Dauer des Termins in Minuten',
    example: '60 Minuten',
  },
  {
    key: 'appointment_services',
    label: 'Dienstleistungen',
    description: 'Liste der gebuchten Dienstleistungen',
    example: 'Haarschnitt, Färben',
  },
  {
    key: 'appointment_total',
    label: 'Gesamtpreis',
    description: 'Gesamtpreis des Termins',
    example: 'CHF 120.00',
  },
  {
    key: 'staff_name',
    label: 'Mitarbeiter Name',
    description: 'Name des zugewiesenen Mitarbeiters',
    example: 'Anna Schmidt',
  },
  {
    key: 'cancellation_link',
    label: 'Stornierungslink',
    description: 'Link zum Stornieren des Termins',
    example: 'https://schnittwerk.ch/termine/stornieren/abc123',
  },
  {
    key: 'reschedule_link',
    label: 'Umbuchen Link',
    description: 'Link zum Umbuchen des Termins',
    example: 'https://schnittwerk.ch/termine/umbuchen/abc123',
  },
]

export const TEMPLATE_VARIABLES_BY_TYPE: Record<
  NotificationTemplateType,
  TemplateVariable[]
> = {
  booking_confirmation: [...COMMON_VARIABLES, ...APPOINTMENT_VARIABLES],
  booking_reminder: [...COMMON_VARIABLES, ...APPOINTMENT_VARIABLES],
  booking_cancellation: [...COMMON_VARIABLES, ...APPOINTMENT_VARIABLES],
  booking_rescheduled: [...COMMON_VARIABLES, ...APPOINTMENT_VARIABLES],
  welcome_email: [
    ...COMMON_VARIABLES,
    {
      key: 'verification_link',
      label: 'Verifizierungslink',
      description: 'Link zur E-Mail-Verifizierung',
      example: 'https://schnittwerk.ch/verifizieren/abc123',
    },
  ],
  marketing_newsletter: [...COMMON_VARIABLES],
  password_reset: [
    ...COMMON_VARIABLES,
    {
      key: 'reset_link',
      label: 'Passwort zurücksetzen Link',
      description: 'Link zum Zurücksetzen des Passworts',
      example: 'https://schnittwerk.ch/passwort-zuruecksetzen/abc123',
    },
    {
      key: 'reset_expires',
      label: 'Link Ablaufzeit',
      description: 'Ablaufzeit des Reset-Links',
      example: '24 Stunden',
    },
  ],
  appointment_feedback: [
    ...COMMON_VARIABLES,
    ...APPOINTMENT_VARIABLES,
    {
      key: 'feedback_link',
      label: 'Feedback Link',
      description: 'Link zur Feedback-Seite',
      example: 'https://schnittwerk.ch/feedback/abc123',
    },
  ],
}

// ============================================================
// UTILITY TYPES
// ============================================================

export const TEMPLATE_TYPE_LABELS: Record<NotificationTemplateType, string> = {
  booking_confirmation: 'Buchungsbestätigung',
  booking_reminder: 'Buchungserinnerung',
  booking_cancellation: 'Stornierungsbenachrichtigung',
  booking_rescheduled: 'Terminänderung',
  welcome_email: 'Willkommens-E-Mail',
  marketing_newsletter: 'Marketing Newsletter',
  password_reset: 'Passwort zurücksetzen',
  appointment_feedback: 'Termin Feedback',
}

export const TEMPLATE_TYPE_DESCRIPTIONS: Record<NotificationTemplateType, string> = {
  booking_confirmation: 'Wird nach erfolgreicher Buchung an den Kunden gesendet',
  booking_reminder: 'Erinnerung vor dem Termin',
  booking_cancellation: 'Benachrichtigung bei Stornierung',
  booking_rescheduled: 'Benachrichtigung bei Terminänderung',
  welcome_email: 'Begrüßungs-E-Mail für neue Kunden',
  marketing_newsletter: 'Newsletter für Marketing-Zwecke',
  password_reset: 'E-Mail zum Zurücksetzen des Passworts',
  appointment_feedback: 'Feedback-Anfrage nach abgeschlossenem Termin',
}

// ============================================================
// DEFAULT TEMPLATES
// ============================================================

export const DEFAULT_TEMPLATES: Partial<
  Record<NotificationTemplateType, Omit<NotificationTemplateInput, 'templateType'>>
> = {
  booking_confirmation: {
    name: 'Standard Buchungsbestätigung',
    description: 'Standard-Template für Buchungsbestätigungen',
    subject: 'Ihre Buchung bei {{salon_name}} wurde bestätigt',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .appointment-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Buchungsbestätigung</h1>
    </div>

    <div class="content">
      <p>Hallo {{customer_first_name}} {{customer_last_name}},</p>

      <p>vielen Dank für Ihre Buchung bei {{salon_name}}. Ihr Termin wurde erfolgreich bestätigt.</p>

      <div class="appointment-box">
        <h3>Ihre Termindetails:</h3>
        <p><strong>Datum:</strong> {{appointment_date}}</p>
        <p><strong>Uhrzeit:</strong> {{appointment_time}}</p>
        <p><strong>Dauer:</strong> {{appointment_duration}}</p>
        <p><strong>Dienstleistungen:</strong> {{appointment_services}}</p>
        <p><strong>Mitarbeiter:</strong> {{staff_name}}</p>
        <p><strong>Gesamtpreis:</strong> {{appointment_total}}</p>
      </div>

      <p>Wir freuen uns auf Ihren Besuch!</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="{{reschedule_link}}" class="button">Termin umbuchen</a>
        <a href="{{cancellation_link}}" class="button" style="background-color: #DC2626;">Termin stornieren</a>
      </div>
    </div>

    <div class="footer">
      <p>{{salon_name}}<br>
      {{salon_address}}<br>
      Tel: {{salon_phone}} | E-Mail: {{salon_email}}</p>
      <p>&copy; {{current_year}} {{salon_name}}. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    bodyText: `
Hallo {{customer_first_name}} {{customer_last_name}},

vielen Dank für Ihre Buchung bei {{salon_name}}. Ihr Termin wurde erfolgreich bestätigt.

Ihre Termindetails:
- Datum: {{appointment_date}}
- Uhrzeit: {{appointment_time}}
- Dauer: {{appointment_duration}}
- Dienstleistungen: {{appointment_services}}
- Mitarbeiter: {{staff_name}}
- Gesamtpreis: {{appointment_total}}

Wir freuen uns auf Ihren Besuch!

Termin umbuchen: {{reschedule_link}}
Termin stornieren: {{cancellation_link}}

{{salon_name}}
{{salon_address}}
Tel: {{salon_phone}} | E-Mail: {{salon_email}}

© {{current_year}} {{salon_name}}. Alle Rechte vorbehalten.
    `.trim(),
    isActive: true,
    isDefault: true,
  },
  booking_reminder: {
    name: 'Standard Terminerin­nerung',
    description: 'Standard-Template für Terminerinnerungen',
    subject: 'Erinnerung: Ihr Termin bei {{salon_name}} morgen',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .reminder-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Terminerinnerung</h1>
    </div>

    <div class="content">
      <p>Hallo {{customer_first_name}},</p>

      <div class="reminder-box">
        <h3>Ihr Termin steht bevor!</h3>
        <p><strong>{{appointment_date}} um {{appointment_time}}</strong></p>
        <p>{{appointment_services}} mit {{staff_name}}</p>
      </div>

      <p>Wir freuen uns darauf, Sie bei {{salon_name}} begrüßen zu dürfen.</p>

      <p>Bitte kommen Sie pünktlich und sagen Sie uns rechtzeitig Bescheid, falls Sie den Termin nicht wahrnehmen können.</p>
    </div>

    <div class="footer">
      <p>{{salon_name}} | {{salon_address}}<br>
      Tel: {{salon_phone}}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    bodyText: `
Hallo {{customer_first_name}},

⏰ Terminerinnerung

Ihr Termin steht bevor!
{{appointment_date}} um {{appointment_time}}
{{appointment_services}} mit {{staff_name}}

Wir freuen uns darauf, Sie bei {{salon_name}} begrüßen zu dürfen.

Bitte kommen Sie pünktlich und sagen Sie uns rechtzeitig Bescheid, falls Sie den Termin nicht wahrnehmen können.

{{salon_name}} | {{salon_address}}
Tel: {{salon_phone}}
    `.trim(),
    isActive: true,
    isDefault: true,
  },
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TestEmailInput {
  templateId: string
  recipientEmail: string
  testData?: Record<string, string>
}
