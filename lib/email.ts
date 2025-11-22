/**
 * Email Service Abstraction Layer
 * Supports multiple email providers (Resend, SendGrid, etc.)
 */

import { logger } from './logging'

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[]
  from: EmailAddress
  subject: string
  html: string
  text?: string
  replyTo?: EmailAddress
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  tags?: Record<string, string>
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<{ id: string; success: boolean; error?: string }>
}

/**
 * Resend Email Provider
 * https://resend.com/docs
 */
class ResendProvider implements EmailProvider {
  private apiKey: string
  private baseUrl = 'https://api.resend.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendEmail(options: EmailOptions): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      // Format recipients
      const to = Array.isArray(options.to)
        ? options.to.map(addr => this.formatAddress(addr))
        : this.formatAddress(options.to)

      // Build request payload
      const payload: any = {
        from: this.formatAddress(options.from),
        to,
        subject: options.subject,
        html: options.html,
      }

      if (options.text) payload.text = options.text
      if (options.replyTo) payload.reply_to = this.formatAddress(options.replyTo)
      if (options.cc) payload.cc = options.cc.map(addr => this.formatAddress(addr))
      if (options.bcc) payload.bcc = options.bcc.map(addr => this.formatAddress(addr))
      if (options.attachments) payload.attachments = options.attachments
      if (options.tags) payload.tags = options.tags

      // Send via Resend API
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Email send failed')
      }

      logger.info('Email sent via Resend', {
        emailId: data.id,
        to: payload.to,
        subject: options.subject,
      })

      return {
        id: data.id,
        success: true,
      }
    } catch (error) {
      logger.error('Failed to send email via Resend', error, {
        to: options.to,
        subject: options.subject,
      })

      return {
        id: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private formatAddress(addr: EmailAddress): string {
    if (addr.name) {
      return `${addr.name} <${addr.email}>`
    }
    return addr.email
  }
}

/**
 * Console Email Provider (Development/Testing)
 */
class ConsoleProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<{ id: string; success: boolean }> {
    console.log('\n📧 ===== EMAIL (Console Provider) =====')
    console.log('From:', options.from)
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('HTML Length:', options.html.length)
    console.log('Text:', options.text?.substring(0, 100) || 'N/A')
    console.log('======================================\n')

    return {
      id: `console-${Date.now()}`,
      success: true,
    }
  }
}

/**
 * Email Service Factory
 */
function createEmailProvider(): EmailProvider {
  const resendApiKey = process.env.RESEND_API_KEY

  if (resendApiKey && process.env.NODE_ENV === 'production') {
    return new ResendProvider(resendApiKey)
  }

  // Use console provider in development
  logger.info('Using Console Email Provider (development mode)')
  return new ConsoleProvider()
}

/**
 * Email Service Singleton
 */
export const emailProvider = createEmailProvider()

/**
 * Send email with retry logic
 */
export async function sendEmail(
  options: EmailOptions,
  retries = 3
): Promise<{ success: boolean; id?: string; error?: string }> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await emailProvider.sendEmail(options)

    if (result.success) {
      // Log to database (notification_logs)
      await logEmailSent(options, result.id)
      return { success: true, id: result.id }
    }

    lastError = result.error
    logger.warn(`Email send attempt ${attempt}/${retries} failed`, {
      subject: options.subject,
      error: result.error,
    })

    // Wait before retry (exponential backoff)
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  // All retries failed
  await logEmailFailed(options, lastError || 'All retries failed')
  return { success: false, error: lastError }
}

/**
 * Log successful email send to database
 */
async function logEmailSent(options: EmailOptions, emailId: string): Promise<void> {
  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()

    const to = Array.isArray(options.to) ? options.to[0] : options.to

    await supabase.from('notification_logs').insert({
      type: 'email',
      recipient_email: to.email,
      subject: options.subject,
      status: 'sent',
      provider_id: emailId,
      metadata: {
        from: options.from,
        tags: options.tags,
      },
    })
  } catch (error) {
    logger.error('Failed to log email send', error)
  }
}

/**
 * Log failed email send to database
 */
async function logEmailFailed(options: EmailOptions, error: string): Promise<void> {
  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()

    const to = Array.isArray(options.to) ? options.to[0] : options.to

    await supabase.from('notification_logs').insert({
      type: 'email',
      recipient_email: to.email,
      subject: options.subject,
      status: 'failed',
      error_message: error,
      metadata: {
        from: options.from,
        tags: options.tags,
      },
    })
  } catch (err) {
    logger.error('Failed to log email failure', err)
  }
}

/**
 * Helper: Send booking confirmation email
 */
export async function sendBookingConfirmation(params: {
  to: string
  customerName: string
  salonName: string
  serviceName: string
  dateTime: string
  staffName?: string
  totalPrice: number
  confirmationUrl?: string
}): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Buchungsbestätigung</h1>
      <p>Hallo ${params.customerName},</p>
      <p>Vielen Dank für Ihre Buchung bei <strong>${params.salonName}</strong>!</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Termindetails</h2>
        <p><strong>Service:</strong> ${params.serviceName}</p>
        <p><strong>Datum & Zeit:</strong> ${params.dateTime}</p>
        ${params.staffName ? `<p><strong>Mitarbeiter:</strong> ${params.staffName}</p>` : ''}
        <p><strong>Preis:</strong> CHF ${params.totalPrice.toFixed(2)}</p>
      </div>

      ${params.confirmationUrl ? `
        <p>
          <a href="${params.confirmationUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Termin anzeigen
          </a>
        </p>
      ` : ''}

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Falls Sie Fragen haben, kontaktieren Sie uns gerne.<br>
        Wir freuen uns auf Ihren Besuch!
      </p>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        ${params.salonName}<br>
        Diese E-Mail wurde automatisch gesendet.
      </p>
    </div>
  `

  const result = await sendEmail({
    from: { email: 'noreply@schnittwerk.ch', name: params.salonName },
    to: { email: params.to, name: params.customerName },
    subject: `Buchungsbestätigung - ${params.salonName}`,
    html,
    tags: {
      type: 'booking_confirmation',
      salon: params.salonName,
    },
  })

  return { success: result.success }
}

/**
 * Helper: Send appointment reminder
 */
export async function sendAppointmentReminder(params: {
  to: string
  customerName: string
  salonName: string
  serviceName: string
  dateTime: string
  salonAddress?: string
}): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">🔔 Terminerinnerung</h1>
      <p>Hallo ${params.customerName},</p>
      <p>Dies ist eine Erinnerung an Ihren bevorstehenden Termin:</p>

      <div style="background: #fffbeb; border-left: 4px solid #fbbf24; padding: 20px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #92400e;">Ihr Termin morgen</h2>
        <p><strong>Service:</strong> ${params.serviceName}</p>
        <p><strong>Datum & Zeit:</strong> ${params.dateTime}</p>
        ${params.salonAddress ? `<p><strong>Adresse:</strong> ${params.salonAddress}</p>` : ''}
      </div>

      <p>Wir freuen uns auf Ihren Besuch!</p>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Falls Sie den Termin absagen müssen, kontaktieren Sie uns bitte so früh wie möglich.
      </p>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        ${params.salonName}<br>
        Diese E-Mail wurde automatisch gesendet.
      </p>
    </div>
  `

  const result = await sendEmail({
    from: { email: 'noreply@schnittwerk.ch', name: params.salonName },
    to: { email: params.to, name: params.customerName },
    subject: `Terminerinnerung - ${params.salonName}`,
    html,
    tags: {
      type: 'appointment_reminder',
      salon: params.salonName,
    },
  })

  return { success: result.success }
}

/**
 * Helper: Send order confirmation
 */
export async function sendOrderConfirmation(params: {
  to: string
  customerName: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number }>
  totalAmount: number
  shippingAddress?: string
}): Promise<{ success: boolean }> {
  const itemsHtml = params.items
    .map(
      item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">CHF ${item.price.toFixed(2)}</td>
      </tr>
    `
    )
    .join('')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Bestellbestätigung</h1>
      <p>Hallo ${params.customerName},</p>
      <p>Vielen Dank für Ihre Bestellung!</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Bestellnummer:</strong> ${params.orderNumber}</p>

        <table style="width: 100%; margin-top: 20px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #333;">Artikel</th>
              <th style="text-align: center; padding: 8px; border-bottom: 2px solid #333;">Menge</th>
              <th style="text-align: right; padding: 8px; border-bottom: 2px solid #333;">Preis</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: bold;">Gesamt:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold;">CHF ${params.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        ${params.shippingAddress ? `
          <div style="margin-top: 20px;">
            <strong>Lieferadresse:</strong><br>
            ${params.shippingAddress.replace(/\n/g, '<br>')}
          </div>
        ` : ''}
      </div>

      <p>Ihre Bestellung wird in Kürze bearbeitet.</p>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        SCHNITTWERK<br>
        Diese E-Mail wurde automatisch gesendet.
      </p>
    </div>
  `

  const result = await sendEmail({
    from: { email: 'shop@schnittwerk.ch', name: 'SCHNITTWERK Shop' },
    to: { email: params.to, name: params.customerName },
    subject: `Bestellbestätigung #${params.orderNumber}`,
    html,
    tags: {
      type: 'order_confirmation',
      order_number: params.orderNumber,
    },
  })

  return { success: result.success }
}
