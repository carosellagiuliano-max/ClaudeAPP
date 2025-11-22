import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF, type InvoiceData } from '@/lib/pdf/invoice-generator'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()

    // Fetch order with all details
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        salon:salon_id (
          name,
          address_line1,
          city,
          postal_code,
          country,
          phone,
          email,
          iban
        ),
        customer:customer_id (
          first_name,
          last_name,
          email,
          address,
          city,
          postal_code,
          country
        ),
        items:order_items (
          quantity,
          price_snapshot,
          tax_rate_snapshot,
          total_chf,
          product:product_id (name)
        ),
        shipping_method:shipping_method_id (
          name,
          price
        )
      `)
      .eq('id', params.orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Calculate tax breakdown
    const taxBreakdown = new Map<number, { netAmount: number; taxAmount: number }>()

    order.items.forEach((item: any) => {
      const taxRate = item.tax_rate_snapshot
      const netAmount = item.price_snapshot * item.quantity
      const taxAmount = (netAmount * taxRate) / (100 + taxRate)
      const netWithoutTax = netAmount - taxAmount

      const existing = taxBreakdown.get(taxRate) || { netAmount: 0, taxAmount: 0 }
      existing.netAmount += netWithoutTax
      existing.taxAmount += taxAmount
      taxBreakdown.set(taxRate, existing)
    })

    // Add shipping if present
    if (order.shipping_total_chf > 0 && order.shipping_method) {
      const shippingTaxRate = 7.7 // TODO: Get from shipping_method
      const shippingNet = order.shipping_total_chf
      const shippingTax = (shippingNet * shippingTaxRate) / (100 + shippingTaxRate)
      const shippingNetWithoutTax = shippingNet - shippingTax

      const existing = taxBreakdown.get(shippingTaxRate) || { netAmount: 0, taxAmount: 0 }
      existing.netAmount += shippingNetWithoutTax
      existing.taxAmount += shippingTax
      taxBreakdown.set(shippingTaxRate, existing)
    }

    // Build invoice data
    const invoiceData: InvoiceData = {
      invoiceNumber: order.invoice_number || order.order_number,
      invoiceDate: format(new Date(order.created_at), 'dd.MM.yyyy', { locale: de }),
      dueDate: format(new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000), 'dd.MM.yyyy', { locale: de }),

      // Salon Info
      salonName: order.salon.name,
      salonAddress: order.salon.address_line1,
      salonCity: order.salon.city,
      salonPostalCode: order.salon.postal_code,
      salonCountry: order.salon.country,
      salonPhone: order.salon.phone,
      salonEmail: order.salon.email,

      // Customer Info
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      customerAddress: order.customer.address,
      customerCity: order.customer.city,
      customerPostalCode: order.customer.postal_code,
      customerCountry: order.customer.country,
      customerEmail: order.customer.email,

      // Line Items
      items: [
        ...order.items.map((item: any) => ({
          description: item.product?.name || 'Produkt',
          quantity: item.quantity,
          unitPrice: item.price_snapshot,
          taxRate: item.tax_rate_snapshot,
          total: item.total_chf,
        })),
        ...(order.shipping_total_chf > 0
          ? [
              {
                description: `Versand (${order.shipping_method.name})`,
                quantity: 1,
                unitPrice: order.shipping_total_chf,
                taxRate: 7.7,
                total: order.shipping_total_chf,
              },
            ]
          : []),
      ],

      // Totals
      subtotal: order.items_total_chf + order.shipping_total_chf,
      totalTax: order.tax_total_chf,
      totalAmount: order.total_chf,

      // Tax Breakdown
      taxBreakdown: Array.from(taxBreakdown.entries()).map(([rate, amounts]) => ({
        rate,
        netAmount: amounts.netAmount,
        taxAmount: amounts.taxAmount,
      })),

      // Payment Info
      paymentMethod: order.payment_method || 'Nicht angegeben',
      paymentStatus: order.payment_status === 'captured' ? 'paid' : order.payment_status === 'pending' ? 'pending' : 'overdue',

      // Notes
      notes: order.notes,
      termsAndConditions: 'Zahlbar innerhalb von 30 Tagen ohne Abzug. Bei Zahlungsverzug werden Verzugszinsen berechnet.',

      // QR-Bill (include if salon has IBAN and payment is not yet captured)
      includeQRBill: !!order.salon.iban && order.payment_status !== 'captured',
      salonIBAN: order.salon.iban,
      customerId: order.customer_id,
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData)

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung-${order.invoice_number || order.order_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
