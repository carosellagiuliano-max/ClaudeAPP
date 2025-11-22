/**
 * Vitest Global Setup
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// Mock environment variables for testing
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
})

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks()
})
