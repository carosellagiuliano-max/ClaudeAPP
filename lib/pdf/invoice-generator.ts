/**
 * PDF Invoice Generator
 * Generates professional invoices as PDF using PDFKit
 * Swiss-compliant invoice format with VAT breakdown
 */

import PDFDocument from 'pdfkit'
import type { Readable } from 'stream'
import { addQRBillToPDF, generateQRReference } from '@/lib/qr-bill/generator'

export interface InvoiceData {
  // Invoice Info
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string

  // Salon Info
  salonName: string
  salonAddress: string
  salonCity: string
  salonPostalCode: string
  salonCountry: string
  salonPhone?: string
  salonEmail?: string
  salonVatNumber?: string

  // Customer Info
  customerName: string
  customerAddress?: string
  customerCity?: string
  customerPostalCode?: string
  customerCountry?: string
  customerEmail?: string

  // Line Items
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    total: number
  }>

  // Totals
  subtotal: number
  totalTax: number
  totalAmount: number

  // Tax Breakdown (für Swiss VAT)
  taxBreakdown?: Array<{
    rate: number
    netAmount: number
    taxAmount: number
  }>

  // Payment Info
  paymentMethod?: string
  paymentStatus?: 'paid' | 'pending' | 'overdue'

  // Notes
  notes?: string
  termsAndConditions?: string

  // QR-Bill (Swiss Payment Slip)
  includeQRBill?: boolean
  salonIBAN?: string // Swiss IBAN for QR payment
  customerId?: string // For QR reference generation
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: data.salonName,
          Subject: `Invoice for ${data.customerName}`,
        },
      })

      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Generate PDF content
      generatePDFContent(doc, data)

      // Add QR-Bill if requested and IBAN is provided
      if (data.includeQRBill && data.salonIBAN) {
        const qrReference = generateQRReference(data.invoiceNumber, data.customerId)

        addQRBillToPDF(doc, {
          creditorName: data.salonName,
          creditorAddress: data.salonAddress,
          creditorCity: data.salonCity,
          creditorPostalCode: data.salonPostalCode,
          creditorCountry: data.salonCountry,
          creditorAccount: data.salonIBAN,
          debtorName: data.customerName,
          debtorAddress: data.customerAddress,
          debtorCity: data.customerCity,
          debtorPostalCode: data.customerPostalCode,
          debtorCountry: data.customerCountry,
          amount: data.totalAmount,
          currency: 'CHF',
          reference: qrReference,
          additionalInfo: `Rechnung ${data.invoiceNumber}`,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
        })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function generatePDFContent(doc: typeof PDFDocument.prototype, data: InvoiceData) {
  const pageWidth = doc.page.width
  const margin = 50

  // ===================================================================
  // HEADER - Salon Info (Left) & Invoice Info (Right)
  // ===================================================================

  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(data.salonName, margin, margin)

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(data.salonAddress, margin, margin + 25)
    .text(`${data.salonPostalCode} ${data.salonCity}`, margin, margin + 38)
    .text(data.salonCountry, margin, margin + 51)

  if (data.salonPhone) {
    doc.text(`Tel: ${data.salonPhone}`, margin, margin + 64)
  }
  if (data.salonEmail) {
    doc.text(`Email: ${data.salonEmail}`, margin, margin + 77)
  }
  if (data.salonVatNumber) {
    doc.text(`UID: ${data.salonVatNumber}`, margin, margin + 90)
  }

  // Invoice Info (Right aligned)
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('RECHNUNG', pageWidth - margin - 150, margin, {
      width: 150,
      align: 'right',
    })

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Rechnungsnummer: ${data.invoiceNumber}`, pageWidth - margin - 150, margin + 30, {
      width: 150,
      align: 'right',
    })
    .text(`Datum: ${data.invoiceDate}`, pageWidth - margin - 150, margin + 43, {
      width: 150,
      align: 'right',
    })

  if (data.dueDate) {
    doc.text(`Fällig am: ${data.dueDate}`, pageWidth - margin - 150, margin + 56, {
      width: 150,
      align: 'right',
    })
  }

  // ===================================================================
  // CUSTOMER INFO
  // ===================================================================

  let yPosition = margin + 140

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Rechnung an:', margin, yPosition)

  yPosition += 20

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(data.customerName, margin, yPosition)

  yPosition += 13

  if (data.customerAddress) {
    doc.text(data.customerAddress, margin, yPosition)
    yPosition += 13
  }
  if (data.customerPostalCode && data.customerCity) {
    doc.text(`${data.customerPostalCode} ${data.customerCity}`, margin, yPosition)
    yPosition += 13
  }
  if (data.customerCountry) {
    doc.text(data.customerCountry, margin, yPosition)
    yPosition += 13
  }
  if (data.customerEmail) {
    doc.text(data.customerEmail, margin, yPosition)
    yPosition += 13
  }

  yPosition += 30

  // ===================================================================
  // LINE ITEMS TABLE
  // ===================================================================

  const tableTop = yPosition
  const tableHeaders = {
    description: { x: margin, width: 250, label: 'Beschreibung' },
    quantity: { x: margin + 255, width: 50, label: 'Menge' },
    unitPrice: { x: margin + 310, width: 70, label: 'Einzel' },
    taxRate: { x: margin + 385, width: 50, label: 'MwSt' },
    total: { x: margin + 440, width: 80, label: 'Total' },
  }

  // Table Header
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#000000')

  Object.entries(tableHeaders).forEach(([key, col]) => {
    doc.text(col.label, col.x, tableTop, {
      width: col.width,
      align: key === 'description' ? 'left' : 'right',
    })
  })

  // Header Line
  doc
    .moveTo(margin, tableTop + 15)
    .lineTo(pageWidth - margin, tableTop + 15)
    .strokeColor('#cccccc')
    .stroke()

  // Table Rows
  let itemYPosition = tableTop + 25

  doc.fontSize(9).font('Helvetica').fillColor('#000000')

  data.items.forEach((item, index) => {
    // Check if we need a new page
    if (itemYPosition > doc.page.height - 200) {
      doc.addPage()
      itemYPosition = margin
    }

    doc.text(item.description, tableHeaders.description.x, itemYPosition, {
      width: tableHeaders.description.width,
      align: 'left',
    })

    doc.text(item.quantity.toString(), tableHeaders.quantity.x, itemYPosition, {
      width: tableHeaders.quantity.width,
      align: 'right',
    })

    doc.text(`CHF ${item.unitPrice.toFixed(2)}`, tableHeaders.unitPrice.x, itemYPosition, {
      width: tableHeaders.unitPrice.width,
      align: 'right',
    })

    doc.text(`${item.taxRate.toFixed(1)}%`, tableHeaders.taxRate.x, itemYPosition, {
      width: tableHeaders.taxRate.width,
      align: 'right',
    })

    doc.text(`CHF ${item.total.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
      width: tableHeaders.total.width,
      align: 'right',
    })

    itemYPosition += 20
  })

  // Line after items
  doc
    .moveTo(margin, itemYPosition)
    .lineTo(pageWidth - margin, itemYPosition)
    .strokeColor('#cccccc')
    .stroke()

  itemYPosition += 20

  // ===================================================================
  // TAX BREAKDOWN (Swiss VAT)
  // ===================================================================

  if (data.taxBreakdown && data.taxBreakdown.length > 0) {
    doc.fontSize(9).font('Helvetica')

    data.taxBreakdown.forEach((tax) => {
      doc.text(
        `Netto (${tax.rate.toFixed(1)}% MwSt)`,
        tableHeaders.total.x - 120,
        itemYPosition,
        { width: 100, align: 'right' }
      )
      doc.text(`CHF ${tax.netAmount.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
        width: tableHeaders.total.width,
        align: 'right',
      })

      itemYPosition += 15

      doc.text(`MwSt ${tax.rate.toFixed(1)}%`, tableHeaders.total.x - 120, itemYPosition, {
        width: 100,
        align: 'right',
      })
      doc.text(`CHF ${tax.taxAmount.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
        width: tableHeaders.total.width,
        align: 'right',
      })

      itemYPosition += 20
    })
  } else {
    // Simple subtotal + tax
    doc.fontSize(10).font('Helvetica')

    doc.text('Zwischensumme', tableHeaders.total.x - 120, itemYPosition, {
      width: 100,
      align: 'right',
    })
    doc.text(`CHF ${data.subtotal.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
      width: tableHeaders.total.width,
      align: 'right',
    })

    itemYPosition += 15

    doc.text('MwSt', tableHeaders.total.x - 120, itemYPosition, { width: 100, align: 'right' })
    doc.text(`CHF ${data.totalTax.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
      width: tableHeaders.total.width,
      align: 'right',
    })

    itemYPosition += 20
  }

  // ===================================================================
  // TOTAL
  // ===================================================================

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Gesamtbetrag', tableHeaders.total.x - 120, itemYPosition, {
      width: 100,
      align: 'right',
    })
    .text(`CHF ${data.totalAmount.toFixed(2)}`, tableHeaders.total.x, itemYPosition, {
      width: tableHeaders.total.width,
      align: 'right',
    })

  itemYPosition += 30

  // Payment Status Badge
  if (data.paymentStatus) {
    const statusColors = {
      paid: '#10b981',
      pending: '#f59e0b',
      overdue: '#ef4444',
    }

    const statusLabels = {
      paid: 'BEZAHLT',
      pending: 'AUSSTEHEND',
      overdue: 'ÜBERFÄLLIG',
    }

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(statusColors[data.paymentStatus])
      .text(statusLabels[data.paymentStatus], tableHeaders.total.x - 120, itemYPosition, {
        width: 200,
        align: 'right',
      })
      .fillColor('#000000')

    itemYPosition += 20
  }

  // ===================================================================
  // PAYMENT INFO
  // ===================================================================

  if (data.paymentMethod) {
    itemYPosition += 10

    doc.fontSize(9).font('Helvetica').text(`Zahlungsart: ${data.paymentMethod}`, margin, itemYPosition)

    itemYPosition += 20
  }

  // ===================================================================
  // NOTES
  // ===================================================================

  if (data.notes) {
    itemYPosition += 10

    doc.fontSize(9).font('Helvetica-Bold').text('Notizen:', margin, itemYPosition)

    itemYPosition += 15

    doc.fontSize(9).font('Helvetica').text(data.notes, margin, itemYPosition, {
      width: pageWidth - 2 * margin,
    })

    itemYPosition += 40
  }

  // ===================================================================
  // TERMS & CONDITIONS
  // ===================================================================

  if (data.termsAndConditions) {
    // Check if we need a new page
    if (itemYPosition > doc.page.height - 150) {
      doc.addPage()
      itemYPosition = margin
    }

    doc.fontSize(8).font('Helvetica-Bold').text('Allgemeine Geschäftsbedingungen:', margin, itemYPosition)

    itemYPosition += 12

    doc.fontSize(8).font('Helvetica').fillColor('#666666').text(data.termsAndConditions, margin, itemYPosition, {
      width: pageWidth - 2 * margin,
    })
  }

  // ===================================================================
  // FOOTER
  // ===================================================================

  const footerY = doc.page.height - 50

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#999999')
    .text(`${data.salonName} | ${data.salonEmail || ''}`, margin, footerY, {
      width: pageWidth - 2 * margin,
      align: 'center',
    })
}

// Helper function to create readable stream from buffer (for HTTP response)
export function bufferToStream(buffer: Buffer): Readable {
  const { Readable } = require('stream')
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}
