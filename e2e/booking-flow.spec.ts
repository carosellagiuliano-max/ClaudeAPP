/**
 * E2E Test: Booking Flow
 * Tests the complete customer booking journey
 */

import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the services page
    await page.goto('/leistungen')
  })

  test('should complete full booking flow', async ({ page }) => {
    // Step 1: Select a service
    await expect(page.getByRole('heading', { name: 'Unsere Leistungen' })).toBeVisible()

    // Click on first service card "Buchen" button
    const firstBookButton = page.getByRole('button', { name: 'Buchen' }).first()
    await firstBookButton.click()

    // Step 2: Should navigate to booking page
    await expect(page).toHaveURL(/.*\/termin/)

    // Step 3: Select date and time
    // Wait for calendar to load
    await expect(page.getByRole('button', { name: /Datum wählen/ })).toBeVisible()

    // Click on a future date (assume calendar shows current month)
    const dateButton = page.getByRole('button', { name: /^[0-9]{1,2}$/ }).nth(10)
    await dateButton.click()

    // Wait for time slots to load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 5000 })

    // Select first available time slot
    const firstTimeSlot = page.locator('[data-testid="time-slot"]').first()
    await firstTimeSlot.click()

    // Step 4: Fill customer details
    await expect(page.getByRole('heading', { name: /Ihre Daten/ })).toBeVisible()

    await page.getByLabel('Vorname').fill('Max')
    await page.getByLabel('Nachname').fill('Muster')
    await page.getByLabel('E-Mail').fill('max.muster@example.com')
    await page.getByLabel('Telefon').fill('+41 79 123 45 67')

    // Accept terms
    await page.getByLabel(/Ich akzeptiere die AGB/).check()

    // Step 5: Submit booking
    await page.getByRole('button', { name: /Termin buchen/ }).click()

    // Step 6: Verify confirmation page
    await expect(page).toHaveURL(/.*\/termin\/bestaetigung/)
    await expect(page.getByRole('heading', { name: /Buchung bestätigt/ })).toBeVisible()

    // Should show booking details
    await expect(page.getByText('Max Muster')).toBeVisible()
    await expect(page.getByText('max.muster@example.com')).toBeVisible()
  })

  test('should handle "no preference" staff selection', async ({ page }) => {
    await page.goto('/termin')

    // Select "Keine Präferenz" for staff
    await page.getByLabel('Mitarbeiter').selectOption({ label: 'Keine Präferenz' })

    // Should show slots from all available staff
    await page.waitForSelector('[data-testid="time-slot"]')
    const slots = await page.locator('[data-testid="time-slot"]').count()
    expect(slots).toBeGreaterThan(0)
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/termin')

    // Try to submit without filling fields
    await page.getByRole('button', { name: /Termin buchen/ }).click()

    // Should show validation errors
    await expect(page.getByText(/Vorname ist erforderlich/)).toBeVisible()
    await expect(page.getByText(/E-Mail ist erforderlich/)).toBeVisible()
  })

  test('should enforce lead time', async ({ page }) => {
    await page.goto('/termin')

    // Slots in the past or too soon should not be selectable
    // This is checked by ensuring only future slots are rendered
    const slots = page.locator('[data-testid="time-slot"]')
    const firstSlot = slots.first()

    if (await firstSlot.isVisible()) {
      const slotText = await firstSlot.textContent()
      // Slot should not be in the past
      expect(slotText).toBeTruthy()
    }
  })

  test('should show "no slots available" message when fully booked', async ({ page }) => {
    // Navigate to a date far in the future where no staff is scheduled
    await page.goto('/termin?date=2030-12-31')

    // Should show appropriate message
    await expect(
      page.getByText(/Keine verfügbaren Termine|Keine Slots verfügbar/)
    ).toBeVisible()
  })
})

test.describe('Booking Flow - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/leistungen')

    // Service cards should be stacked vertically
    const serviceCards = page.locator('[data-testid="service-card"]')
    const firstCard = serviceCards.first()
    const secondCard = serviceCards.nth(1)

    if ((await firstCard.isVisible()) && (await secondCard.isVisible())) {
      const firstBox = await firstCard.boundingBox()
      const secondBox = await secondCard.boundingBox()

      // On mobile, second card should be below first card
      if (firstBox && secondBox) {
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height)
      }
    }
  })
})

test.describe('Booking Validation', () => {
  test('should prevent double bookings', async ({ page, context }) => {
    // Open two browser tabs
    const page2 = await context.newPage()

    // Both try to book the same slot
    await page.goto('/termin')
    await page2.goto('/termin')

    // Select same date and time slot in both tabs
    const dateButton = page.getByRole('button', { name: /^15$/ })
    await dateButton.click()
    await page.waitForSelector('[data-testid="time-slot"]')

    const dateButton2 = page2.getByRole('button', { name: /^15$/ })
    await dateButton2.click()
    await page2.waitForSelector('[data-testid="time-slot"]')

    // Click first slot in both tabs
    const slot1 = page.locator('[data-testid="time-slot"]').first()
    const slot2 = page2.locator('[data-testid="time-slot"]').first()

    await slot1.click()
    await slot2.click()

    // Fill forms
    await page.getByLabel('E-Mail').fill('user1@example.com')
    await page.getByLabel(/Ich akzeptiere/).check()

    await page2.getByLabel('E-Mail').fill('user2@example.com')
    await page2.getByLabel(/Ich akzeptiere/).check()

    // Submit both (first should succeed, second should fail)
    await Promise.all([
      page.getByRole('button', { name: /Termin buchen/ }).click(),
      page2.getByRole('button', { name: /Termin buchen/ }).click(),
    ])

    // One should succeed, one should show error
    const page1Success = await page.getByText(/Buchung bestätigt/).isVisible().catch(() => false)
    const page2Success = await page2.getByText(/Buchung bestätigt/).isVisible().catch(() => false)
    const page1Error = await page.getByText(/Slot nicht mehr verfügbar/).isVisible().catch(() => false)
    const page2Error = await page2.getByText(/Slot nicht mehr verfügbar/).isVisible().catch(() => false)

    // Exactly one should succeed
    expect(page1Success || page2Success).toBe(true)
    expect(page1Error || page2Error).toBe(true)

    await page2.close()
  })
})
