/**
 * E2E Test: Vouchers & Discounts
 * Tests voucher code validation and application
 */

import { test, expect } from '@playwright/test'
import {
  addProductToCart,
  clearCart,
  proceedToCheckout,
  fillCheckoutAddress,
  waitForToast,
  clickButton,
  fillField,
  generateTestEmail,
} from './helpers/utils'
import { TEST_PRODUCT_DATA } from './helpers/test-data'

test.describe('Vouchers - Code Validation', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page)
    // Add products worth CHF 100+ to test min order value
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 3)
    await addProductToCart(page, TEST_PRODUCT_DATA.wellaConditioner.name, 2)
  })

  test('should apply valid percentage voucher', async ({ page }) => {
    await page.goto('/warenkorb')

    // Get original total
    const originalTotal = await page.locator('[data-testid="cart-total"]').textContent()
    const originalAmount = parseFloat(originalTotal?.replace(/[^\d.]/g, '') || '0')

    // Apply 10% voucher
    await fillField(page, 'Gutscheincode', 'TEST10')
    await clickButton(page, 'Anwenden')

    // Should show success message
    await waitForToast(page, 'Gutschein angewendet')

    // Wait for total to update
    await page.waitForTimeout(1000)

    // Total should be reduced by 10%
    const newTotal = await page.locator('[data-testid="cart-total"]').textContent()
    const newAmount = parseFloat(newTotal?.replace(/[^\d.]/g, '') || '0')

    const expectedDiscount = originalAmount * 0.1
    const expectedTotal = originalAmount - expectedDiscount

    expect(newAmount).toBeCloseTo(expectedTotal, 2)

    // Should show discount line in summary
    await expect(page.getByText(/Rabatt.*10%/)).toBeVisible()
  })

  test('should apply valid fixed amount voucher', async ({ page }) => {
    await page.goto('/warenkorb')

    // Get original total
    const originalTotal = await page.locator('[data-testid="cart-total"]').textContent()
    const originalAmount = parseFloat(originalTotal?.replace(/[^\d.]/g, '') || '0')

    // Apply CHF 50 voucher
    await fillField(page, 'Gutscheincode', 'FIXED50')
    await clickButton(page, 'Anwenden')

    await waitForToast(page, 'Gutschein angewendet')

    // Wait for total to update
    await page.waitForTimeout(1000)

    // Total should be reduced by CHF 50
    const newTotal = await page.locator('[data-testid="cart-total"]').textContent()
    const newAmount = parseFloat(newTotal?.replace(/[^\d.]/g, '') || '0')

    expect(newAmount).toBeCloseTo(originalAmount - 50, 2)

    // Should show discount line
    await expect(page.getByText(/Rabatt.*CHF 50/)).toBeVisible()
  })

  test('should reject invalid voucher code', async ({ page }) => {
    await page.goto('/warenkorb')

    // Try invalid code
    await fillField(page, 'Gutscheincode', 'INVALID123')
    await clickButton(page, 'Anwenden')

    // Should show error message
    await expect(page.getByText(/Ungültiger Gutscheincode|Code nicht gefunden/)).toBeVisible()

    // Total should not change
    const total = await page.locator('[data-testid="cart-total"]').textContent()
    expect(total).toBeTruthy()

    // Should not show discount line
    const discountLine = page.getByText(/Rabatt/)
    const isVisible = await discountLine.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('should reject expired voucher', async ({ page }) => {
    await page.goto('/warenkorb')

    // Try expired code
    await fillField(page, 'Gutscheincode', 'EXPIRED')
    await clickButton(page, 'Anwenden')

    // Should show expiry error
    await expect(
      page.getByText(/Gutschein abgelaufen|Nicht mehr gültig/)
    ).toBeVisible()
  })

  test('should enforce minimum order value', async ({ page }) => {
    // Clear cart and add only small item
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.schwarzkopfSpray.name, 1) // CHF 18.90

    await page.goto('/warenkorb')

    // Try voucher with min order value CHF 50
    await fillField(page, 'Gutscheincode', 'MIN50')
    await clickButton(page, 'Anwenden')

    // Should show min order value error
    await expect(
      page.getByText(/Mindestbestellwert|Bestellwert zu niedrig/)
    ).toBeVisible()
  })

  test('should remove applied voucher', async ({ page }) => {
    await page.goto('/warenkorb')

    // Get original total
    const originalTotal = await page.locator('[data-testid="cart-total"]').textContent()

    // Apply voucher
    await fillField(page, 'Gutscheincode', 'TEST10')
    await clickButton(page, 'Anwenden')
    await waitForToast(page, 'Gutschein angewendet')
    await page.waitForTimeout(1000)

    // Remove voucher
    await clickButton(page, 'Gutschein entfernen')

    // Total should return to original
    await page.waitForTimeout(1000)
    const finalTotal = await page.locator('[data-testid="cart-total"]').textContent()
    expect(finalTotal).toBe(originalTotal)
  })
})

test.describe('Vouchers - Usage Restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 5)
  })

  test('should prevent reusing single-use voucher', async ({ page }) => {
    await page.goto('/warenkorb')

    // Apply single-use voucher
    await fillField(page, 'Gutscheincode', 'SINGLE')
    await clickButton(page, 'Anwenden')

    await waitForToast(page, 'Gutschein angewendet')

    // Proceed with checkout
    await proceedToCheckout(page)

    await fillCheckoutAddress(page, {
      firstName: 'Test',
      lastName: 'Single',
      email: generateTestEmail(),
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    // Complete order (simplified - just verify voucher is applied)
    // In real test, would complete full payment flow

    // Try using same code again in new order
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.wellaConditioner.name, 3)
    await page.goto('/warenkorb')

    await fillField(page, 'Gutscheincode', 'SINGLE')
    await clickButton(page, 'Anwenden')

    // Should show "already used" error
    await expect(
      page.getByText(/bereits verwendet|Bereits eingelöst/)
    ).toBeVisible()
  })

  test('should enforce customer-specific vouchers', async ({ page }) => {
    // Test as guest (no customer ID)
    await page.goto('/warenkorb')

    // Try customer-specific voucher
    await fillField(page, 'Gutscheincode', 'CUSTOMER123')
    await clickButton(page, 'Anwenden')

    // Should show "not eligible" error
    await expect(
      page.getByText(/nicht berechtigt|nur für bestimmte Kunden/)
    ).toBeVisible()
  })

  test('should allow multiple vouchers if permitted', async ({ page }) => {
    await page.goto('/warenkorb')

    // Apply first voucher
    await fillField(page, 'Gutscheincode', 'MULTI1')
    await clickButton(page, 'Anwenden')
    await waitForToast(page, 'Gutschein angewendet')
    await page.waitForTimeout(500)

    // Try second voucher
    await fillField(page, 'Gutscheincode', 'MULTI2')
    await clickButton(page, 'Anwenden')

    // Should either:
    // 1. Allow both (if system supports stacking)
    // 2. Replace first with second
    // 3. Show error that only one allowed

    const successVisible = await page.getByText(/Gutschein angewendet/).isVisible().catch(() => false)
    const errorVisible = await page.getByText(/nur ein Gutschein|nicht kombinierbar/).isVisible().catch(() => false)

    // One of these should be true
    expect(successVisible || errorVisible).toBe(true)
  })

  test('should validate voucher at checkout', async ({ page }) => {
    await page.goto('/warenkorb')

    // Apply voucher
    await fillField(page, 'Gutscheincode', 'TEST20')
    await clickButton(page, 'Anwenden')
    await waitForToast(page, 'Gutschein angewendet')

    // Proceed to checkout
    await proceedToCheckout(page)

    // Voucher should still be applied
    await expect(page.getByText(/Rabatt.*20%/)).toBeVisible()

    // Total should reflect discount
    const orderSummary = page.locator('[data-testid="order-summary"]')
    await expect(orderSummary.getByText(/Rabatt/)).toBeVisible()
  })
})

test.describe('Vouchers - Edge Cases', () => {
  test('should handle case-insensitive codes', async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 3)

    await page.goto('/warenkorb')

    // Try lowercase version of voucher
    await fillField(page, 'Gutscheincode', 'test10')
    await clickButton(page, 'Anwenden')

    // Should work (codes are typically case-insensitive)
    await waitForToast(page, 'Gutschein angewendet')
  })

  test('should trim whitespace from code', async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 3)

    await page.goto('/warenkorb')

    // Try code with spaces
    await fillField(page, 'Gutscheincode', '  TEST10  ')
    await clickButton(page, 'Anwenden')

    // Should work (whitespace trimmed)
    await waitForToast(page, 'Gutschein angewendet')
  })

  test('should not allow negative total', async ({ page }) => {
    // Add cheap item
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.schwarzkopfSpray.name, 1) // CHF 18.90

    await page.goto('/warenkorb')

    // Apply large fixed discount (e.g., CHF 50)
    await fillField(page, 'Gutscheincode', 'FIXED50')
    await clickButton(page, 'Anwenden')

    // Should either:
    // 1. Limit discount to order total
    // 2. Show error that discount is too large

    const total = await page.locator('[data-testid="cart-total"]').textContent()
    const amount = parseFloat(total?.replace(/[^\d.]/g, '') || '0')

    expect(amount).toBeGreaterThanOrEqual(0) // Never negative
  })

  test('should persist voucher through page navigation', async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 3)

    await page.goto('/warenkorb')

    // Apply voucher
    await fillField(page, 'Gutscheincode', 'TEST10')
    await clickButton(page, 'Anwenden')
    await waitForToast(page, 'Gutschein angewendet')

    // Navigate away and back
    await page.goto('/shop')
    await page.goto('/warenkorb')

    // Voucher should still be applied
    await expect(page.getByText(/Rabatt.*10%/)).toBeVisible()
  })

  test('should clear voucher when cart is emptied', async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 2)

    await page.goto('/warenkorb')

    // Apply voucher
    await fillField(page, 'Gutscheincode', 'TEST10')
    await clickButton(page, 'Anwenden')
    await waitForToast(page, 'Gutschein angewendet')

    // Remove all items
    await clickButton(page, 'Entfernen')
    await clickButton(page, 'Entfernen')

    // Cart is empty
    await expect(page.getByText(/Warenkorb ist leer/)).toBeVisible()

    // Add new item
    await page.goto('/shop')
    await addProductToCart(page, TEST_PRODUCT_DATA.wellaConditioner.name, 1)
    await page.goto('/warenkorb')

    // Voucher should NOT be applied to new cart
    const discount = page.getByText(/Rabatt/)
    const isVisible = await discount.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })
})
