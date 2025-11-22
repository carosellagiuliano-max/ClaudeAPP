# Multi-Salon Operations Guide

Complete guide for deploying and managing SCHNITTWERK with multiple salons.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Onboarding New Salons](#onboarding-new-salons)
- [HQ Dashboard](#hq-dashboard)
- [Salon Theming](#salon-theming)
- [Data Isolation](#data-isolation)
- [Testing Multi-Tenancy](#testing-multi-tenancy)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

SCHNITTWERK is built as a **multi-tenant SaaS** platform, allowing multiple salons to operate independently while sharing the same application infrastructure.

### Key Features

- ✅ **Complete Data Isolation**: Each salon's data is strictly separated
- ✅ **Row Level Security (RLS)**: Database-level security enforcement
- ✅ **Per-Salon Theming**: Custom branding and colors
- ✅ **HQ Dashboard**: Cross-salon analytics for owners
- ✅ **Independent Settings**: Each salon configures their own booking rules
- ✅ **Scalable Architecture**: Proven to handle hundreds of salons

### Multi-Tenancy Model

```
┌─────────────────────────────────────────────┐
│           SCHNITTWERK Platform              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────┐ │
│  │  Salon A    │  │  Salon B    │  │ ...│ │
│  │  (Zurich)   │  │  (Basel)    │  │    │ │
│  │             │  │             │  │    │ │
│  │ - Staff     │  │ - Staff     │  │    │ │
│  │ - Customers │  │ - Customers │  │    │ │
│  │ - Bookings  │  │ - Bookings  │  │    │ │
│  │ - Orders    │  │ - Orders    │  │    │ │
│  └─────────────┘  └─────────────┘  └────┘ │
│                                             │
│         ▲                                   │
│         │                                   │
│  ┌──────┴───────┐                          │
│  │ HQ Dashboard │ (Cross-salon analytics)  │
│  └──────────────┘                          │
└─────────────────────────────────────────────┘
```

---

## Architecture

### Database Design

All tenant-scoped tables include a `salon_id` column:

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES salons(id),  -- Tenant key
  customer_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  -- ... other columns
);

-- Index for fast filtering
CREATE INDEX idx_appointments_salon ON appointments(salon_id);
```

### Row Level Security (RLS)

Every table has RLS policies that enforce `salon_id` scoping:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their salon's appointments"
ON appointments
FOR SELECT
USING (
  salon_id IN (
    SELECT salon_id FROM salon_staff
    WHERE staff_id = auth.uid()
  )
);
```

### Tenant-Scoped Tables

The following tables have `salon_id`:

- `appointments` - Salon bookings
- `staff` - Employees per salon
- `customers` - Customer profiles
- `services` - Service catalog
- `products` - Shop inventory
- `orders` - E-commerce orders
- `vouchers` - Gift vouchers
- `payments` - Payment records
- `staff_schedules` - Staff availability
- `opening_hours` - Salon hours
- `blocked_times` - Time blocks
- `audit_logs` - Activity logs
- And more...

### Global Tables

These tables are shared across all salons:

- `salons` - Salon master list
- `profiles` - User auth profiles
- `legal_documents` - Terms, Privacy Policy
- `tax_rates` - Swiss VAT rates

---

## Onboarding New Salons

### Step 1: Create Salon Record

```sql
-- Insert new salon
INSERT INTO salons (
  name,
  slug,
  email,
  phone,
  street,
  postal_code,
  city,
  country,
  active
) VALUES (
  'SCHNITTWERK Basel',
  'basel',
  'basel@schnittwerk.ch',
  '+41 61 123 45 67',
  'Freie Strasse 45',
  '4051',
  'Basel',
  'CH',
  true
);

-- Returns the new salon_id
```

**Automated Defaults:**
When a salon is created, a trigger automatically creates:
- Default theme (black/white with accent color)
- Default settings (120min lead time, 60-day horizon, etc.)

### Step 2: Create Owner Account

```sql
-- 1. User signs up (handled by Supabase Auth)
-- This creates a record in auth.users and profiles

-- 2. Assign owner role to salon
INSERT INTO salon_staff (
  salon_id,
  staff_id,
  role,
  active
) VALUES (
  '<new_salon_id>',
  '<user_id>',
  'owner',
  true
);
```

### Step 3: Configure Salon Settings

The owner can now configure:

**Business Settings:**
- Timezone (default: Europe/Zurich)
- Language (default: German)
- Currency (default: CHF)

**Booking Settings:**
- Minimum lead time (default: 2 hours)
- Maximum booking horizon (default: 60 days)
- Slot granularity (default: 15 minutes)
- Staff preference (enabled/disabled)

**Notification Settings:**
- Booking confirmations (enabled)
- Reminder emails (24 hours before)
- Admin notification email

**Payment Settings:**
- Require online payment (yes/no)
- Accept cash payments (yes/no)

**Shop Settings:**
- Enable shop (yes/no)
- Minimum order amount
- Free shipping threshold

### Step 4: Add Staff Members

1. Invite staff via email
2. They create accounts
3. Owner assigns roles:
   - `owner` - Full access
   - `admin` - Manage staff and customers
   - `manager` - Manage appointments and reports
   - `staff` - Own appointments only

### Step 5: Setup Services & Products

- Add service catalog (haircut, color, styling, etc.)
- Configure pricing
- Upload product inventory
- Set up categories

### Step 6: Configure Theming

Customize the salon's branding:

```typescript
// Update salon theme
await updateSalonTheme(salonId, {
  primary_color: '#1A1A1A',
  accent_color: '#FFB703',
  logo_url: 'https://cdn.schnittwerk.ch/logos/basel.png',
  font_family_heading: 'Montserrat',
  font_family_body: 'Inter',
})
```

### Step 7: Test & Launch

- [ ] Book test appointment
- [ ] Complete test checkout
- [ ] Verify email notifications
- [ ] Check staff dashboard access
- [ ] Test customer portal
- [ ] Verify payment processing
- [ ] Review analytics data

---

## HQ Dashboard

The HQ Dashboard provides cross-salon analytics for multi-salon owners.

### HQ Roles

**hq_owner**
- Access to all salons
- Can create/deactivate salons
- Can assign HQ roles
- Full analytics access

**hq_manager**
- Access to assigned salons only
- Can view/export analytics
- Cannot assign roles

**hq_analyst**
- View-only access
- Can export reports
- Cannot make changes

### Assigning HQ Roles

```typescript
// Assign HQ Owner role
await assignHQRole({
  userId: 'user-uuid',
  hqRole: 'hq_owner',
  salonIds: undefined, // null = all salons
})

// Assign HQ Manager with specific salons
await assignHQRole({
  userId: 'user-uuid',
  hqRole: 'hq_manager',
  salonIds: ['salon-1-uuid', 'salon-2-uuid'],
})
```

### Cross-Salon Metrics

```typescript
// Get aggregated metrics
const metrics = await getCrossSalonMetrics({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  salonIds: ['salon-1', 'salon-2'], // Optional filter
})

console.log(metrics.data)
// {
//   totalRevenue: 125000,
//   totalAppointments: 450,
//   totalOrders: 180,
//   totalCustomers: 850,
//   topSalon: {
//     id: 'salon-1',
//     name: 'SCHNITTWERK Zurich',
//     revenue: 75000
//   },
//   revenueByS alon: [...]
// }
```

### Salon Comparison

```typescript
// Compare salons by metric
const comparison = await getSalonComparison('revenue', {
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
})

// Returns salons ranked by revenue with percentages
```

### Export Reports

```typescript
// Export to CSV
const csv = await exportCrossSalonData({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
})

// Download file
const blob = new Blob([csv.data], { type: 'text/csv' })
// ... download logic
```

---

## Salon Theming

Each salon can customize their branding.

### Theme Configuration

```typescript
interface SalonTheme {
  // Brand Colors
  primary_color: string // Main brand color
  secondary_color: string // Secondary elements
  accent_color: string // CTAs and highlights
  background_color: string // Page background
  text_color: string // Text color

  // Logo & Images
  logo_url: string // Main logo
  logo_dark_url: string // Dark mode logo
  favicon_url: string // Browser icon
  og_image_url: string // Social media preview

  // Typography
  font_family_heading: string // Heading font
  font_family_body: string // Body text font

  // Advanced
  custom_css: string // Custom CSS rules
}
```

### Applying Themes

Themes are automatically applied based on the current salon context:

```typescript
// Get salon theme
const theme = await getSalonTheme(salonId)

// Apply to CSS variables
document.documentElement.style.setProperty('--color-primary', theme.primary_color)
document.documentElement.style.setProperty('--color-accent', theme.accent_color)
// ... etc
```

### Pre-built Color Schemes

**Classic Black & Gold**
```
Primary: #000000
Accent: #FFB703
Background: #FFFFFF
```

**Modern Teal**
```
Primary: #00838F
Accent: #FF6F00
Background: #F5F5F5
```

**Elegant Purple**
```
Primary: #4A148C
Accent: #E1BEE7
Background: #FAFAFA
```

---

## Data Isolation

### Verification Checklist

Run the multi-tenant verification script:

```bash
npm run verify:multi-tenant
```

This checks:
- ✅ All queries include `salon_id` filter
- ✅ All INSERT operations include `salon_id`
- ✅ All UPDATE/DELETE operations filter by `salon_id`
- ✅ RLS policies enforce `salon_id` scoping
- ✅ No cross-salon data leaks

### Common Mistakes to Avoid

❌ **Bad: Query without salon_id filter**
```typescript
// WRONG - returns ALL appointments across ALL salons
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('status', 'confirmed')
```

✅ **Good: Query with salon_id filter**
```typescript
// CORRECT - only returns appointments for this salon
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('salon_id', salonId)
  .eq('status', 'confirmed')
```

❌ **Bad: INSERT without salon_id**
```typescript
// WRONG - doesn't include tenant key
await supabase.from('customers').insert({
  email: 'customer@example.com',
  first_name: 'John',
})
```

✅ **Good: INSERT with salon_id**
```typescript
// CORRECT - includes salon_id
await supabase.from('customers').insert({
  salon_id: salonId,
  email: 'customer@example.com',
  first_name: 'John',
})
```

### RLS Policy Testing

Test RLS policies with different users:

```sql
-- Set session to user from Salon A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-from-salon-a"}';

-- Try to access Salon B's data (should return 0 rows)
SELECT * FROM appointments WHERE salon_id = 'salon-b-id';

-- Try to insert into Salon B (should fail or be filtered)
INSERT INTO appointments (salon_id, ...) VALUES ('salon-b-id', ...);
```

---

## Testing Multi-Tenancy

### Unit Tests

```typescript
describe('Multi-Tenant Scoping', () => {
  it('should only return appointments for specified salon', async () => {
    const result = await getAppointments(salonAId)

    expect(result.success).toBe(true)
    expect(result.data.every(apt => apt.salon_id === salonAId)).toBe(true)
  })

  it('should prevent cross-salon data access', async () => {
    const result = await getAppointment(salonAId, appointmentFromSalonB)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})
```

### Integration Tests

```typescript
describe('Cross-Salon Isolation', () => {
  it('should not leak data between salons', async () => {
    // Create appointment in Salon A
    await createAppointment(salonAId, appointmentData)

    // Try to access from Salon B context
    const result = await getAppointments(salonBId)

    // Should not include Salon A's appointment
    expect(result.data.every(apt => apt.salon_id === salonBId)).toBe(true)
  })
})
```

### Manual Testing Procedure

1. **Create 2 Test Salons**
   - Salon A: "Test Salon Zurich"
   - Salon B: "Test Salon Basel"

2. **Create Test Users**
   - User A: Owner of Salon A
   - User B: Owner of Salon B

3. **Create Test Data**
   - Add appointments to Salon A
   - Add customers to Salon B

4. **Verify Isolation**
   - Login as User A
   - Verify you ONLY see Salon A data
   - Verify you CANNOT access Salon B data
   - Repeat for User B

5. **Test Cross-Salon Attempts**
   - Try to book appointment for Salon B while logged into Salon A
   - Should be rejected or show error

---

## Troubleshooting

### Issue: "Salon data is leaking between tenants"

**Diagnosis:**
Run the verification script:
```bash
npm run verify:multi-tenant
```

Look for queries without `salon_id` filters.

**Fix:**
Add `.eq('salon_id', salonId)` to all queries on tenant-scoped tables.

---

### Issue: "RLS policy blocks legitimate access"

**Diagnosis:**
Check if user has correct role assignment:
```sql
SELECT * FROM salon_staff
WHERE staff_id = '<user_id>' AND salon_id = '<salon_id>';
```

**Fix:**
Ensure user is added to `salon_staff` table with appropriate role.

---

### Issue: "HQ Dashboard shows no data"

**Diagnosis:**
1. Check HQ role assignment:
```sql
SELECT hq_role, hq_salon_access FROM profiles WHERE id = '<user_id>';
```

2. Verify salon access:
```sql
SELECT id, name FROM salons WHERE id = ANY('<user_salon_access>');
```

**Fix:**
Assign HQ role with correct salon access:
```typescript
await assignHQRole({
  userId: 'user-uuid',
  hqRole: 'hq_owner',
})
```

---

### Issue: "New salon doesn't have default settings"

**Diagnosis:**
Check if trigger fired:
```sql
SELECT * FROM salon_themes WHERE salon_id = '<new_salon_id>';
SELECT * FROM salon_settings WHERE salon_id = '<new_salon_id>';
```

**Fix:**
Manually create defaults:
```sql
INSERT INTO salon_themes (salon_id) VALUES ('<salon_id>');
INSERT INTO salon_settings (salon_id) VALUES ('<salon_id>');
```

---

## Best Practices

### 1. Always Scope by salon_id

Every query on tenant-scoped tables MUST include `salon_id`:

```typescript
// ALWAYS do this
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('salon_id', salonId) // <-- Required
```

### 2. Validate salon_id at API Entry

```typescript
export async function createAppointment(salonId: string, data: any) {
  // Verify user has access to this salon
  await requireStaff(salonId)

  // All subsequent queries automatically scoped
  // ...
}
```

### 3. Use Type-Safe salon_id

```typescript
// Define salon_id as part of your types
interface Appointment {
  id: string
  salon_id: string // Required field
  customer_id: string
  // ...
}
```

### 4. Test with Multiple Salons

Always test your features with at least 2 salons to catch scoping issues early.

### 5. Monitor Cross-Salon Queries

Add logging for queries that span multiple salons (HQ features):

```typescript
logger.info('Cross-salon query', {
  userId,
  salonIds,
  operation: 'getCrossSalonMetrics',
})
```

### 6. Document HQ Features Clearly

Any feature that accesses multiple salons should be clearly marked:

```typescript
/**
 * Get aggregated metrics across ALL salons
 * @hq-feature Requires HQ role
 */
export async function getCrossSalonMetrics() {
  // ...
}
```

---

## Migration Checklist

When adding new tenant-scoped tables:

- [ ] Add `salon_id UUID NOT NULL REFERENCES salons(id)`
- [ ] Add index: `CREATE INDEX idx_{table}_salon ON {table}(salon_id)`
- [ ] Enable RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY`
- [ ] Create SELECT policy with `salon_id` check
- [ ] Create INSERT policy with `salon_id` check
- [ ] Create UPDATE policy with `salon_id` check
- [ ] Create DELETE policy with `salon_id` check
- [ ] Update server actions to include `salon_id` parameter
- [ ] Update all queries to filter by `salon_id`
- [ ] Add unit tests for multi-tenant scoping
- [ ] Run `npm run verify:multi-tenant`

---

**Last Updated**: 2025-01-22
**Maintained By**: Development Team
