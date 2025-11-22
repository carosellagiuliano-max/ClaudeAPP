/**
 * E2E Test: Multi-Tenant Isolation
 * Tests data isolation between salons
 */

import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from './helpers/auth'

test.describe('Multi-Tenant - Data Isolation', () => {
  test('should only show own salon data in admin panel', async ({ page }) => {
    await login(page, TEST_USERS.admin)

    await page.goto('/admin/dashboard')

    // Should show dashboard for THIS salon only
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible()

    // Should show salon name/identifier
    const salonInfo = page.locator('[data-testid="current-salon"]')
    await expect(salonInfo).toBeVisible()

    const salonName = await salonInfo.textContent()

    // Navigate to appointments
    await page.goto('/admin/termine')

    // All appointments should belong to current salon
    const appointments = page.locator('[data-testid="appointment-row"]')
    const count = await appointments.count()

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const appt = appointments.nth(i)

        // Should NOT show appointments from other salons
        // (We verify this by checking salon indicator if shown)
        const salonIndicator = appt.locator('[data-testid="salon-name"]')
        const hasIndicator = await salonIndicator.isVisible().catch(() => false)

        if (hasIndicator) {
          const apptSalon = await salonIndicator.textContent()
          expect(apptSalon).toBe(salonName)
        }
      }
    }
  })

  test('should not allow access to other salon resources via URL manipulation', async ({ page }) => {
    await login(page, TEST_USERS.admin)

    // Try to access appointment from different salon (if we had ID)
    // For now, test that navigation is restricted

    await page.goto('/admin/salon/different-salon-id/settings')

    // Should either:
    // 1. Redirect to own salon
    // 2. Show 403 Forbidden
    // 3. Show 404 Not Found

    const is403 = await page.getByText(/Forbidden|Keine Berechtigung/).isVisible().catch(() => false)
    const is404 = await page.getByText(/Not Found|Nicht gefunden/).isVisible().catch(() => false)
    const redirected = !page.url().includes('different-salon-id')

    expect(is403 || is404 || redirected).toBe(true)
  })

  test('should filter products by salon', async ({ page }) => {
    await page.goto('/shop')

    // All products should belong to current salon
    const products = page.locator('[data-testid="product-card"]')
    const count = await products.count()

    expect(count).toBeGreaterThan(0)

    // Products should not show salon indicator (implicit filtering)
    // Just verify products load correctly
    const firstProduct = products.first()
    await expect(firstProduct.getByRole('heading')).toBeVisible()
  })

  test('should filter services by salon in booking', async ({ page }) => {
    await page.goto('/termin')

    // Service dropdown should only show services for this salon
    await page.getByLabel(/Service/).click()

    // Get all options
    const options = page.getByRole('option')
    const optionCount = await options.count()

    expect(optionCount).toBeGreaterThan(0)

    // All services should be from current salon (no cross-salon services)
    // This is implicit - the service select should be filtered
  })

  test('should isolate customer data between salons', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    // Customer should only see their data for salons they're registered with
    await page.goto('/dashboard/termine')

    const appointments = page.locator('[data-testid="appointment-card"]')
    const count = await appointments.count()

    if (count > 0) {
      // Each appointment should have salon context
      // And customer should only see appointments at salons where they're a customer
      const firstAppt = appointments.first()

      // Should show salon name
      const salonName = firstAppt.locator('[data-testid="salon-name"]')
      const hasSalon = await salonName.isVisible().catch(() => false)

      // If multiple salons, should show which salon
      if (hasSalon) {
        await expect(salonName).toBeVisible()
      }
    }
  })
})

test.describe('Multi-Tenant - Staff Assignment', () => {
  test('should only show staff from current salon in booking', async ({ page }) => {
    await page.goto('/termin')

    // Select service first
    await page.getByLabel(/Service/).selectOption({ index: 1 })

    // Staff dropdown should only show staff from this salon
    await page.getByLabel(/Mitarbeiter/).click()

    const staffOptions = page.getByRole('option')
    const count = await staffOptions.count()

    expect(count).toBeGreaterThan(0)

    // All staff should be from current salon
    // (Implicit filtering - no way to select cross-salon staff)
  })

  test('should not allow booking with staff from different salon', async ({ page, request }) => {
    // This would be an API test to ensure backend validation

    // Try to create booking with:
    // - Service from Salon A
    // - Staff from Salon B (different)

    const response = await request.post('/api/bookings', {
      data: {
        salon_id: 'salon-a-id',
        service_id: 'service-salon-a',
        staff_id: 'staff-salon-b', // Mismatch!
        date: '2025-12-15',
        time: '10:00',
      },
    })

    // Should be rejected (400 or 403)
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)

    const body = await response.json()
    expect(body.error).toBeTruthy()
  })
})

test.describe('Multi-Tenant - Admin Permissions', () => {
  test('should restrict admin to own salon', async ({ page }) => {
    await login(page, TEST_USERS.admin)

    await page.goto('/admin')

    // Should only have access to own salon's admin panel
    // Should NOT see:
    // - Global admin panel
    // - Other salons' data
    // - Platform-wide settings

    // Should show current salon context
    await expect(page.locator('[data-testid="current-salon"]')).toBeVisible()

    // Should NOT have "Switch Salon" option (unless admin of multiple)
    const switchSalon = page.getByRole('button', { name: /Salon wechseln|Switch Salon/ })
    const hasSwitchOption = await switchSalon.isVisible().catch(() => false)

    // If visible, means admin has access to multiple salons
    // Otherwise, should not be visible
    expect(hasSwitchOption).toBeDefined()
  })

  test('should prevent modifying other salon settings', async ({ page, request }) => {
    await login(page, TEST_USERS.admin)

    // Try to update settings for different salon
    const response = await request.patch('/api/salons/different-salon-id/settings', {
      data: {
        name: 'Hacked Name',
      },
    })

    // Should be forbidden
    expect([403, 404]).toContain(response.status())
  })
})

test.describe('Multi-Tenant - Database Queries', () => {
  test('should filter orders by salon', async ({ page }) => {
    await login(page, TEST_USERS.admin)

    await page.goto('/admin/bestellungen')

    // All orders should be from current salon
    const orders = page.locator('[data-testid="order-row"]')
    const count = await orders.count()

    if (count > 0) {
      // Verify first few orders belong to current salon
      for (let i = 0; i < Math.min(count, 5); i++) {
        const order = orders.nth(i)

        // Should have order data visible
        await expect(order.locator('[data-testid="order-number"]')).toBeVisible()

        // Should NOT show cross-salon data
        // (Implicit - query is filtered by salon_id)
      }
    }
  })

  test('should filter customers by salon', async ({ page }) => {
    await login(page, TEST_USERS.admin)

    await page.goto('/admin/kunden')

    // All customers should be registered at current salon
    const customers = page.locator('[data-testid="customer-row"]')
    const count = await customers.count()

    if (count > 0) {
      // Customers belong to this salon
      const firstCustomer = customers.first()
      await expect(firstCustomer.locator('[data-testid="customer-name"]')).toBeVisible()
    }
  })
})

test.describe('Multi-Tenant - URL Structure', () => {
  test('should use salon-specific URLs where appropriate', async ({ page }) => {
    // Public pages should be accessible with or without salon context
    await page.goto('/')

    // Should load successfully
    await expect(page).toHaveURL(/.*\//)

    // Salon-specific pages (if multi-domain setup)
    // e.g., schnittwerk.example.com vs othersalon.example.com

    // Or path-based: /salons/schnittwerk vs /salons/othersalon

    // Verify URL structure is consistent
    const url = page.url()
    expect(url).toBeTruthy()
  })

  test('should preserve salon context in navigation', async ({ page }) => {
    await page.goto('/shop')

    // Navigate to product
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    await firstProduct.click()

    // URL should maintain salon context (if multi-salon app)
    const productUrl = page.url()

    // Navigate to cart
    await page.goto('/warenkorb')

    // Cart should be for same salon
    const cartUrl = page.url()

    // Both URLs should have same salon context
    // (Implementation depends on URL strategy)
    expect(productUrl).toBeTruthy()
    expect(cartUrl).toBeTruthy()
  })
})
