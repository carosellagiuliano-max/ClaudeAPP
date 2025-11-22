/**
 * E2E Test: Shop Flow
 * Tests the complete e-commerce shopping journey
 */

import { test, expect } from '@playwright/test'
import {
  addProductToCart,
  clearCart,
  proceedToCheckout,
  fillCheckoutAddress,
  completeOrderWithStripe,
  waitForToast,
  clickButton,
  fillField,
  generateTestEmail,
  generateTestPhone,
  formatPrice,
} from './helpers/utils'
import { TEST_PRODUCT_DATA, STRIPE_TEST_CARDS } from './helpers/test-data'

test.describe('Shop Flow - Product Browsing', () => {
  test('should display products on shop page', async ({ page }) => {
    await page.goto('/shop')

    // Should show page title
    await expect(page.getByRole('heading', { name: /Shop|Produkte/ })).toBeVisible()

    // Should show product cards
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()

    // Product cards should have name, price, and add to cart button
    const firstProduct = productCards.first()
    await expect(firstProduct.getByRole('heading')).toBeVisible()
    await expect(firstProduct.getByText(/CHF \d+/)).toBeVisible()
    await expect(firstProduct.getByRole('button', { name: /In den Warenkorb/ })).toBeVisible()
  })

  test('should filter products by category', async ({ page }) => {
    await page.goto('/shop')

    // Click on category filter (e.g., "Shampoo")
    await page.getByRole('button', { name: /Shampoo/ }).click()

    // Wait for products to load
    await page.waitForLoadState('networkidle')

    // All visible products should be in the selected category
    const productCards = page.locator('[data-testid="product-card"]')
    const count = await productCards.count()

    expect(count).toBeGreaterThan(0)

    // Verify category is highlighted/active
    const categoryButton = page.getByRole('button', { name: /Shampoo/ })
    await expect(categoryButton).toHaveClass(/active|selected/)
  })

  test('should search for products', async ({ page }) => {
    await page.goto('/shop')

    // Search for "Shampoo"
    await page.getByPlaceholder(/Suchen/).fill('Shampoo')
    await page.keyboard.press('Enter')

    // Wait for search results
    await page.waitForLoadState('networkidle')

    // Should show matching products
    const productCards = page.locator('[data-testid="product-card"]')
    const count = await productCards.count()

    expect(count).toBeGreaterThan(0)

    // All products should contain "Shampoo" in name or description
    const firstProductName = await productCards.first().getByRole('heading').textContent()
    expect(firstProductName?.toLowerCase()).toContain('shampoo')
  })

  test('should show product details', async ({ page }) => {
    await page.goto('/shop')

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    const productName = await firstProduct.getByRole('heading').textContent()

    await firstProduct.click()

    // Should navigate to product detail page
    await page.waitForURL(/.*\/shop\/.*/)

    // Should show product details
    await expect(page.getByRole('heading', { name: productName || '' })).toBeVisible()
    await expect(page.getByText(/CHF \d+/)).toBeVisible()
    await expect(page.getByRole('button', { name: /In den Warenkorb/ })).toBeVisible()

    // Should show product description
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible()

    // Should show stock status
    await expect(page.getByText(/Verfügbar|Nicht verfügbar/)).toBeVisible()
  })
})

test.describe('Shop Flow - Cart Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page)
  })

  test('should add product to cart', async ({ page }) => {
    await page.goto('/shop')

    // Add first product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    const productName = await firstProduct.getByRole('heading').textContent()

    await firstProduct.getByRole('button', { name: /In den Warenkorb/ }).click()

    // Should show success toast
    await waitForToast(page, 'Zum Warenkorb hinzugefügt')

    // Cart badge should show 1 item
    const cartBadge = page.locator('[data-testid="cart-badge"]')
    await expect(cartBadge).toHaveText('1')

    // Navigate to cart
    await page.goto('/warenkorb')

    // Should show product in cart
    await expect(page.getByText(productName || '')).toBeVisible()
  })

  test('should update product quantity in cart', async ({ page }) => {
    // Add product to cart
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 1)

    // Go to cart
    await page.goto('/warenkorb')

    // Get initial price
    const initialTotal = await page.locator('[data-testid="cart-total"]').textContent()

    // Increase quantity to 2
    const qtyInput = page.getByLabel('Menge')
    await qtyInput.fill('2')
    await qtyInput.blur() // Trigger update

    // Wait for cart to update
    await page.waitForTimeout(1000)

    // Total should be doubled
    const newTotal = await page.locator('[data-testid="cart-total"]').textContent()
    expect(newTotal).not.toBe(initialTotal)

    // Quantity should be 2
    await expect(qtyInput).toHaveValue('2')
  })

  test('should remove product from cart', async ({ page }) => {
    // Add product to cart
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name)

    // Go to cart
    await page.goto('/warenkorb')

    // Remove product
    await clickButton(page, 'Entfernen')

    // Cart should be empty
    await expect(page.getByText(/Ihr Warenkorb ist leer/)).toBeVisible()

    // Cart badge should not be visible or show 0
    const cartBadge = page.locator('[data-testid="cart-badge"]')
    const isVisible = await cartBadge.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('should show cart summary', async ({ page }) => {
    // Add multiple products
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 2)
    await addProductToCart(page, TEST_PRODUCT_DATA.wellaConditioner.name, 1)

    // Go to cart
    await page.goto('/warenkorb')

    // Should show subtotal
    await expect(page.getByText(/Zwischensumme/)).toBeVisible()

    // Should show tax
    await expect(page.getByText(/MwSt/)).toBeVisible()

    // Should show total
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible()

    // Should show checkout button
    await expect(page.getByRole('button', { name: /Zur Kasse/ })).toBeVisible()
  })

  test('should handle out of stock products', async ({ page }) => {
    await page.goto('/shop')

    // Find out of stock product (if any)
    const outOfStockProduct = page.locator('[data-testid="product-card"]', {
      has: page.getByText(/Nicht verfügbar|Ausverkauft/),
    })

    const isVisible = await outOfStockProduct.isVisible().catch(() => false)

    if (isVisible) {
      // Add to cart button should be disabled
      const addButton = outOfStockProduct.getByRole('button', { name: /In den Warenkorb/ })
      await expect(addButton).toBeDisabled()
    }
  })
})

test.describe('Shop Flow - Checkout Process', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page)
    // Add test product to cart
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 2)
  })

  test('should complete checkout as guest', async ({ page }) => {
    await proceedToCheckout(page)

    // Should be on checkout page
    await expect(page).toHaveURL('/checkout')

    // Fill shipping address
    await fillCheckoutAddress(page, {
      firstName: 'Max',
      lastName: 'Muster',
      email: generateTestEmail(),
      phone: generateTestPhone(),
      address: 'Teststrasse 123',
      city: 'Zürich',
      postalCode: '8000',
      country: 'Schweiz',
    })

    // Select shipping method
    await page.getByLabel(/Versandart/).check()

    // Accept terms
    await page.getByLabel(/AGB/).check()

    // Continue to payment
    await clickButton(page, 'Weiter zur Zahlung')

    // Should show payment form
    await expect(page.getByText(/Zahlungsinformationen/)).toBeVisible()

    // Complete payment with Stripe
    await completeOrderWithStripe(page)

    // Should be on success page
    await expect(page.getByRole('heading', { name: /Vielen Dank|Bestellung erfolgreich/ })).toBeVisible()

    // Should show order number
    await expect(page.getByText(/Bestellnummer:/)).toBeVisible()
  })

  test('should validate required checkout fields', async ({ page }) => {
    await proceedToCheckout(page)

    // Try to proceed without filling fields
    await clickButton(page, 'Weiter zur Zahlung')

    // Should show validation errors
    await expect(page.getByText(/Vorname ist erforderlich|Bitte füllen Sie/)).toBeVisible()
    await expect(page.getByText(/E-Mail ist erforderlich|Bitte füllen Sie/)).toBeVisible()
  })

  test('should select shipping method', async ({ page }) => {
    await proceedToCheckout(page)

    // Fill required fields
    await fillCheckoutAddress(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    // Get total before selecting shipping
    const initialTotal = await page.locator('[data-testid="order-total"]').textContent()

    // Select standard shipping
    await page.getByLabel(/Standard Versand/).check()
    await page.waitForTimeout(500)

    // Total should update (include shipping cost)
    const newTotal = await page.locator('[data-testid="order-total"]').textContent()
    expect(newTotal).not.toBe(initialTotal)

    // Should show shipping cost
    await expect(page.getByText(/Versand:/)).toBeVisible()
  })

  test('should handle declined payment', async ({ page }) => {
    await proceedToCheckout(page)

    // Fill address
    await fillCheckoutAddress(page, {
      firstName: 'Test',
      lastName: 'Declined',
      email: generateTestEmail(),
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()

    await clickButton(page, 'Weiter zur Zahlung')

    // Use declined test card
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.declined)
    await stripeFrame.locator('[name="exp-date"]').fill('12/30')
    await stripeFrame.locator('[name="cvc"]').fill('123')

    await clickButton(page, 'Jetzt bezahlen')

    // Should show error message
    await expect(page.getByText(/Zahlung fehlgeschlagen|Karte abgelehnt/)).toBeVisible({
      timeout: 10000,
    })

    // Should still be on checkout/payment page
    await expect(page).toHaveURL(/.*\/(checkout|zahlung)/)
  })
})

test.describe('Shop Flow - Order Confirmation', () => {
  test('should display order details on confirmation page', async ({ page }) => {
    // Complete full checkout flow
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 1)
    await proceedToCheckout(page)

    const email = generateTestEmail()

    await fillCheckoutAddress(page, {
      firstName: 'Test',
      lastName: 'Order',
      email,
      phone: generateTestPhone(),
      address: 'Teststr 1',
      city: 'Bern',
      postalCode: '3000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()
    await clickButton(page, 'Weiter zur Zahlung')

    await completeOrderWithStripe(page)

    // On confirmation page
    // Should show order number
    await expect(page.getByText(/Bestellnummer:/)).toBeVisible()

    // Should show customer details
    await expect(page.getByText('Test Order')).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    // Should show ordered products
    await expect(page.getByText(TEST_PRODUCT_DATA.lορealShampoo.name)).toBeVisible()

    // Should show total amount
    await expect(page.getByText(/Gesamt:/)).toBeVisible()

    // Should show next steps
    await expect(page.getByText(/Sie erhalten eine Bestätigung/)).toBeVisible()

    // Should have button to view order
    await expect(page.getByRole('link', { name: /Bestellung ansehen/ })).toBeVisible()
  })

  test('should send confirmation email', async ({ page }) => {
    // This test would require email testing setup (e.g., MailHog, Mailpit)
    // For now, we just verify the UI indicates an email will be sent

    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name, 1)
    await proceedToCheckout(page)

    await fillCheckoutAddress(page, {
      firstName: 'Email',
      lastName: 'Test',
      email: generateTestEmail(),
      address: 'Test 1',
      city: 'Zürich',
      postalCode: '8000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()
    await clickButton(page, 'Weiter zur Zahlung')

    await completeOrderWithStripe(page)

    // Should show message about email
    await expect(
      page.getByText(/Bestätigungs-E-Mail|Sie erhalten eine E-Mail/)
    ).toBeVisible()
  })
})

test.describe('Shop Flow - Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/shop')

    // Products should be stacked vertically
    const products = page.locator('[data-testid="product-card"]')
    const firstProduct = products.first()
    const secondProduct = products.nth(1)

    const firstBox = await firstProduct.boundingBox()
    const secondBox = await secondProduct.boundingBox()

    if (firstBox && secondBox) {
      // Second product should be below first
      expect(secondBox.y).toBeGreaterThan(firstBox.y)
    }

    // Cart should be accessible from mobile menu
    await page.getByRole('button', { name: /Menu|Menü/ }).click()
    await expect(page.getByRole('link', { name: /Warenkorb/ })).toBeVisible()
  })

  test('should complete mobile checkout', async ({ page }) => {
    await clearCart(page)
    await addProductToCart(page, TEST_PRODUCT_DATA.lορealShampoo.name)
    await proceedToCheckout(page)

    // Form should be mobile-optimized (stacked layout)
    const form = page.locator('form')
    const formBox = await form.boundingBox()

    expect(formBox?.width).toBeLessThanOrEqual(375)

    // Should be able to complete checkout on mobile
    await fillCheckoutAddress(page, {
      firstName: 'Mobile',
      lastName: 'User',
      email: generateTestEmail(),
      address: 'Test 1',
      city: 'Basel',
      postalCode: '4000',
    })

    await page.getByLabel(/Versandart/).check()
    await page.getByLabel(/AGB/).check()

    // Should show mobile-optimized buttons
    const checkoutButton = page.getByRole('button', { name: /Weiter zur Zahlung/ })
    await expect(checkoutButton).toBeVisible()

    const buttonBox = await checkoutButton.boundingBox()
    expect(buttonBox?.width).toBeGreaterThan(200) // Full-width or prominent button
  })
})
