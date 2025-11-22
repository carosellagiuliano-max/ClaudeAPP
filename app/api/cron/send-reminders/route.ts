/**
 * Cron Job: Send Appointment Reminders
 * Sends reminder emails 24 hours before appointments
 *
 * Schedule: Every hour
 * Vercel Cron: 0 * * * *
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging'
import { sendAppointmentReminder } from '@/lib/email'
import { format, addHours } from 'date-fns'
import { de } from 'date-fns/locale'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/send-reminders
 * Send appointment reminders
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobStartTime = new Date()
  const supabase = await createClient()

  try {
    logger.info('Starting send-reminders cron job')

    // Find appointments happening in 24 hours (±1 hour window)
    const now = new Date()
    const reminderWindowStart = addHours(now, 23) // 23 hours from now
    const reminderWindowEnd = addHours(now, 25) // 25 hours from now

    const { data: appointments, error: selectError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        starts_at,
        salon_id,
        customer_id,
        reminder_sent_at,
        services:appointment_services(
          service:services(name)
        ),
        customer:customers(
          email,
          first_name,
          last_name
        ),
        salon:salons(
          name,
          street,
          postal_code,
          city
        ),
        staff:staff!staff_id(
          profile:profiles!profile_id(
            first_name,
            last_name
          )
        )
      `
      )
      .gte('starts_at', reminderWindowStart.toISOString())
      .lte('starts_at', reminderWindowEnd.toISOString())
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null) // Haven't sent reminder yet

    if (selectError) throw selectError

    if (!appointments || appointments.length === 0) {
      logger.info('No appointments needing reminders')

      await logCronRun('send-reminders', jobStartTime, 'completed', 0)

      return NextResponse.json({
        success: true,
        message: 'No appointments needing reminders',
        count: 0,
      })
    }

    logger.info(`Found ${appointments.length} appointments needing reminders`)

    let successCount = 0
    let failureCount = 0

    // Send reminder for each appointment
    for (const appointment of appointments) {
      try {
        const customer = appointment.customer as any
        const salon = appointment.salon as any
        const services = appointment.services as any[]
        const staff = appointment.staff as any

        if (!customer || !salon) {
          logger.warn('Missing customer or salon data', { appointmentId: appointment.id })
          failureCount++
          continue
        }

        // Get salon settings for reminder configuration
        const { data: settings } = await supabase
          .from('salon_settings')
          .select('send_reminders, reminder_hours_before')
          .eq('salon_id', appointment.salon_id)
          .single()

        // Check if salon has reminders enabled
        if (settings && !settings.send_reminders) {
          logger.info('Reminders disabled for salon', { salonId: appointment.salon_id })
          continue
        }

        // Format service names
        const serviceName =
          services.map(s => s.service?.name).filter(Boolean).join(', ') || 'Termin'

        // Format staff name
        const staffProfile = staff?.profile
        const staffName = staffProfile
          ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim()
          : undefined

        // Format date/time
        const appointmentDateTime = format(
          new Date(appointment.starts_at),
          "EEEE, dd. MMMM yyyy 'um' HH:mm 'Uhr'",
          { locale: de }
        )

        // Format address
        const salonAddress = `${salon.street}, ${salon.postal_code} ${salon.city}`

        // Send reminder email
        const result = await sendAppointmentReminder({
          to: customer.email,
          customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Kunde',
          salonName: salon.name,
          serviceName,
          dateTime: appointmentDateTime,
          salonAddress,
        })

        if (result.success) {
          // Mark reminder as sent
          await supabase
            .from('appointments')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', appointment.id)

          successCount++
          logger.info('Reminder sent successfully', {
            appointmentId: appointment.id,
            customerEmail: customer.email,
          })
        } else {
          failureCount++
          logger.error('Failed to send reminder', null, {
            appointmentId: appointment.id,
            customerEmail: customer.email,
          })
        }
      } catch (error) {
        failureCount++
        logger.error('Error sending reminder for appointment', error, {
          appointmentId: appointment.id,
        })
      }
    }

    logger.info('Reminder job completed', {
      total: appointments.length,
      success: successCount,
      failed: failureCount,
    })

    await logCronRun('send-reminders', jobStartTime, 'completed', successCount, undefined, {
      total: appointments.length,
      success: successCount,
      failed: failureCount,
    })

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminders, ${failureCount} failed`,
      total: appointments.length,
      sent: successCount,
      failed: failureCount,
    })
  } catch (error) {
    logger.error('Cron job failed: send-reminders', error)

    await logCronRun(
      'send-reminders',
      jobStartTime,
      'failed',
      0,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Log cron job run to database
 */
async function logCronRun(
  jobName: string,
  startedAt: Date,
  status: 'completed' | 'failed',
  recordsProcessed: number,
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('cron_job_runs').insert({
      job_name: jobName,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      status,
      records_processed: recordsProcessed,
      error_message: errorMessage || null,
      metadata: metadata || {},
    })
  } catch (error) {
    logger.error('Failed to log cron job run', error)
  }
}
