/**
 * SMS Sending Interface
 * Unified interface for sending SMS messages
 * Currently supports Twilio
 */

import { createClient } from '@/lib/supabase/server'
import { sendSMS as sendTwilioSMS, formatSwissPhoneNumber, calculateSMSSegments, isTwilioConfigured } from './twilio'

export interface SendSMSOptions {
  to: string // Phone number (will be auto-formatted to E.164)
  message: string
  salonId?: string // For logging purposes
  templateSlug?: string // If using a template
  variables?: Record<string, string> // Variables for template
  tags?: Record<string, string> // Additional metadata
}

export interface SendSMSResult {
  success: boolean
  messageId?: string
  segments?: number
  error?: string
}

/**
 * Send SMS message
 *
 * This is the main function to send SMS messages in the application.
 * It handles phone number formatting, template rendering, and logging.
 *
 * @param options SMS options
 * @returns Result with messageId and success status
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  try {
    // Check if SMS is configured
    if (!isTwilioConfigured()) {
      console.warn('SMS not configured. Skipping SMS send. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.')
      return {
        success: false,
        error: 'SMS provider not configured',
      }
    }

    // Format phone number to E.164
    const formattedPhone = formatSwissPhoneNumber(options.to)

    // Render message (apply variables if provided)
    let message = options.message
    if (options.variables) {
      Object.entries(options.variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
      })
    }

    // Calculate segments for logging
    const segments = calculateSMSSegments(message)

    // Send SMS via Twilio
    const result = await sendTwilioSMS({
      to: formattedPhone,
      body: message,
    })

    // Log to database
    if (options.salonId) {
      await logSMS({
        salonId: options.salonId,
        recipientPhone: formattedPhone,
        message,
        templateSlug: options.templateSlug,
        messageId: result.messageId,
        segments: result.segments || segments,
        success: result.success,
        error: result.error,
        tags: options.tags,
      })
    }

    return result
  } catch (error) {
    console.error('Error sending SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log SMS to database
 */
async function logSMS(data: {
  salonId: string
  recipientPhone: string
  message: string
  templateSlug?: string
  messageId?: string
  segments: number
  success: boolean
  error?: string
  tags?: Record<string, string>
}) {
  try {
    const supabase = await createClient()

    await supabase.from('notification_logs').insert({
      salon_id: data.salonId,
      type: 'sms',
      recipient_phone: data.recipientPhone,
      template_slug: data.templateSlug,
      message_id: data.messageId,
      status: data.success ? 'sent' : 'failed',
      error_message: data.error,
      sms_segments: data.segments,
      sms_provider: 'twilio',
      metadata: data.tags || {},
    })
  } catch (error) {
    console.error('Error logging SMS:', error)
    // Don't throw - logging failure shouldn't block SMS sending
  }
}

/**
 * Get SMS template from database and render
 */
export async function getSMSTemplate(
  salonId: string,
  slug: string,
  variables: Record<string, string> = {}
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sms_templates')
      .select('message_template')
      .eq('salon_id', salonId)
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (error || !data) {
      console.error('Error fetching SMS template:', error)
      return null
    }

    let message = data.message_template

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    return message
  } catch (error) {
    console.error('Error getting SMS template:', error)
    return null
  }
}

/**
 * Send SMS using a template
 */
export async function sendTemplateSMS(
  salonId: string,
  templateSlug: string,
  to: string,
  variables: Record<string, string> = {},
  tags?: Record<string, string>
): Promise<SendSMSResult> {
  const message = await getSMSTemplate(salonId, templateSlug, variables)

  if (!message) {
    return {
      success: false,
      error: 'Template not found',
    }
  }

  return sendSMS({
    to,
    message,
    salonId,
    templateSlug,
    variables,
    tags,
  })
}

// Export helper functions
export { formatSwissPhoneNumber, calculateSMSSegments, isTwilioConfigured } from './twilio'
