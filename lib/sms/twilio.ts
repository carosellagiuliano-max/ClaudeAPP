/**
 * Twilio SMS Integration
 * Sends SMS messages via Twilio API
 */

import twilio from 'twilio'

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

// Initialize Twilio Client
let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.')
  }

  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }

  return twilioClient
}

export interface SendSMSOptions {
  to: string // Phone number in E.164 format (+41791234567)
  body: string // SMS message content
  from?: string // Optional: Override default sender number
}

export interface SendSMSResult {
  success: boolean
  messageId?: string
  segments?: number
  error?: string
}

/**
 * Send SMS via Twilio
 *
 * @param options SMS options
 * @returns Result with messageId and segment count
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  try {
    const client = getTwilioClient()

    if (!TWILIO_PHONE_NUMBER && !options.from) {
      throw new Error('No sender phone number configured. Set TWILIO_PHONE_NUMBER or provide from parameter.')
    }

    // Validate phone number format (E.164)
    if (!options.to.match(/^\+[1-9]\d{1,14}$/)) {
      throw new Error(`Invalid phone number format: ${options.to}. Must be in E.164 format (e.g., +41791234567)`)
    }

    // Send SMS
    const message = await client.messages.create({
      body: options.body,
      to: options.to,
      from: options.from || TWILIO_PHONE_NUMBER,
    })

    return {
      success: true,
      messageId: message.sid,
      segments: parseInt(message.numSegments || '1'),
    }
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate phone number format (E.164)
 *
 * @param phone Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

/**
 * Format Swiss phone number to E.164
 *
 * Examples:
 * - 079 123 45 67 -> +41791234567
 * - 0041791234567 -> +41791234567
 * - +41 79 123 45 67 -> +41791234567
 *
 * @param phone Swiss phone number
 * @returns E.164 formatted phone number
 */
export function formatSwissPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Replace leading 0041 with +41
  if (cleaned.startsWith('0041')) {
    cleaned = '+41' + cleaned.slice(4)
  }
  // Replace leading 0 with +41
  else if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+41' + cleaned.slice(1)
  }
  // Already has +41
  else if (!cleaned.startsWith('+41')) {
    // Assume it needs +41
    cleaned = '+41' + cleaned
  }

  return cleaned
}

/**
 * Calculate SMS segment count
 * Standard SMS: 160 chars = 1 segment
 * With special chars (Unicode): 70 chars = 1 segment
 *
 * @param message Message text
 * @returns Number of SMS segments
 */
export function calculateSMSSegments(message: string): number {
  const hasUnicode = /[^\x00-\x7F]/.test(message)
  const maxLength = hasUnicode ? 70 : 160

  if (message.length <= maxLength) {
    return 1
  }

  // Multi-part SMS has smaller segment size due to headers
  const multiPartMaxLength = hasUnicode ? 67 : 153
  return Math.ceil(message.length / multiPartMaxLength)
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}
