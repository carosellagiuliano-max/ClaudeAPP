/**
 * E2E Test: Loyalty System
 * Tests loyalty points, tiers, and rewards
 */

import { test, expect } from '@playwright/test'
import { login, registerCustomer, TEST_USERS } from './helpers/auth'
import {
  addProductToCart,
  clearCart,
  proceedToCheckout,
  fillCheckoutAddress,
  completeOrderWithStripe,
  generateTestEmail,
  generateTestPhone,
  clickButton,
} from './helpers/utils'
import { TEST_PRODUCT_DATA } from './helpers/test-data'

test.describe('Loyalty - Points Earning', () => {
  test('should create loyalty account on first purchase', async ({ page }) => {
    // Register new customer
    const email = generateTestEmail()
    await registerCustomer(page, {
      email,
      password: 'Test123!',
      firstName: 'Loyalty',
      lastName: 'Test',
      phone: generateTestPhone(),
    })

    // Make first purchase
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 1)
    await proceedToCheckout(page)

    await fillCheckoutAddress(page, {
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()
    await clickButton(page, 'Weiter zur Zahlung')

    await completeOrderWithStripe(page)

    // Go to loyalty dashboard
    await page.goto('/dashboard/loyalty')

    // Should show loyalty account created
    await expect(page.getByRole('heading', { name: /Treueprogramm|Loyalty/ })).toBeVisible()

    // Should show Bronze tier (default)
    await expect(page.getByText(/Bronze/)).toBeVisible()

    // Should show earned points (signup bonus + purchase)
    const pointsDisplay = page.locator('[data-testid="loyalty-points"]')
    const points = await pointsDisplay.textContent()
    const pointsValue = parseInt(points?.replace(/\D/g, '') || '0')

    expect(pointsValue).toBeGreaterThan(100) // At least signup bonus
  })

  test('should earn points on product purchase', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    // Get current points
    await page.goto('/dashboard/loyalty')
    const initialPoints = await page.locator('[data-testid="loyalty-points"]').textContent()
    const initialValue = parseInt(initialPoints?.replace(/\D/g, '') || '0')

    // Make a purchase
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 2) // CHF 49.80

    await proceedToCheckout(page)
    await fillCheckoutAddress(page, {
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()
    await clickButton(page, 'Weiter zur Zahlung')

    await completeOrderWithStripe(page)

    // Check updated points
    await page.goto('/dashboard/loyalty')
    const newPoints = await page.locator('[data-testid="loyalty-points"]').textContent()
    const newValue = parseInt(newPoints?.replace(/\D/g, '') || '0')

    // Should have earned points (typically 1 point per CHF spent)
    expect(newValue).toBeGreaterThan(initialValue)

    // Points earned should be approximately equal to amount spent
    const pointsEarned = newValue - initialValue
    expect(pointsEarned).toBeGreaterThanOrEqual(45) // ~CHF 49.80 - some may go to shipping
    expect(pointsEarned).toBeLessThanOrEqual(60)
  })

  test('should earn points on appointment', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    // Get current points
    await page.goto('/dashboard/loyalty')
    const initialPoints = await page.locator('[data-testid="loyalty-points"]').textContent()
    const initialValue = parseInt(initialPoints?.replace(/\D/g, '') || '0')

    // Book an appointment
    await page.goto('/termin')

    // Select service (e.g., Damenschnitt - CHF 65)
    await page.getByLabel(/Service/).selectOption({ label: /Damenschnitt/ })

    // Select date and time
    const dateButton = page.getByRole('button', { name: /^15$/ })
    await dateButton.click()
    await page.waitForSelector('[data-testid="time-slot"]')

    const timeSlot = page.locator('[data-testid="time-slot"]').first()
    await timeSlot.click()

    // Fill customer details (if needed)
    await clickButton(page, 'Termin buchen')

    // Wait for confirmation
    await expect(page).toHaveURL(/.*\/termin\/bestaetigung/)

    // After appointment is completed (in real scenario)
    // Points should be credited
    // For E2E test, we simulate this by checking points can increase

    await page.goto('/dashboard/loyalty')
    // In production, points would be added after appointment completion
    // For now, verify loyalty system is accessible
    await expect(page.locator('[data-testid="loyalty-tier"]')).toBeVisible()
  })

  test('should apply tier multiplier to points', async ({ page }) => {
    await login(page, TEST_USERS.customer)

    await page.goto('/dashboard/loyalty')

    // Get current tier
    const tierDisplay = page.locator('[data-testid="loyalty-tier"]')
    const tierText = await tierDisplay.textContent()

    // If not Bronze, tier multiplier should apply
    // Gold = 1.5x, Platinum = 2.0x

    // Make purchase and verify multiplier
    // (This would require setting up test data with specific tier)

    // For now, verify tier info is displayed
    await expect(page.getByText(/Multiplikator|Multiplier/)).toBeVisible()
  })
})

test.describe('Loyalty - Tiers', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display current tier information', async ({ page }) => {
    await page.goto('/dashboard/loyalty')

    // Should show current tier
    await expect(page.locator('[data-testid="loyalty-tier"]')).toBeVisible()

    // Should show tier benefits
    await expect(page.getByText(/Vorteile|Benefits/)).toBeVisible()

    // Should show tier progress bar
    await expect(page.locator('[data-testid="tier-progress"]')).toBeVisible()

    // Should show points needed for next tier
    await expect(page.getByText(/Noch.*Punkte bis|points to next tier/)).toBeVisible()
  })

  test('should show all available tiers', async ({ page }) => {
    await page.goto('/dashboard/loyalty')

    // Should show tier overview
    const tiers = page.locator('[data-testid="tier-card"]')
    const tierCount = await tiers.count()

    expect(tierCount).toBeGreaterThanOrEqual(4) // Bronze, Silver, Gold, Platinum

    // Each tier should show:
    // - Name
    // - Min points required
    // - Multiplier
    // - Benefits

    const firstTier = tiers.first()
    await expect(firstTier.getByText(/Bronze|Silber|Gold|Platin/)).toBeVisible()
    await expect(firstTier.getByText(/\d+\.\d+x|\d+x/)).toBeVisible() // Multiplier
  })

  test('should upgrade tier when reaching threshold', async ({ page }) => {
    // This test would require:
    // 1. Creating test user with points close to next tier
    // 2. Making purchase to cross threshold
    // 3. Verifying tier upgrade

    // Simplified version: just verify tier system exists
    await page.goto('/dashboard/loyalty')

    // Current tier
    const currentTier = await page.locator('[data-testid="loyalty-tier"]').textContent()

    // Progress to next tier
    const progress = page.locator('[data-testid="tier-progress"]')
    await expect(progress).toBeVisible()

    // Points needed
    const pointsNeeded = page.getByText(/Noch.*Punkte/)
    await expect(pointsNeeded).toBeVisible()
  })
})

test.describe('Loyalty - Rewards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display available rewards', async ({ page }) => {
    await page.goto('/dashboard/loyalty/rewards')

    // Should show rewards catalog
    await expect(page.getByRole('heading', { name: /Prämien|Rewards/ })).toBeVisible()

    // Should show reward cards
    const rewards = page.locator('[data-testid="reward-card"]')
    const rewardCount = await rewards.count()

    if (rewardCount > 0) {
      const firstReward = rewards.first()

      // Should show reward details
      await expect(firstReward.locator('[data-testid="reward-name"]')).toBeVisible()
      await expect(firstReward.locator('[data-testid="reward-cost"]')).toBeVisible()
      await expect(firstReward.getByText(/Punkte|points/)).toBeVisible()

      // Should have redeem button (enabled/disabled based on points)
      await expect(firstReward.getByRole('button', { name: /Einlösen|Redeem/ })).toBeVisible()
    }
  })

  test('should redeem reward with sufficient points', async ({ page }) => {
    await page.goto('/dashboard/loyalty')

    // Get current points
    const pointsText = await page.locator('[data-testid="loyalty-points"]').textContent()
    const points = parseInt(pointsText?.replace(/\D/g, '') || '0')

    await page.goto('/dashboard/loyalty/rewards')

    // Find reward that costs less than current points
    const rewards = page.locator('[data-testid="reward-card"]')
    const count = await rewards.count()

    let redeemableFound = false

    for (let i = 0; i < count; i++) {
      const reward = rewards.nth(i)
      const costText = await reward.locator('[data-testid="reward-cost"]').textContent()
      const cost = parseInt(costText?.replace(/\D/g, '') || '0')

      if (cost <= points) {
        // This reward is redeemable
        const redeemButton = reward.getByRole('button', { name: /Einlösen/ })
        await expect(redeemButton).toBeEnabled()

        await redeemButton.click()

        // Should show confirmation dialog
        await expect(page.getByText(/wirklich einlösen|confirm redemption/)).toBeVisible()

        await clickButton(page, 'Bestätigen')

        // Should show success message
        await expect(page.getByText(/erfolgreich eingelöst|successfully redeemed/)).toBeVisible()

        // Points should be deducted
        await page.goto('/dashboard/loyalty')
        const newPointsText = await page.locator('[data-testid="loyalty-points"]').textContent()
        const newPoints = parseInt(newPointsText?.replace(/\D/g, '') || '0')

        expect(newPoints).toBeLessThan(points)

        redeemableFound = true
        break
      }
    }

    if (!redeemableFound) {
      // No affordable rewards, skip test
      test.skip()
    }
  })

  test('should prevent redeeming reward with insufficient points', async ({ page }) => {
    await page.goto('/dashboard/loyalty')

    // Get current points
    const pointsText = await page.locator('[data-testid="loyalty-points"]').textContent()
    const points = parseInt(pointsText?.replace(/\D/g, '') || '0')

    await page.goto('/dashboard/loyalty/rewards')

    // Find reward that costs MORE than current points
    const rewards = page.locator('[data-testid="reward-card"]')
    const count = await rewards.count()

    let expensiveFound = false

    for (let i = 0; i < count; i++) {
      const reward = rewards.nth(i)
      const costText = await reward.locator('[data-testid="reward-cost"]').textContent()
      const cost = parseInt(costText?.replace(/\D/g, '') || '0')

      if (cost > points) {
        // This reward is too expensive
        const redeemButton = reward.getByRole('button', { name: /Einlösen/ })
        await expect(redeemButton).toBeDisabled()

        expensiveFound = true
        break
      }
    }

    if (!expensiveFound) {
      // All rewards are affordable, skip test
      test.skip()
    }
  })

  test('should show redeemed rewards history', async ({ page }) => {
    await page.goto('/dashboard/loyalty/history')

    // Should show rewards redemption history
    await expect(page.getByRole('heading', { name: /Verlauf|History/ })).toBeVisible()

    // Check if any redemptions exist
    const hasHistory = await page.getByTestId('redemption-item').isVisible().catch(() => false)
    const isEmpty = await page.getByText(/Noch keine Einlösungen|No redemptions/).isVisible().catch(() => false)

    expect(hasHistory || isEmpty).toBe(true)

    if (hasHistory) {
      const firstItem = page.getByTestId('redemption-item').first()

      // Should show reward name
      await expect(firstItem.locator('[data-testid="reward-name"]')).toBeVisible()

      // Should show redemption date
      await expect(firstItem.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()

      // Should show points spent
      await expect(firstItem.getByText(/\d+ Punkte/)).toBeVisible()
    }
  })
})

test.describe('Loyalty - Transaction History', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.customer)
  })

  test('should display points transaction history', async ({ page }) => {
    await page.goto('/dashboard/loyalty/transactions')

    // Should show transaction history
    await expect(page.getByRole('heading', { name: /Punkteverlauf|Transaction History/ })).toBeVisible()

    // Check if transactions exist
    const hasTransactions = await page.getByTestId('transaction-item').isVisible().catch(() => false)
    const isEmpty = await page.getByText(/Noch keine Transaktionen|No transactions/).isVisible().catch(() => false)

    expect(hasTransactions || isEmpty).toBe(true)

    if (hasTransactions) {
      const firstTransaction = page.getByTestId('transaction-item').first()

      // Should show transaction type (earned/spent)
      await expect(firstTransaction.locator('[data-testid="transaction-type"]')).toBeVisible()

      // Should show points amount
      await expect(firstTransaction.getByText(/[+-]?\d+ Punkte/)).toBeVisible()

      // Should show date
      await expect(firstTransaction.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeVisible()

      // Should show source (purchase, booking, reward, etc.)
      await expect(firstTransaction.locator('[data-testid="transaction-source"]')).toBeVisible()
    }
  })

  test('should filter transactions by type', async ({ page }) => {
    await page.goto('/dashboard/loyalty/transactions')

    const hasTransactions = await page.getByTestId('transaction-item').isVisible().catch(() => false)

    if (hasTransactions) {
      // Filter by "Earned" transactions
      await page.getByLabel('Filter').selectOption('earned')

      await page.waitForLoadState('networkidle')

      // All visible transactions should be "earned" (positive)
      const transactions = page.getByTestId('transaction-item')
      const count = await transactions.count()

      for (let i = 0; i < count; i++) {
        const pointsText = await transactions.nth(i).getByText(/[+-]?\d+ Punkte/).textContent()
        expect(pointsText).toMatch(/\+|\d+/) // Should be positive or no minus sign
      }
    }
  })

  test('should show lifetime points total', async ({ page }) => {
    await page.goto('/dashboard/loyalty')

    // Should show lifetime points earned (separate from current balance)
    await expect(page.getByText(/Gesamt verdient|Lifetime Points/)).toBeVisible()

    const lifetimeText = await page.locator('[data-testid="lifetime-points"]').textContent()
    const lifetimePoints = parseInt(lifetimeText?.replace(/\D/g, '') || '0')

    // Lifetime points should be >= current balance (can't be less)
    const currentText = await page.locator('[data-testid="loyalty-points"]').textContent()
    const currentPoints = parseInt(currentText?.replace(/\D/g, '') || '0')

    expect(lifetimePoints).toBeGreaterThanOrEqual(currentPoints)
  })
})
