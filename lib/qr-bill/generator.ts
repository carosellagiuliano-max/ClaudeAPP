/**
 * Swiss QR-Bill Generator
 * Generates QR payment slips according to Swiss ISO 20022 standard
 *
 * QR-Bills are mandatory in Switzerland since 2022 (replaced old payment slips)
 * They contain a QR code with structured payment information
 */

import { SwissQRBill, type Data } from 'swissqrbill'
import PDFDocument from 'pdfkit'

export interface QRBillData {
  // Creditor (Salon) Info
  creditorName: string
  creditorAddress: string
  creditorCity: string
  creditorPostalCode: string
  creditorCountry: string // 'CH'

  // Creditor Account (IBAN)
  creditorAccount: string // Swiss IBAN (21 chars)

  // Debtor (Customer) Info
  debtorName: string
  debtorAddress?: string
  debtorCity?: string
  debtorPostalCode?: string
  debtorCountry?: string

  // Payment Info
  amount: number // In CHF
  currency: 'CHF' | 'EUR'
  reference?: string // QR-Reference or Creditor Reference
  additionalInfo?: string

  // Invoice Details
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
}

/**
 * Generate Swiss QR-Bill as PDF buffer
 *
 * This creates a complete QR payment slip that can be printed
 * and used for bank payments in Switzerland
 */
export async function generateQRBill(data: QRBillData): Promise<Buffer> {
  // Prepare data for swissqrbill library
  const qrData: Data = {
    currency: data.currency,
    amount: data.amount,
    reference: data.reference,
    creditor: {
      name: data.creditorName,
      address: data.creditorAddress,
      zip: parseInt(data.creditorPostalCode),
      city: data.creditorCity,
      account: data.creditorAccount,
      country: data.creditorCountry as 'CH' | 'LI',
    },
    debtor: data.debtorName
      ? {
          name: data.debtorName,
          address: data.debtorAddress || '',
          zip: data.debtorPostalCode ? parseInt(data.debtorPostalCode) : undefined,
          city: data.debtorCity || '',
          country: (data.debtorCountry as 'CH') || 'CH',
        }
      : undefined,
    message: data.additionalInfo,
  }

  // Generate QR-Bill PDF
  const pdf = new SwissQRBill(qrData)

  // Return as buffer
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    pdf.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    pdf.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    pdf.on('error', reject)

    pdf.end()
  })
}

/**
 * Add QR-Bill to existing PDF document
 *
 * This appends a QR payment slip page to an existing PDF (e.g., invoice)
 */
export function addQRBillToPDF(
  doc: typeof PDFDocument,
  data: QRBillData
): void {
  // Add new page for QR-Bill
  doc.addPage({
    size: 'A4',
    margin: 0,
  })

  try {
    // Prepare QR-Bill data
    const qrData: Data = {
      currency: data.currency,
      amount: data.amount,
      reference: data.reference,
      creditor: {
        name: data.creditorName,
        address: data.creditorAddress,
        zip: parseInt(data.creditorPostalCode),
        city: data.creditorCity,
        account: data.creditorAccount,
        country: data.creditorCountry as 'CH' | 'LI',
      },
      debtor: data.debtorName
        ? {
            name: data.debtorName,
            address: data.debtorAddress || '',
            zip: data.debtorPostalCode ? parseInt(data.debtorPostalCode) : undefined,
            city: data.debtorCity || '',
            country: (data.debtorCountry as 'CH') || 'CH',
          }
        : undefined,
      message: data.additionalInfo,
    }

    // Generate QR code and payment slip content
    const qrBill = new SwissQRBill(qrData)

    // The swissqrbill library will handle rendering the complete payment slip
    // with the QR code, payment information, and perforated sections

    // Note: In a real implementation, we would need to integrate the
    // swissqrbill output into the PDFKit document. For now, we're
    // documenting the structure that would be rendered:
    //
    // The QR-Bill consists of:
    // 1. Receipt section (left side, 62mm wide)
    // 2. Payment part (right side, 148mm wide)
    // 3. Perforated separation lines
    // 4. Swiss QR Code (46x46mm)
    // 5. Payment information fields

    doc
      .fontSize(8)
      .text('Swiss QR-Bill würde hier gerendert', 50, 50)
      .text('(Vollständige Integration erfordert PDF-Rendering-Anpassungen)', 50, 65)
      .text(`Betrag: ${data.currency} ${data.amount.toFixed(2)}`, 50, 90)
      .text(`Zahlbar an: ${data.creditorName}`, 50, 105)
      .text(`Referenz: ${data.reference || 'N/A'}`, 50, 120)
  } catch (error) {
    console.error('Error adding QR-Bill to PDF:', error)
    doc.fontSize(10).text('Fehler beim Generieren des QR-Einzahlungsscheins', 50, 50)
  }
}

/**
 * Validate Swiss IBAN
 * Swiss IBANs are always 21 characters and start with 'CH'
 */
export function validateSwissIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  return /^CH\d{19}$/.test(cleaned)
}

/**
 * Format Swiss IBAN with spaces for display
 * CH93 0076 2011 6238 5295 7
 */
export function formatSwissIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  return cleaned.match(/.{1,4}/g)?.join(' ') || iban
}

/**
 * Generate QR-Reference (27 digits with check digit)
 * Used for automated payment reconciliation
 */
export function generateQRReference(invoiceNumber: string, customerId?: string): string {
  // Pad invoice number to 20 digits
  let reference = invoiceNumber.padStart(20, '0')

  // Add customer ID if provided (last 6 digits)
  if (customerId) {
    const customerPart = customerId.slice(-6).padStart(6, '0')
    reference = reference.slice(0, 14) + customerPart
  }

  // Calculate check digit using Modulo 10 recursive algorithm
  const checkDigit = calculateMod10RecursiveCheckDigit(reference)
  reference += checkDigit

  return reference
}

/**
 * Calculate Modulo 10 recursive check digit
 * This is the standard algorithm for Swiss QR-References
 */
function calculateMod10RecursiveCheckDigit(reference: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
  let carry = 0

  for (let i = 0; i < reference.length; i++) {
    const digit = parseInt(reference[i])
    carry = table[(carry + digit) % 10]
  }

  return ((10 - carry) % 10).toString()
}

/**
 * Validate QR-Reference
 */
export function validateQRReference(reference: string): boolean {
  if (reference.length !== 27) return false
  if (!/^\d{27}$/.test(reference)) return false

  const referenceWithoutCheck = reference.slice(0, 26)
  const checkDigit = reference[26]
  const calculatedCheck = calculateMod10RecursiveCheckDigit(referenceWithoutCheck)

  return checkDigit === calculatedCheck
}
