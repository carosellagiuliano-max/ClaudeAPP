import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health Check Endpoint
 * Used by monitoring systems and load balancers
 *
 * Returns:
 * - 200: System healthy
 * - 503: System degraded/unhealthy
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    checks: {
      database: { status: 'unknown' as 'pass' | 'fail', responseTime: 0 },
      api: { status: 'pass' as 'pass' | 'fail' },
    },
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
    uptime: process.uptime(),
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const supabase = await createClient()

    // Simple query to check DB connection
    const { error } = await supabase
      .from('salons')
      .select('id')
      .limit(1)
      .single()

    checks.checks.database.responseTime = Date.now() - dbStart

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for health check
      checks.checks.database.status = 'fail'
      checks.status = 'degraded'
    } else {
      checks.checks.database.status = 'pass'
    }
  } catch (error) {
    console.error('Health check database error:', error)
    checks.checks.database.status = 'fail'
    checks.status = 'unhealthy'
  }

  // Determine HTTP status code
  const httpStatus = checks.status === 'unhealthy' ? 503 : 200

  return NextResponse.json(checks, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
