/**
 * E2E Test Helpers - Authentication
 * Provides login/logout helpers for E2E tests
 */

import { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
}

export const TEST_USERS = {
  customer: {
    email: 'test.kunde@schnittwerk.test',
    password: 'TestKunde123!',
    firstName: 'Test',
    lastName: 'Kunde',
  },
  admin: {
    email: 'admin@schnittwerk.test',
    password: 'AdminTest123!',
    firstName: 'Admin',
    lastName: 'User',
  },
  staff: {
    email: 'staff@schnittwerk.test',
    password: 'StaffTest123!',
    firstName: 'Staff',
    lastName: 'Member',
  },
}

/**
 * Login as a test user
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/login')

  await page.getByLabel('E-Mail').fill(user.email)
  await page.getByLabel('Passwort').fill(user.password)
  await page.getByRole('button', { name: /Anmelden|Login/ }).click()

  // Wait for redirect after successful login
  await page.waitForURL(/.*\/(dashboard|admin)/)
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  await page.goto('/logout')
  await page.waitForURL('/login')
}

/**
 * Register a new customer
 */
export async function registerCustomer(
  page: Page,
  data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }
) {
  await page.goto('/registrieren')

  await page.getByLabel('Vorname').fill(data.firstName)
  await page.getByLabel('Nachname').fill(data.lastName)
  await page.getByLabel('E-Mail').fill(data.email)
  await page.getByLabel(/Passwort(?! wiederholen)/).fill(data.password)
  await page.getByLabel('Passwort wiederholen').fill(data.password)

  if (data.phone) {
    await page.getByLabel('Telefon').fill(data.phone)
  }

  // Accept terms
  await page.getByLabel(/Ich akzeptiere die AGB/).check()
  await page.getByLabel(/Datenschutzerklärung/).check()

  await page.getByRole('button', { name: /Registrieren/ }).click()

  // Wait for successful registration
  await page.waitForURL('/dashboard')
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for user menu or logout button
    const logoutButton = page.getByRole('button', { name: /Abmelden|Logout/ })
    return await logoutButton.isVisible({ timeout: 1000 })
  } catch {
    return false
  }
}

/**
 * Ensure user is logged in, login if not
 */
export async function ensureLoggedIn(page: Page, user: TestUser) {
  if (!(await isLoggedIn(page))) {
    await login(page, user)
  }
}
