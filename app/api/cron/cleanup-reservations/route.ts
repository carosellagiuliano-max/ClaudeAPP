/**
 * Cron Job: Cleanup Expired Reservations
 * Releases expired temporary reservations
 *
 * Schedule: Every 5 minutes
 * Vercel Cron: */5 * * * *
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/cleanup-reservations
 * Clean up expired temporary reservations
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
    logger.info('Starting cleanup-reservations cron job')

    // Find expired reservations that haven't been released
    const { data: expiredReservations, error: selectError } = await supabase
      .from('temporary_reservations')
      .select('id, slot_id, session_id, expires_at')
      .lt('expires_at', new Date().toISOString())
      .is('released_at', null)

    if (selectError) throw selectError

    if (!expiredReservations || expiredReservations.length === 0) {
      logger.info('No expired reservations to clean up')

      await logCronRun('cleanup-reservations', jobStartTime, 'completed', 0)

      return NextResponse.json({
        success: true,
        message: 'No expired reservations',
        count: 0,
      })
    }

    logger.info(`Found ${expiredReservations.length} expired reservations`)

    // Release expired reservations
    const { error: updateError } = await supabase
      .from('temporary_reservations')
      .update({
        released_at: new Date().toISOString(),
        released_reason: 'expired',
      })
      .in(
        'id',
        expiredReservations.map(r => r.id)
      )

    if (updateError) throw updateError

    logger.info(`Released ${expiredReservations.length} expired reservations`)

    await logCronRun('cleanup-reservations', jobStartTime, 'completed', expiredReservations.length)

    return NextResponse.json({
      success: true,
      message: `Released ${expiredReservations.length} expired reservations`,
      count: expiredReservations.length,
      reservations: expiredReservations,
    })
  } catch (error) {
    logger.error('Cron job failed: cleanup-reservations', error)

    await logCronRun(
      'cleanup-reservations',
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
  errorMessage?: string
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
    })
  } catch (error) {
    logger.error('Failed to log cron job run', error)
  }
}
