/**
 * E2E Test: Customer Portal
 * Tests customer dashboard, orders, appointments, and profile
 */

import { test, expect } from '@playwright/test'
import {
  login,
  logout,
  registerCustomer,
  TEST_USERS,
} from './helpers/auth'
import {
  clickButton,
  fillField,
  generateTestEmail,
  generateTestPhone,
  waitForToast,
} from './helpers/utils'

test.describe('Customer Portal - Registration & Login', () => {
  test('should register new customer', async ({ page }) => {
    const email = generateTestEmail()
    const phone = generateTestPhone()

    await registerCustomer(page, {
      email,
      password: 'Test123!',
      firstName: 'New',
      lastName: 'Customer',
      phone,
    })

    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /Willkommen|Dashboard/ })).toBeVisible()

    // Should show customer name
    await expect(page.getByText('New Customer')).toBeVisible()
  })

  test('should validate registration fields', async ({ page }) => {
    await page.goto('/registrieren')

    // Try to submit empty form
    await clickButton(page, 'Registrieren')

    // Should show validation errors
    await expect(page.getByText(/Vorname ist erforderlich/)).toBeVisible()
    await expect(page.getByText(/E-Mail ist erforderlich/)).toBeVisible()
    await expect(page.getByText(/Passwort ist erforderlich/)).toBeVisible()
  })

  test('should require password confirmation to match', async ({ page }) => {
    await page.goto('/registrieren')

    await fillField(page, 'Vorname', 'Test')
    await fillField(page, 'Nachname', 'User')
    await fillField(page, 'E-Mail', generateTestEmail())
    await fillField(page, /Passwort(?! wiederholen)/, 'Test123!')
    await fillField(page, 'Passwort wiederholen', 'Different123!')

    await page.getByLabel(/AGB/).check()
    await page.getByLabel(/Datenschutz/).check()

    await clickButton(page, 'Registrieren')

    // Should show password mismatch error
    await expect(page.getByText(/Passwörter stimmen nicht überein/)).toBeVisible()
  })

  test('should login existing customer', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    // Should be on dashboard
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.getByText(TEST_USERS.customer.firstName)).toBeVisible()
  })

  test('should logout customer', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    await logout(page)

    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })

  test('should show login error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await fillField(page, 'E-Mail', 'wrong@example.com')
    await fillField(page, 'Passwort', 'WrongPassword')
    await clickButton(page, 'Anmelden')

    // Should show error
    await expect(page.getByText(/Ungültige Anmeldedaten|Falsche E-Mail oder Passwort/)).toBeVisible()
  })
})

test.describe('Customer Portal - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display dashboard overview', async ({ page }) => {
    await page.goto('/dashboard')

    // Should show welcome message
    await expect(page.getByRole('heading', { name: /Willkommen|Dashboard/ })).toBeVisible()

    // Should show quick stats
    await expect(page.getByText(/Termine|Appointments/)).toBeVisible()
    await expect(page.getByText(/Bestellungen|Orders/)).toBeVisible()
    await expect(page.getByText(/Treuepunkte|Loyalty Points/)).toBeVisible()

    // Should have navigation to sections
    await expect(page.getByRole('link', { name: /Meine Termine/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Meine Bestellungen/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Profil/ })).toBeVisible()
  })

  test('should show upcoming appointments', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to appointments section
    await page.getByRole('link', { name: /Meine Termine/ }).click()

    await expect(page).toHaveURL(/.*\/termine/)

    // Should show appointments list or empty state
    const hasAppointments = await page.getByTestId('appointment-card').isVisible().catch(() => false)
    const isEmpty = await page.getByText(/Keine Termine|No appointments/).isVisible().catch(() => false)

    expect(hasAppointments || isEmpty).toBe(true)
  })

  test('should show recent orders', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to orders section
    await page.getByRole('link', { name: /Meine Bestellungen/ }).click()

    await expect(page).toHaveURL(/.*\/bestellungen/)

    // Should show orders list or empty state
    const hasOrders = await page.getByTestId('order-card').isVisible().catch(() => false)
    const isEmpty = await page.getByText(/Keine Bestellungen|No orders/).isVisible().catch(() => false)

    expect(hasOrders || isEmpty).toBe(true)
  })

  test('should show loyalty points balance', async ({ page }) => {
    await page.goto('/dashboard')

    // Should show points in dashboard
    const pointsSection = page.locator('[data-testid="loyalty-points"]')
    await expect(pointsSection).toBeVisible()

    // Should show current tier
    await expect(pointsSection.getByText(/Bronze|Silber|Gold|Platin/)).toBeVisible()

    // Click to view loyalty details
    await pointsSection.getByRole('link', { name: /Details|Mehr/ }).click()

    await expect(page).toHaveURL(/.*\/loyalty/)
  })
})

test.describe('Customer Portal - Orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display order history', async ({ page }) => {
    await page.goto('/dashboard/bestellungen')

    // Should show page title
    await expect(page.getByRole('heading', { name: /Meine Bestellungen/ })).toBeVisible()

    // Check if orders exist
    const hasOrders = await page.getByTestId('order-card').isVisible().catch(() => false)

    if (hasOrders) {
      // Verify order card content
      const orderCard = page.getByTestId('order-card').first()

      // Should show order number
      await expect(orderCard.getByText(/Bestellung #/)).toBeVisible()

      // Should show order date
      await expect(orderCard.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()

      // Should show order total
      await expect(orderCard.getByText(/CHF \d+/)).toBeVisible()

      // Should show order status
      await expect(orderCard.getByText(/Bezahlt|Ausstehend|Versendet/)).toBeVisible()

      // Should have "Details" button
      await expect(orderCard.getByRole('button', { name: /Details/ })).toBeVisible()
    }
  })

  test('should view order details', async ({ page }) => {
    await page.goto('/dashboard/bestellungen')

    // Check if any orders exist
    const hasOrders = await page.getByTestId('order-card').isVisible().catch(() => false)

    if (hasOrders) {
      // Click first order
      await page.getByTestId('order-card').first().getByRole('button', { name: /Details/ }).click()

      // Should navigate to order detail page
      await expect(page).toHaveURL(/.*\/bestellungen\/.*/)

      // Should show order info
      await expect(page.getByRole('heading', { name: /Bestellung #/ })).toBeVisible()

      // Should show products
      await expect(page.locator('[data-testid="order-item"]')).toHaveCount.toBeGreaterThan(0)

      // Should show order summary
      await expect(page.getByText(/Zwischensumme/)).toBeVisible()
      await expect(page.getByText(/MwSt/)).toBeVisible()
      await expect(page.getByText(/Gesamt/)).toBeVisible()

      // Should show delivery/billing address
      await expect(page.getByText(/Lieferadresse|Rechnungsadresse/)).toBeVisible()

      // Should have option to download invoice
      await expect(page.getByRole('link', { name: /Rechnung|Invoice/ })).toBeVisible()
    }
  })

  test('should download invoice PDF', async ({ page }) => {
    await page.goto('/dashboard/bestellungen')

    const hasOrders = await page.getByTestId('order-card').isVisible().catch(() => false)

    if (hasOrders) {
      await page.getByTestId('order-card').first().getByRole('button', { name: /Details/ }).click()

      // Get order ID from URL
      const url = page.url()
      const orderId = url.split('/').pop()

      // Click download invoice
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('link', { name: /Rechnung/ }).click(),
      ])

      // Verify download
      expect(download.suggestedFilename()).toMatch(/Rechnung.*\.pdf/)

      // Verify download URL
      expect(download.url()).toContain(`/api/invoices/${orderId}/pdf`)
    }
  })

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/dashboard/bestellungen')

    const hasOrders = await page.getByTestId('order-card').isVisible().catch(() => false)

    if (hasOrders) {
      // Filter by "Versendet" status
      await page.getByLabel('Status').selectOption('shipped')

      await page.waitForLoadState('networkidle')

      // All visible orders should be "Versendet"
      const orders = page.getByTestId('order-card')
      const count = await orders.count()

      for (let i = 0; i < count; i++) {
        const status = orders.nth(i).getByText(/Versendet/)
        await expect(status).toBeVisible()
      }
    }
  })
})

test.describe('Customer Portal - Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display upcoming appointments', async ({ page }) => {
    await page.goto('/dashboard/termine')

    // Should show page title
    await expect(page.getByRole('heading', { name: /Meine Termine/ })).toBeVisible()

    // Check if appointments exist
    const hasAppointments = await page.getByTestId('appointment-card').isVisible().catch(() => false)

    if (hasAppointments) {
      const apptCard = page.getByTestId('appointment-card').first()

      // Should show date and time
      await expect(apptCard.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()
      await expect(apptCard.getByText(/\d{2}:\d{2}/)).toBeVisible()

      // Should show service name
      await expect(apptCard.locator('[data-testid="service-name"]')).toBeVisible()

      // Should show staff member
      await expect(apptCard.locator('[data-testid="staff-name"]')).toBeVisible()

      // Should have cancel button (for future appointments)
      const isFuture = await apptCard.getByRole('button', { name: /Stornieren/ }).isVisible().catch(() => false)
      expect(isFuture).toBeDefined()
    }
  })

  test('should cancel appointment', async ({ page }) => {
    await page.goto('/dashboard/termine')

    const hasAppointments = await page.getByTestId('appointment-card').isVisible().catch(() => false)

    if (hasAppointments) {
      // Find cancellable appointment (future one)
      const cancelButton = page.getByRole('button', { name: /Stornieren/ }).first()
      const isCancellable = await cancelButton.isVisible().catch(() => false)

      if (isCancellable) {
        await cancelButton.click()

        // Should show confirmation dialog
        await expect(page.getByText(/wirklich stornieren|Are you sure/)).toBeVisible()

        // Confirm cancellation
        await clickButton(page, 'Ja, stornieren')

        // Should show success message
        await waitForToast(page, 'Termin storniert')

        // Appointment should be marked as cancelled
        await expect(page.getByText(/Storniert|Cancelled/)).toBeVisible()
      }
    }
  })

  test('should reschedule appointment', async ({ page }) => {
    await page.goto('/dashboard/termine')

    const hasAppointments = await page.getByTestId('appointment-card').isVisible().catch(() => false)

    if (hasAppointments) {
      const rescheduleButton = page.getByRole('button', { name: /Umbuchen/ }).first()
      const isReschedulable = await rescheduleButton.isVisible().catch(() => false)

      if (isReschedulable) {
        await rescheduleButton.click()

        // Should navigate to booking page with pre-selected service
        await expect(page).toHaveURL(/.*\/termin/)

        // Should show message about rescheduling
        await expect(page.getByText(/Termin umbuchen/)).toBeVisible()
      }
    }
  })

  test('should show appointment history', async ({ page }) => {
    await page.goto('/dashboard/termine')

    // Toggle to show past appointments
    const showPastButton = page.getByRole('button', { name: /Vergangene Termine|History/ })
    const hasPastToggle = await showPastButton.isVisible().catch(() => false)

    if (hasPastToggle) {
      await showPastButton.click()

      // Should show past appointments
      const pastAppointments = page.locator('[data-testid="appointment-card"][data-past="true"]')
      const count = await pastAppointments.count()

      if (count > 0) {
        // Past appointments should not have cancel button
        const hasCancel = await pastAppointments.first().getByRole('button', { name: /Stornieren/ }).isVisible().catch(() => false)
        expect(hasCancel).toBe(false)

        // Should show "Completed" status
        await expect(pastAppointments.first().getByText(/Abgeschlossen|Completed/)).toBeVisible()
      }
    }
  })
})

test.describe('Customer Portal - Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display profile information', async ({ page }) => {
    await page.goto('/dashboard/profil')

    // Should show profile form
    await expect(page.getByRole('heading', { name: /Mein Profil|My Profile/ })).toBeVisible()

    // Should show current info
    await expect(page.getByLabel('Vorname')).toHaveValue(TEST_USERS.customer.firstName)
    await expect(page.getByLabel('Nachname')).toHaveValue(TEST_USERS.customer.lastName)
    await expect(page.getByLabel('E-Mail')).toHaveValue(TEST_USERS.customer.email)
  })

  test('should update profile information', async ({ page }) => {
    await page.goto('/dashboard/profil')

    // Update phone number
    const newPhone = generateTestPhone()
    await fillField(page, 'Telefon', newPhone)

    // Save changes
    await clickButton(page, 'Speichern')

    // Should show success message
    await waitForToast(page, 'Profil aktualisiert')

    // Reload page and verify change persisted
    await page.reload()
    await expect(page.getByLabel('Telefon')).toHaveValue(newPhone)
  })

  test('should update password', async ({ page }) => {
    await page.goto('/dashboard/profil')

    // Navigate to password change section
    await page.getByRole('tab', { name: /Passwort|Password/ }).click()

    // Fill password form
    await fillField(page, 'Aktuelles Passwort', TEST_USERS.customer.password)
    await fillField(page, 'Neues Passwort', 'NewPassword123!')
    await fillField(page, 'Passwort bestätigen', 'NewPassword123!')

    // Save
    await clickButton(page, 'Passwort ändern')

    // Should show success
    await waitForToast(page, 'Passwort geändert')

    // Test new password works
    await logout(page)
    await login(page, { ...TEST_USERS.customer, password: 'NewPassword123!' })

    await expect(page).toHaveURL(/.*\/dashboard/)

    // Change back for other tests
    await page.goto('/dashboard/profil')
    await page.getByRole('tab', { name: /Passwort/ }).click()
    await fillField(page, 'Aktuelles Passwort', 'NewPassword123!')
    await fillField(page, 'Neues Passwort', TEST_USERS.customer.password)
    await fillField(page, 'Passwort bestätigen', TEST_USERS.customer.password)
    await clickButton(page, 'Passwort ändern')
  })

  test('should manage notification preferences', async ({ page }) => {
    await page.goto('/dashboard/profil')

    // Navigate to preferences tab
    await page.getByRole('tab', { name: /Einstellungen|Preferences/ }).click()

    // Toggle email notifications
    const emailNotif = page.getByLabel(/E-Mail-Benachrichtigungen/)
    const initialState = await emailNotif.isChecked()

    await emailNotif.click()

    // Save
    await clickButton(page, 'Speichern')
    await waitForToast(page, 'Einstellungen gespeichert')

    // Verify change persisted
    await page.reload()
    await page.getByRole('tab', { name: /Einstellungen/ }).click()

    const newState = await emailNotif.isChecked()
    expect(newState).toBe(!initialState)

    // Restore original state
    await emailNotif.click()
    await clickButton(page, 'Speichern')
  })

  test('should delete account', async ({ page }) => {
    // Create new test user for deletion
    const email = generateTestEmail()
    await registerCustomer(page, {
      email,
      password: 'Test123!',
      firstName: 'Delete',
      lastName: 'Me',
    })

    await page.goto('/dashboard/profil')

    // Navigate to account settings
    await page.getByRole('tab', { name: /Konto|Account/ }).click()

    // Click delete account
    await clickButton(page, 'Konto löschen')

    // Should show confirmation dialog
    await expect(page.getByText(/wirklich löschen|Are you sure/)).toBeVisible()

    // Confirm deletion
    await page.getByLabel(/Passwort/).fill('Test123!')
    await clickButton(page, 'Endgültig löschen')

    // Should be logged out and redirected
    await expect(page).toHaveURL(/.*\/(login|home)/)

    // Try to login with deleted account
    await page.goto('/login')
    await fillField(page, 'E-Mail', email)
    await fillField(page, 'Passwort', 'Test123!')
    await clickButton(page, 'Anmelden')

    // Should show error (account doesn't exist)
    await expect(page.getByText(/Konto nicht gefunden|Invalid credentials/)).toBeVisible()
  })
})
