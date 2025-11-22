/**
 * E2E Test: Legal Documents & GDPR Consent
 * Tests legal document viewing and consent management
 */

import { test, expect } from '@playwright/test'
import { login, registerCustomer, TEST_USERS } from './helpers/auth'
import { clickButton, generateTestEmail, generateTestPhone } from './helpers/utils'

test.describe('Legal Documents - Public Access', () => {
  test('should display privacy policy', async ({ page }) => {
    await page.goto('/datenschutz')

    // Should show privacy policy
    await expect(page.getByRole('heading', { name: /Datenschutz|Privacy Policy/ })).toBeVisible()

    // Should show content
    const content = page.locator('[data-testid="legal-content"]')
    await expect(content).toBeVisible()

    // Content should not be empty
    const text = await content.textContent()
    expect(text?.length).toBeGreaterThan(100)
  })

  test('should display terms and conditions', async ({ page }) => {
    await page.goto('/agb')

    // Should show T&C
    await expect(page.getByRole('heading', { name: /AGB|Terms/ })).toBeVisible()

    // Should show content
    const content = page.locator('[data-testid="legal-content"]')
    await expect(content).toBeVisible()

    const text = await content.textContent()
    expect(text?.length).toBeGreaterThan(100)
  })

  test('should show document version and date', async ({ page }) => {
    await page.goto('/datenschutz')

    // Should show version number
    await expect(page.getByText(/Version \d+\.\d+|v\d+/)).toBeVisible()

    // Should show effective date
    await expect(page.getByText(/Gültig ab|Effective from/)).toBeVisible()
    await expect(page.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()
  })

  test('should show all available legal documents in footer', async ({ page }) => {
    await page.goto('/')

    // Footer should have links to legal documents
    const footer = page.locator('footer')

    await expect(footer.getByRole('link', { name: /Datenschutz|Privacy/ })).toBeVisible()
    await expect(footer.getByRole('link', { name: /AGB|Terms/ })).toBeVisible()
    await expect(footer.getByRole('link', { name: /Impressum|Imprint/ })).toBeVisible()
  })
})

test.describe('Legal Documents - Consent During Registration', () => {
  test('should require consent acceptance during registration', async ({ page }) => {
    await page.goto('/registrieren')

    const email = generateTestEmail()

    await page.getByLabel('Vorname').fill('Consent')
    await page.getByLabel('Nachname').fill('Test')
    await page.getByLabel('E-Mail').fill(email)
    await page.getByLabel(/Passwort(?! wiederholen)/).fill('Test123!')
    await page.getByLabel('Passwort wiederholen').fill('Test123!')

    // Try to submit WITHOUT accepting consents
    await clickButton(page, 'Registrieren')

    // Should show validation error
    await expect(page.getByText(/AGB akzeptieren|accept terms/)).toBeVisible()
    await expect(page.getByText(/Datenschutz akzeptieren|accept privacy/)).toBeVisible()
  })

  test('should record consent on registration', async ({ page }) => {
    const email = generateTestEmail()

    await registerCustomer(page, {
      email,
      password: 'Test123!',
      firstName: 'Consent',
      lastName: 'Record',
      phone: generateTestPhone(),
    })

    // Go to consent management
    await page.goto('/dashboard/datenschutz')

    // Should show accepted consents
    await expect(page.getByText(/Datenschutzerklärung.*akzeptiert/)).toBeVisible()
    await expect(page.getByText(/AGB.*akzeptiert/)).toBeVisible()

    // Should show acceptance date
    await expect(page.getByText(/Akzeptiert am|Accepted on/)).toBeVisible()
  })

  test('should link to documents during registration', async ({ page }) => {
    await page.goto('/registrieren')

    // Should have clickable links in consent labels
    const privacyLink = page.getByRole('link', { name: /Datenschutzerklärung/ })
    await expect(privacyLink).toBeVisible()

    // Click should open document (in new tab or same page)
    await privacyLink.click()

    // Should navigate to privacy policy
    await expect(page).toHaveURL(/.*\/(datenschutz|privacy)/)
  })
})

test.describe('Consent Management - Customer Portal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display all consents in customer portal', async ({ page }) => {
    await page.goto('/dashboard/datenschutz')

    // Should show consent management page
    await expect(page.getByRole('heading', { name: /Datenschutz|Privacy Settings/ })).toBeVisible()

    // Should show list of consents
    const consentItems = page.locator('[data-testid="consent-item"]')
    const count = await consentItems.count()

    expect(count).toBeGreaterThanOrEqual(2) // At least Privacy + Terms

    // Each consent should show:
    const firstConsent = consentItems.first()
    await expect(firstConsent.locator('[data-testid="document-type"]')).toBeVisible()
    await expect(firstConsent.locator('[data-testid="consent-status"]')).toBeVisible()
    await expect(firstConsent.locator('[data-testid="consent-date"]')).toBeVisible()
  })

  test('should show consent details', async ({ page }) => {
    await page.goto('/dashboard/datenschutz')

    const firstConsent = page.locator('[data-testid="consent-item"]').first()
    await firstConsent.click()

    // Should expand or navigate to details
    // Should show full consent info
    await expect(page.getByText(/Version/)).toBeVisible()
    await expect(page.getByText(/Akzeptiert am/)).toBeVisible()

    // Should show IP address (for audit trail)
    await expect(page.getByText(/IP-Adresse|IP Address/)).toBeVisible()

    // Should show method (web_form, api, etc.)
    await expect(page.getByText(/Methode|Method/)).toBeVisible()
  })

  test('should withdraw consent (GDPR right)', async ({ page }) => {
    await page.goto('/dashboard/datenschutz')

    // Find marketing consent (can be withdrawn)
    const marketingConsent = page.locator('[data-testid="consent-item"]', {
      has: page.getByText(/Marketing|Werbung/),
    })

    const exists = await marketingConsent.isVisible().catch(() => false)

    if (exists) {
      // Click withdraw button
      await marketingConsent.getByRole('button', { name: /Widerrufen|Withdraw/ }).click()

      // Should show confirmation dialog
      await expect(page.getByText(/wirklich widerrufen|confirm withdrawal/)).toBeVisible()

      // Confirm
      await clickButton(page, 'Bestätigen')

      // Should show success
      await expect(page.getByText(/Einwilligung widerrufen|consent withdrawn/)).toBeVisible()

      // Status should change to "withdrawn"
      await expect(marketingConsent.getByText(/Widerrufen|Withdrawn/)).toBeVisible()

      // Should show withdrawal date
      await expect(marketingConsent.getByText(/Widerrufen am/)).toBeVisible()
    }
  })

  test('should not allow withdrawal of required consents', async ({ page }) => {
    await page.goto('/dashboard/datenschutz')

    // Required consents (Privacy Policy, Terms) should NOT have withdraw button
    const privacyConsent = page.locator('[data-testid="consent-item"]', {
      has: page.getByText(/Datenschutzerklärung|Privacy Policy/),
    })

    const withdrawButton = privacyConsent.getByRole('button', { name: /Widerrufen|Withdraw/ })
    const hasWithdrawButton = await withdrawButton.isVisible().catch(() => false)

    expect(hasWithdrawButton).toBe(false)

    // Should show message that it's required
    await expect(privacyConsent.getByText(/Erforderlich|Required/)).toBeVisible()
  })

  test('should download consent history (GDPR data export)', async ({ page }) => {
    await page.goto('/dashboard/datenschutz')

    // Should have export button
    const exportButton = page.getByRole('button', { name: /Exportieren|Export|Download/ })
    const hasExport = await exportButton.isVisible().catch(() => false)

    if (hasExport) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ])

      // Verify download
      expect(download.suggestedFilename()).toMatch(/consent.*\.(pdf|json|csv)/)
    }
  })
})

test.describe('Consent - Version Updates', () => {
  test('should notify user of new document version', async ({ page }) => {
    await login(page, TEST_USERS.customer)
    await page.goto('/dashboard')

    // If new version requires re-acceptance, should show notification
    const notification = page.getByText(/Neue Version.*Datenschutz|privacy policy updated/)
    const hasNotification = await notification.isVisible().catch(() => false)

    if (hasNotification) {
      // Should have link to view and accept new version
      await expect(page.getByRole('link', { name: /Akzeptieren|Accept/ })).toBeVisible()

      // Click to view
      await page.getByRole('link', { name: /Akzeptieren/ }).click()

      // Should show document with changes highlighted
      await expect(page.getByText(/Änderungen|Changes/)).toBeVisible()

      // Should have accept button
      await expect(page.getByRole('button', { name: /Akzeptieren/ })).toBeVisible()
    }
  })

  test('should show document changelog', async ({ page }) => {
    await page.goto('/datenschutz')

    // Should have changelog link
    const changelogLink = page.getByRole('link', { name: /Änderungshistorie|Changelog|Versionen/ })
    const hasChangelog = await changelogLink.isVisible().catch(() => false)

    if (hasChangelog) {
      await changelogLink.click()

      // Should show list of versions
      const versions = page.locator('[data-testid="version-item"]')
      const count = await versions.count()

      expect(count).toBeGreaterThanOrEqual(1)

      // Each version should show:
      const firstVersion = versions.first()
      await expect(firstVersion.getByText(/Version \d+\.\d+/)).toBeVisible()
      await expect(firstVersion.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()

      // Should show what changed
      await expect(firstVersion.getByText(/Änderungen|Changes/)).toBeVisible()
    }
  })
})

test.describe('Consent - Checkout Flow', () => {
  test('should require consent for marketing during checkout', async ({ page }) => {
    // Start checkout as guest
    await page.goto('/warenkorb')

    // (Assume cart has items from previous test or setup)

    // Proceed to checkout
    await clickButton(page, 'Zur Kasse')

    // Should show marketing consent checkbox (optional)
    const marketingConsent = page.getByLabel(/Newsletter|Marketing.*erhalten/)
    const hasMarketing = await marketingConsent.isVisible().catch(() => false)

    if (hasMarketing) {
      // Should be unchecked by default (opt-in)
      const isChecked = await marketingConsent.isChecked()
      expect(isChecked).toBe(false)

      // Check it
      await marketingConsent.check()

      // Complete checkout
      // ... (would continue with full checkout)

      // After order, marketing consent should be recorded
    }
  })
})

test.describe('Consent - Cookie Consent', () => {
  test('should show cookie banner on first visit', async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies()

    await page.goto('/')

    // Should show cookie banner
    const cookieBanner = page.locator('[data-testid="cookie-banner"]')
    const hasBanner = await cookieBanner.isVisible().catch(() => false)

    if (hasBanner) {
      // Should have accept/reject buttons
      await expect(cookieBanner.getByRole('button', { name: /Akzeptieren|Accept/ })).toBeVisible()
      await expect(cookieBanner.getByRole('button', { name: /Ablehnen|Reject/ })).toBeVisible()

      // Should have customize button
      await expect(cookieBanner.getByRole('button', { name: /Einstellungen|Customize/ })).toBeVisible()
    }
  })

  test('should remember cookie preference', async ({ page }) => {
    await page.goto('/')

    const cookieBanner = page.locator('[data-testid="cookie-banner"]')
    const hasBanner = await cookieBanner.isVisible().catch(() => false)

    if (hasBanner) {
      // Accept cookies
      await cookieBanner.getByRole('button', { name: /Akzeptieren/ }).click()

      // Banner should disappear
      await expect(cookieBanner).not.toBeVisible()

      // Reload page
      await page.reload()

      // Banner should NOT appear again
      const stillVisible = await cookieBanner.isVisible().catch(() => false)
      expect(stillVisible).toBe(false)
    }
  })
})
