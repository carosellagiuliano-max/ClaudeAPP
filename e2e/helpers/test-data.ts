/**
 * E2E Test Data
 * Test data IDs and constants from seed data
 */

// Demo Salon ID from seed data
export const TEST_SALON_ID = 'a0000000-0000-0000-0000-000000000001'

// Staff IDs from seed data
export const TEST_STAFF = {
  vanessa: 'a0000000-0000-0000-0000-000000000101',
  maria: 'a0000000-0000-0000-0000-000000000102',
  julia: 'a0000000-0000-0000-0000-000000000103',
}

// Service Category IDs
export const TEST_SERVICE_CATEGORIES = {
  haircut: 'a0000000-0000-0000-0000-000000000201',
  coloring: 'a0000000-0000-0000-0000-000000000202',
  styling: 'a0000000-0000-0000-0000-000000000203',
  treatment: 'a0000000-0000-0000-0000-000000000204',
}

// Service IDs from seed data
export const TEST_SERVICES = {
  damenschnitt: 'a0000000-0000-0000-0000-000000000301',
  herrenschnitt: 'a0000000-0000-0000-0000-000000000302',
  kinderschnitt: 'a0000000-0000-0000-0000-000000000303',
  coloration: 'a0000000-0000-0000-0000-000000000304',
  highlights: 'a0000000-0000-0000-0000-000000000305',
  balayage: 'a0000000-0000-0000-0000-000000000306',
  hochsteckfrisur: 'a0000000-0000-0000-0000-000000000307',
  keratinBehandlung: 'a0000000-0000-0000-0000-000000000308',
}

// Product Brand IDs
export const TEST_BRANDS = {
  loreal: 'a0000000-0000-0000-0000-000000000401',
  wella: 'a0000000-0000-0000-0000-000000000402',
  schwarzkopf: 'a0000000-0000-0000-0000-000000000403',
}

// Product Category IDs
export const TEST_PRODUCT_CATEGORIES = {
  shampoo: 'a0000000-0000-0000-0000-000000000501',
  conditioner: 'a0000000-0000-0000-0000-000000000502',
  styling: 'a0000000-0000-0000-0000-000000000503',
  treatment: 'a0000000-0000-0000-0000-000000000504',
}

// Product IDs from seed data
export const TEST_PRODUCTS = {
  lορealShampoo: 'a0000000-0000-0000-0000-000000000601',
  wellaConditioner: 'a0000000-0000-0000-0000-000000000602',
  schwarzkopfSpray: 'a0000000-0000-0000-0000-000000000603',
  lορealMask: 'a0000000-0000-0000-0000-000000000604',
  wellaOil: 'a0000000-0000-0000-0000-000000000605',
}

// Loyalty Tier IDs
export const TEST_LOYALTY_TIERS = {
  bronze: 'a0000000-0000-0000-0000-000000000701',
  silver: 'a0000000-0000-0000-0000-000000000702',
  gold: 'a0000000-0000-0000-0000-000000000703',
  platinum: 'a0000000-0000-0000-0000-000000000704',
}

// Loyalty Reward IDs
export const TEST_REWARDS = {
  discount10: 'a0000000-0000-0000-0000-000000000801',
  freeShampoo: 'a0000000-0000-0000-0000-000000000802',
  discount20: 'a0000000-0000-0000-0000-000000000803',
}

// SMS Template IDs
export const TEST_SMS_TEMPLATES = {
  appointmentConfirmation: 'b0000000-0000-0000-0000-000000000001',
  appointmentReminder: 'b0000000-0000-0000-0000-000000000002',
  orderConfirmation: 'b0000000-0000-0000-0000-000000000003',
  orderShipped: 'b0000000-0000-0000-0000-000000000004',
}

// Test product data for shop tests
export const TEST_PRODUCT_DATA = {
  lορealShampoo: {
    id: TEST_PRODUCTS.lορealShampoo,
    name: "L'Oréal Professional Shampoo",
    price: 24.9,
    sku: 'LOREAL-SHP-001',
  },
  wellaConditioner: {
    id: TEST_PRODUCTS.wellaConditioner,
    name: 'Wella Professionals Conditioner',
    price: 22.5,
    sku: 'WELLA-COND-001',
  },
  schwarzkopfSpray: {
    id: TEST_PRODUCTS.schwarzkopfSpray,
    name: 'Schwarzkopf OSiS+ Haarspray',
    price: 18.9,
    sku: 'SCHW-SPRAY-001',
  },
}

// Test service data for booking tests
export const TEST_SERVICE_DATA = {
  damenschnitt: {
    id: TEST_SERVICES.damenschnitt,
    name: 'Damenschnitt',
    price: 65.0,
    duration: 60,
  },
  herrenschnitt: {
    id: TEST_SERVICES.herrenschnitt,
    name: 'Herrenschnitt',
    price: 45.0,
    duration: 45,
  },
  coloration: {
    id: TEST_SERVICES.coloration,
    name: 'Coloration',
    price: 120.0,
    duration: 120,
  },
}

// Test voucher codes (to be created in tests)
export const TEST_VOUCHER_CODES = {
  percent10: 'TEST10',
  percent20: 'TEST20',
  fixed50: 'FIXED50',
  expired: 'EXPIRED',
  singleUse: 'SINGLE',
  customerSpecific: 'CUSTOMER123',
}

// Shipping methods
export const SHIPPING_METHODS = {
  standard: 'Standard Versand',
  express: 'Express Versand',
  pickup: 'Abholung im Salon',
}

// Payment methods
export const PAYMENT_METHODS = {
  card: 'Kreditkarte',
  invoice: 'Rechnung',
  twint: 'TWINT',
}

// Tax rates
export const TAX_RATES = {
  standard: 7.7,
  reduced: 2.5,
  zero: 0.0,
}

// Test Stripe card numbers (from Stripe test mode)
export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  requiresAuth: '4000002500003155',
}
