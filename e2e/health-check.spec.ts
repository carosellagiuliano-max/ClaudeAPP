/**
 * E2E Test: Health Check
 * Tests system health monitoring endpoint
 */

import { test, expect } from '@playwright/test'

test.describe('Health Check Endpoint', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.checks.database.status).toBe('pass')
    expect(body.checks.api.status).toBe('pass')
    expect(body.timestamp).toBeTruthy()
    expect(body.uptime).toBeGreaterThan(0)
  })

  test('should include database response time', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    expect(body.checks.database.responseTime).toBeGreaterThanOrEqual(0)
    expect(body.checks.database.responseTime).toBeLessThan(5000) // Should respond within 5s
  })

  test('should not cache health check responses', async ({ request }) => {
    const response = await request.get('/api/health')
    const cacheControl = response.headers()['cache-control']

    expect(cacheControl).toContain('no-cache')
    expect(cacheControl).toContain('no-store')
  })
})
