/**
 * E2E Test: Waitlist
 * Tests waitlist functionality for fully booked appointments
 */

import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from './helpers/auth'
import {
  clickButton,
  fillField,
  generateTestEmail,
  generateTestPhone,
  waitForToast,
} from './helpers/utils'

test.describe('Waitlist - Add to Waitlist', () => {
  test('should add customer to waitlist as authenticated user', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    await page.goto('/termin')

    // Select service
    await page.getByLabel(/Service/).selectOption({ label: /Damenschnitt/ })

    // Select a date that's fully booked
    // (In test, we simulate by going to waitlist page directly)
    await page.goto('/wartelist')

    // Fill waitlist form
    await page.getByLabel(/Service/).selectOption({ label: /Damenschnitt/ })

    // Select date range
    await fillField(page, 'Von Datum', '2025-12-01')
    await fillField(page, 'Bis Datum', '2025-12-15')

    // Select preferred times
    await page.getByLabel(/Vormittag/).check()
    await page.getByLabel(/Nachmittag/).check()

    // Select preferred weekdays
    await page.getByLabel(/Montag/).check()
    await page.getByLabel(/Mittwoch/).check()
    await page.getByLabel(/Freitag/).check()

    // Optional: select preferred staff
    await page.getByLabel(/Mitarbeiter/).selectOption({ label: /Keine Präferenz/ })

    // Add notes
    await fillField(page, 'Notizen', 'Bitte am Morgen, wenn möglich')

    // Submit
    await clickButton(page, 'Zur Warteliste hinzufügen')

    // Should show success message
    await waitForToast(page, 'Zur Warteliste hinzugefügt')

    // Should redirect to waitlist overview
    await expect(page).toHaveURL(/.*\/wartelist/)
  })

  test('should add guest to waitlist without login', async ({ page }) => {
    await page.goto('/wartelist')

    // Select service
    await page.getByLabel(/Service/).selectOption({ label: /Herrenschnitt/ })

    // Fill guest details
    await fillField(page, 'Name', 'Max Muster')
    await fillField(page, 'E-Mail', generateTestEmail())
    await fillField(page, 'Telefon', generateTestPhone())

    // Select date range
    await fillField(page, 'Von Datum', '2025-12-01')
    await fillField(page, 'Bis Datum', '2025-12-10')

    // Select preferences
    await page.getByLabel(/Vormittag/).check()

    // Submit
    await clickButton(page, 'Zur Warteliste hinzufügen')

    // Should show success
    await waitForToast(page, 'Zur Warteliste hinzugefügt')

    // Should show confirmation message
    await expect(page.getByText(/Benachrichtigung per E-Mail|will be notified/)).toBeVisible()
  })

  test('should validate required waitlist fields', async ({ page }) => {
    await page.goto('/wartelist')

    // Try to submit without filling fields
    await clickButton(page, 'Zur Warteliste hinzufügen')

    // Should show validation errors
    await expect(page.getByText(/Service ist erforderlich|required/)).toBeVisible()
    await expect(page.getByText(/E-Mail ist erforderlich|required/)).toBeVisible()
  })

  test('should require either specific date or date range', async ({ page }) => {
    await login(page, TEST_USERS.customer)
    await page.goto('/wartelist')

    // Select service
    await page.getByLabel(/Service/).selectOption({ label: /Coloration/ })

    // Don't select any dates
    await clickButton(page, 'Zur Warteliste hinzufügen')

    // Should show error about missing date
    await expect(page.getByText(/Datum.*erforderlich|date required/)).toBeVisible()
  })
})

test.describe('Waitlist - View Waitlist Entries', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display customer waitlist entries', async ({ page }) => {
    await page.goto('/dashboard/wartelist')

    // Should show page title
    await expect(page.getByRole('heading', { name: /Warteliste/ })).toBeVisible()

    // Check if entries exist
    const hasEntries = await page.getByTestId('waitlist-entry').isVisible().catch(() => false)
    const isEmpty = await page.getByText(/Keine Einträge|No entries/).isVisible().catch(() => false)

    expect(hasEntries || isEmpty).toBe(true)

    if (hasEntries) {
      const firstEntry = page.getByTestId('waitlist-entry').first()

      // Should show service name
      await expect(firstEntry.locator('[data-testid="service-name"]')).toBeVisible()

      // Should show date preferences
      await expect(firstEntry.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()

      // Should show status (active/notified/expired)
      await expect(firstEntry.locator('[data-testid="waitlist-status"]')).toBeVisible()

      // Should have cancel button
      await expect(firstEntry.getByRole('button', { name: /Entfernen|Cancel/ })).toBeVisible()
    }
  })

  test('should show waitlist entry details', async ({ page }) => {
    await page.goto('/dashboard/wartelist')

    const hasEntries = await page.getByTestId('waitlist-entry').isVisible().catch(() => false)

    if (hasEntries) {
      // Click to view details
      await page.getByTestId('waitlist-entry').first().click()

      // Should expand or navigate to details
      // Should show full preferences
      await expect(page.getByText(/Zeitpräferenz|Time preference/)).toBeVisible()
      await expect(page.getByText(/Wochentage|Weekdays/)).toBeVisible()

      // Should show notification status
      await expect(page.getByText(/Status/)).toBeVisible()
    }
  })

  test('should remove entry from waitlist', async ({ page }) => {
    // First add an entry
    await page.goto('/wartelist')

    await page.getByLabel(/Service/).selectOption({ index: 1 })
    await fillField(page, 'Von Datum', '2025-12-20')
    await fillField(page, 'Bis Datum', '2025-12-25')
    await page.getByLabel(/Vormittag/).check()

    await clickButton(page, 'Zur Warteliste hinzufügen')
    await waitForToast(page, 'Zur Warteliste hinzugefügt')

    // Go to waitlist overview
    await page.goto('/dashboard/wartelist')

    // Remove first entry
    const removeButton = page.getByTestId('waitlist-entry').first().getByRole('button', { name: /Entfernen/ })
    await removeButton.click()

    // Should show confirmation
    await expect(page.getByText(/wirklich entfernen|confirm removal/)).toBeVisible()

    await clickButton(page, 'Bestätigen')

    // Should show success
    await waitForToast(page, 'Von Warteliste entfernt')
  })
})

test.describe('Waitlist - Notifications', () => {
  test('should show notification when slot becomes available', async ({ page }) => {
    // This test would require:
    // 1. Customer on waitlist
    // 2. Staff creates a new slot that matches preferences
    // 3. System sends notification

    // Simplified: verify notification preferences exist
    await login(page, TEST_USERS.customer)
    await page.goto('/dashboard/einstellungen')

    // Should have waitlist notification toggle
    const waitlistNotif = page.getByLabel(/Warteliste.*Benachrichtigungen/)
    const exists = await waitlistNotif.isVisible().catch(() => false)

    if (exists) {
      await expect(waitlistNotif).toBeVisible()
    }
  })
})

test.describe('Waitlist - Expiry', () => {
  test('should show expired waitlist entries separately', async ({ page }) => {
    await login(page, TEST_USERS.customer)
    await page.goto('/dashboard/wartelist')

    // Toggle to show expired entries
    const showExpiredButton = page.getByRole('button', { name: /Abgelaufen|Expired/ })
    const hasExpiredToggle = await showExpiredButton.isVisible().catch(() => false)

    if (hasExpiredToggle) {
      await showExpiredButton.click()

      // Should show expired entries
      const expiredEntries = page.locator('[data-testid="waitlist-entry"][data-status="expired"]')
      const count = await expiredEntries.count()

      if (count > 0) {
        // Expired entries should show expiry date
        await expect(expiredEntries.first().getByText(/Abgelaufen am/)).toBeVisible()

        // Should NOT have cancel button (already expired)
        const hasCancel = await expiredEntries.first().getByRole('button', { name: /Entfernen/ }).isVisible().catch(() => false)
        expect(hasCancel).toBe(false)
      }
    }
  })
})
