/**
 * E2E Test Utilities
 * Common helper functions for E2E tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Wait for a specific time (use sparingly, prefer waitForSelector)
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fill form field by label
 */
export async function fillField(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value)
}

/**
 * Select option from dropdown by label
 */
export async function selectOption(page: Page, fieldLabel: string, optionLabel: string) {
  await page.getByLabel(fieldLabel).selectOption({ label: optionLabel })
}

/**
 * Check a checkbox by label
 */
export async function checkBox(page: Page, label: string) {
  await page.getByLabel(label).check()
}

/**
 * Click button by name
 */
export async function clickButton(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name, 'i') }).click()
}

/**
 * Navigate to a route and wait for it to load
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for toast/notification message
 */
export async function waitForToast(page: Page, message: string) {
  await expect(page.getByRole('status').getByText(new RegExp(message, 'i'))).toBeVisible({
    timeout: 5000,
  })
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `test.${timestamp}.${random}@schnittwerk.test`
}

/**
 * Generate random phone number (Swiss format)
 */
export function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 1000000000)
  return `+4179${random.toString().padStart(9, '0')}`
}

/**
 * Format price for display (CHF)
 */
export function formatPrice(amount: number): string {
  return `CHF ${amount.toFixed(2)}`
}

/**
 * Calculate total with tax
 */
export function calculateTotalWithTax(subtotal: number, taxRate: number = 7.7): number {
  return subtotal + subtotal * (taxRate / 100)
}

/**
 * Screenshot on failure helper
 */
export async function screenshotOnFailure(page: Page, testName: string) {
  await page.screenshot({
    path: `test-results/${testName}-${Date.now()}.png`,
    fullPage: true,
  })
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp) {
  await page.waitForResponse((response) => {
    const url = response.url()
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern)
    }
    return urlPattern.test(url)
  })
}

/**
 * Get cart item count from header
 */
export async function getCartItemCount(page: Page): Promise<number> {
  try {
    const badge = page.locator('[data-testid="cart-badge"]')
    const text = await badge.textContent()
    return text ? parseInt(text) : 0
  } catch {
    return 0
  }
}

/**
 * Clear cart (helper for tests)
 */
export async function clearCart(page: Page) {
  await page.goto('/warenkorb')

  // Check if cart has items
  const emptyMessage = page.getByText(/Ihr Warenkorb ist leer/)
  const isEmpty = await emptyMessage.isVisible().catch(() => false)

  if (!isEmpty) {
    // Remove all items
    const removeButtons = page.getByRole('button', { name: /Entfernen/ })
    const count = await removeButtons.count()

    for (let i = 0; i < count; i++) {
      await removeButtons.first().click()
      await wait(500) // Wait for cart to update
    }
  }
}

/**
 * Add product to cart
 */
export async function addProductToCart(page: Page, productName: string, quantity: number = 1) {
  await page.goto('/shop')

  // Find product card
  const productCard = page.locator(`[data-testid="product-card"]`, {
    has: page.getByText(productName),
  })

  // Set quantity if needed
  if (quantity > 1) {
    const qtyInput = productCard.getByLabel('Menge')
    await qtyInput.fill(quantity.toString())
  }

  // Click "In den Warenkorb"
  await productCard.getByRole('button', { name: /In den Warenkorb/ }).click()

  // Wait for toast confirmation
  await waitForToast(page, 'Zum Warenkorb hinzugefügt')
}

/**
 * Proceed to checkout from cart
 */
export async function proceedToCheckout(page: Page) {
  await page.goto('/warenkorb')
  await clickButton(page, 'Zur Kasse')
  await page.waitForURL('/checkout')
}

/**
 * Fill checkout address form
 */
export async function fillCheckoutAddress(
  page: Page,
  data: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
  }
) {
  if (data.firstName) await fillField(page, 'Vorname', data.firstName)
  if (data.lastName) await fillField(page, 'Nachname', data.lastName)
  if (data.email) await fillField(page, 'E-Mail', data.email)
  if (data.phone) await fillField(page, 'Telefon', data.phone)
  if (data.address) await fillField(page, 'Adresse', data.address)
  if (data.city) await fillField(page, 'Stadt', data.city)
  if (data.postalCode) await fillField(page, 'PLZ', data.postalCode)
  if (data.country) await selectOption(page, 'Land', data.country)
}

/**
 * Fill Stripe test card
 */
export async function fillStripeCard(
  page: Page,
  cardNumber: string = '4242424242424242'
) {
  // Wait for Stripe iframe to load
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()

  await stripeFrame.locator('[name="cardnumber"]').fill(cardNumber)
  await stripeFrame.locator('[name="exp-date"]').fill('12/30')
  await stripeFrame.locator('[name="cvc"]').fill('123')
  await stripeFrame.locator('[name="postal"]').fill('9000')
}

/**
 * Complete order with test payment
 */
export async function completeOrderWithStripe(page: Page) {
  await fillStripeCard(page)
  await clickButton(page, 'Jetzt bezahlen')

  // Wait for payment processing
  await page.waitForURL(/.*\/bestellung\/.*/, { timeout: 15000 })

  // Verify success message
  await expect(page.getByText(/Bestellung erfolgreich|Vielen Dank/)).toBeVisible()
}
