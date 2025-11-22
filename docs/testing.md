# Testing Guide

Comprehensive testing strategy for SCHNITTWERK salon management system.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [End-to-End Tests](#end-to-end-tests)
- [Security Testing](#security-testing)
- [Performance Testing](#performance-testing)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Overview

Our testing strategy follows the testing pyramid:

```
         /\
        /  \  E2E Tests (10%)
       /────\
      /      \  Integration Tests (30%)
     /────────\
    /          \  Unit Tests (60%)
   /────────────\
```

### Testing Goals

1. **Prevent Regressions**: Catch bugs before they reach production
2. **Document Behavior**: Tests serve as living documentation
3. **Enable Refactoring**: Confidently refactor with test safety net
4. **Validate Business Logic**: Ensure critical paths work correctly

### Coverage Targets

- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All critical user flows
- **E2E Tests**: Happy paths for booking, checkout, admin operations

---

## Testing Stack

### Unit & Integration Tests

- **Framework**: [Vitest](https://vitest.dev/) - Fast, Vite-powered test runner
- **Mocking**: Built-in vi.mock()
- **Assertions**: expect() API (Jest-compatible)
- **Coverage**: V8 coverage provider

### End-to-End Tests

- **Framework**: [Playwright](https://playwright.dev/) - Cross-browser testing
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: iOS Safari, Android Chrome viewports

### Security Testing

- **Static Analysis**: Custom security audit script
- **Dependency Scanning**: npm audit
- **Environment Checks**: Automated validation

---

## Unit Tests

### Location

```
tests/
  ├── slot-engine.test.ts        # Booking logic
  ├── price-calculator.test.ts   # Price calculations
  ├── voucher-validation.test.ts # Voucher logic
  └── utils.test.ts              # Utility functions
```

### Example: Slot Engine Test

```typescript
import { describe, it, expect } from 'vitest'
import { calculateStaffDaySlots } from '@/features/booking/slot-engine'

describe('Slot Engine', () => {
  it('should generate slots for available time', () => {
    const schedule = {
      date: new Date('2024-01-15'),
      openingHours: [{ startMinutes: 540, endMinutes: 1020 }], // 9:00-17:00
      staffSchedules: new Map([
        ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
      ]),
      appointments: [],
      blockedTimes: [],
    }

    const slots = calculateStaffDaySlots(
      schedule,
      'staff-1',
      60, // duration
      15, // granularity
      'Europe/Zurich'
    )

    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0].startMinutes).toBe(540) // 9:00
  })

  it('should respect existing appointments', () => {
    // Test that booked times are excluded
  })

  it('should handle lunch breaks', () => {
    // Test split working hours
  })
})
```

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit slot-engine.test.ts

# Run with coverage
npm run test:unit -- --coverage

# Watch mode (rerun on file changes)
npm run test:unit -- --watch
```

### What to Unit Test

✅ **DO Test:**

- Pure functions (utilities, calculators)
- Business logic (slot engine, voucher validation)
- Data transformations
- Edge cases and error handling

❌ **DON'T Test:**

- React components (use integration tests)
- API routes (use E2E tests)
- Database queries (use integration tests)
- External services (mock them)

---

## Integration Tests

Integration tests verify multiple units working together, typically with database and API interactions.

### Approach

1. **Setup**: Seed test database with known data
2. **Execute**: Call server actions or API routes
3. **Assert**: Verify database state and response
4. **Cleanup**: Reset database after each test

### Example: Booking Flow

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createAppointment } from '@/features/booking/actions'
import { createClient } from '@/lib/supabase/server'

describe('Booking Integration', () => {
  let supabase: any
  let salonId: string
  let customerId: string

  beforeEach(async () => {
    // Setup test database
    supabase = await createClient()
    // Seed data...
  })

  it('should create appointment and send confirmation email', async () => {
    const result = await createAppointment({
      salonId,
      customerId,
      serviceIds: ['service-1'],
      startsAt: new Date('2024-03-15T10:00:00Z'),
      // ...
    })

    expect(result.success).toBe(true)

    // Verify database
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', result.data.id)
      .single()

    expect(data.status).toBe('confirmed')
  })
})
```

---

## End-to-End Tests

E2E tests validate complete user journeys in a real browser.

### Location

```
e2e/
  ├── booking-flow.spec.ts      # Customer booking journey
  ├── checkout-flow.spec.ts     # Payment and checkout
  ├── admin-dashboard.spec.ts   # Admin operations
  └── health-check.spec.ts      # System health
```

### Example: Booking Flow

```typescript
import { test, expect } from '@playwright/test'

test('should complete full booking flow', async ({ page }) => {
  // 1. Navigate to services
  await page.goto('/leistungen')

  // 2. Select a service
  await page.getByRole('button', { name: 'Buchen' }).first().click()

  // 3. Select date and time
  await page.getByRole('button', { name: /^15$/ }).click()
  await page.locator('[data-testid="time-slot"]').first().click()

  // 4. Fill customer details
  await page.getByLabel('Vorname').fill('Max')
  await page.getByLabel('E-Mail').fill('max@example.com')
  await page.getByLabel(/AGB/).check()

  // 5. Submit booking
  await page.getByRole('button', { name: /Termin buchen/ }).click()

  // 6. Verify confirmation
  await expect(page).toHaveURL(/.*\/bestaetigung/)
  await expect(page.getByRole('heading', { name: /Buchung bestätigt/ })).toBeVisible()
})
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e booking-flow.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific browser
npm run test:e2e -- --project=chromium

# Debug mode
npm run test:e2e -- --debug
```

### E2E Best Practices

1. **Use Test IDs**: Add `data-testid` attributes for stable selectors
2. **Wait for Network**: Use `page.waitForResponse()` for API calls
3. **Isolate Tests**: Each test should be independent
4. **Mock External Services**: Don't call real Stripe, email services
5. **Test Critical Paths Only**: E2E tests are slow and expensive

---

## Security Testing

### Automated Security Audit

Run our custom security audit script:

```bash
npm run security:audit
```

### What It Checks

1. **Environment Variables**: Required vars are set
2. **Input Validation**: Zod schemas on all inputs
3. **Authentication**: RBAC checks in admin actions
4. **Authorization**: Role-based access control
5. **Stripe Webhooks**: Signature verification
6. **Secrets**: No hardcoded API keys
7. **RLS Policies**: Row Level Security enabled

### Manual Security Checklist

- [ ] All admin routes require authentication
- [ ] All server actions validate input with Zod
- [ ] All database queries scoped by `salon_id`
- [ ] Stripe webhooks verify signatures
- [ ] No secrets in code (use environment variables)
- [ ] RLS policies tested for each role
- [ ] CSP headers configured
- [ ] Rate limiting on public endpoints

---

## Performance Testing

### Database Indexes

We've added indexes on hot query paths:

- `appointments(salon_id, starts_at DESC)`
- `orders(salon_id, created_at DESC)`
- `products(salon_id, active)`
- See `supabase/migrations/20250122000001_performance_indexes.sql`

### Load Testing (TODO)

Use tools like Artillery or k6 for load testing:

```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 users/second
scenarios:
  - name: 'Booking Flow'
    flow:
      - get:
          url: '/leistungen'
      - post:
          url: '/api/booking/create'
          json:
            serviceId: '{{ serviceId }}'
```

### Metrics to Track

- **Page Load Time**: < 2 seconds (Lighthouse)
- **Time to Interactive**: < 3 seconds
- **API Response Time**: < 500ms (p95)
- **Database Query Time**: < 100ms (p95)

---

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + E2E)
npm run test:all

# Run only unit tests
npm test

# Run only E2E tests
npm run test:e2e

# Run security audit
npm run security:audit

# Full CI pipeline
npm run ci
```

### Test Output

#### Passing Test

```
✓ tests/slot-engine.test.ts (12)
  ✓ Slot Engine - Utility Functions (4)
    ✓ should convert minutes to time format
    ✓ should detect overlapping ranges
    ✓ should merge overlapping ranges
    ✓ should subtract unavailable ranges
  ✓ Slot Engine - Core Functions (8)
    ✓ should generate slots for available time
    ✓ should respect existing appointments
    ...

Test Files  1 passed (1)
     Tests  12 passed (12)
  Start at  10:30:45
  Duration  1.23s
```

#### Failing Test

```
❌ tests/slot-engine.test.ts > should prevent double bookings
  AssertionError: expected true to be false

  - Expected: false
  + Received: true

  at tests/slot-engine.test.ts:42:28
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: E2E tests
        run: npm run test:e2e

      - name: Security audit
        run: npm run security:audit
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm run type-check
npm run lint
npm run test:unit
```

---

## Best Practices

### 1. Test Naming

Use descriptive names that explain the expected behavior:

```typescript
// ❌ Bad
it('test 1', () => {})

// ✅ Good
it('should reject booking if slot is already taken', () => {})
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should calculate total price with VAT', () => {
  // Arrange
  const items = [{ price: 100, quantity: 2 }]
  const vatRate = 0.081

  // Act
  const total = calculateTotal(items, vatRate)

  // Assert
  expect(total).toBe(216.2) // 200 + 8.1% VAT
})
```

### 3. Test Edge Cases

```typescript
describe('Slot Engine', () => {
  it('should handle zero duration', () => {
    const slots = calculateSlots(schedule, 0)
    expect(slots).toHaveLength(0)
  })

  it('should handle overlapping appointments', () => {
    // ...
  })

  it('should handle staff with no working hours', () => {
    // ...
  })
})
```

### 4. Mock External Dependencies

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  createPaymentIntent: vi.fn(() => Promise.resolve({ id: 'pi_test' })),
}))
```

### 5. Keep Tests Isolated

Each test should be independent and not rely on the state from other tests:

```typescript
beforeEach(() => {
  // Reset state before each test
  vi.clearAllMocks()
  // Reset database
  // Clear cache
})
```

### 6. Test User Behavior, Not Implementation

```typescript
// ❌ Bad (tests implementation)
it('should call validateSlot function', () => {
  expect(validateSlot).toHaveBeenCalled()
})

// ✅ Good (tests behavior)
it('should show error when slot is unavailable', () => {
  expect(screen.getByText(/Slot nicht verfügbar/)).toBeVisible()
})
```

---

## Debugging Tests

### Vitest Debugging

```typescript
import { describe, it, expect } from 'vitest'

it('should debug test', () => {
  const result = complexFunction()

  // Add console.log for debugging
  console.log('Result:', result)

  // Use debugger statement (run with --inspect)
  debugger

  expect(result).toBeTruthy()
})
```

Run with debugger:

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Playwright Debugging

```bash
# Open Playwright Inspector
npm run test:e2e -- --debug

# Take screenshots on failure (already configured)
npm run test:e2e

# View trace (step-by-step recording)
npx playwright show-trace trace.zip
```

---

## Coverage Reports

Generate coverage report:

```bash
npm run test:unit -- --coverage
```

View HTML report:

```bash
open coverage/index.html
```

Coverage thresholds in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
})
```

---

## Common Testing Patterns

### Testing Server Actions

```typescript
import { createAppointment } from '@/features/booking/actions'

it('should return error for invalid input', async () => {
  const result = await createAppointment({
    salonId: 'invalid',
    // missing required fields
  })

  expect(result.success).toBe(false)
  expect(result.error).toContain('Validation error')
})
```

### Testing React Server Components

```typescript
import { render, screen } from '@testing-library/react'
import ServicesPage from '@/app/(public)/leistungen/page'

it('should render services list', async () => {
  render(<ServicesPage />)
  await screen.findByText('Unsere Leistungen')
  expect(screen.getByText('Haarschnitt')).toBeVisible()
})
```

### Testing Database Queries

```typescript
import { createClient } from '@/lib/supabase/server'

it('should scope queries by salon_id', async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('salon_id', 'test-salon')

  expect(data?.every((apt) => apt.salon_id === 'test-salon')).toBe(true)
})
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2025-01-22
**Maintained By**: Development Team
