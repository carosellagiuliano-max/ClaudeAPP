# SCHNITTWERK - Fullstack Architecture Plan
## Enterprise-Grade Salon Management System

> **Projekt**: SCHNITTWERK by Vanessa Carosella
> **Location**: Rorschacherstrasse 152, 9000 St. Gallen, Switzerland
> **Target**: Production-ready system für Swiss salon operations
> **Legal**: Swiss DSG, GDPR compliant
> **Currency**: CHF
> **Timezone**: Europe/Zurich

---

## 🎯 Executive Summary

Ein modernes, produktionsreifes Fullstack-System für Schweizer Salons, das von Tag 1 auf Multi-Salon-Architektur ausgelegt ist. Das System muss für Jahre laufen, rechtlich sicher sein, echte CHF-Zahlungen verarbeiten und später ohne schmerzhafte Rewrites skalieren.

### Core Philosophy
- ✅ **Configuration over Code**: Business data lebt in der DB
- ✅ **Multi-Tenant Ready**: Salon-scoped von Anfang an
- ✅ **Production First**: Kein Demo, kein POC
- ✅ **Long-term Maintainability**: Klare Boundaries, strong typing
- ✅ **Security by Design**: RLS auf allen Ebenen

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14+ App Router (React 18 + TypeScript)             │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  Public    │  │  Customer  │  │  Admin Portal      │    │
│  │  Website   │  │  Portal    │  │  (RBAC Protected)  │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
│                                                               │
│  Tailwind CSS + shadcn/ui + Design Tokens                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Server Actions   │  │ API Route        │                │
│  │ (RSC optimized)  │  │ Handlers         │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            FEATURE MODULES (Domain Logic)             │  │
│  │                                                        │  │
│  │  • booking/     → Slot engine, reservations          │  │
│  │  • shop/        → Cart, checkout, orders             │  │
│  │  • loyalty/     → Points, tiers, transactions        │  │
│  │  • notifications/ → Email, SMS abstraction           │  │
│  │  • analytics/   → Metrics, exports                   │  │
│  │  • accounting/  → Invoices, VAT, QR bills           │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              INFRASTRUCTURE MODULES                    │  │
│  │                                                        │  │
│  │  • lib/db/         → Repository pattern, queries     │  │
│  │  • lib/auth/       → Auth helpers, RLS context       │  │
│  │  • lib/validators/ → Zod schemas at boundaries       │  │
│  │  • lib/payments/   → Stripe abstraction              │  │
│  │  • lib/logging/    → Structured logs, correlation    │  │
│  │  • lib/config/     → Feature flags, settings         │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Stripe     │  │   Resend     │  │  Supabase    │     │
│  │   (CHF)      │  │   (Email)    │  │  Edge Fns    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
│  • Payment Intents + Webhooks (idempotent)                  │
│  • Email templates + SMS ready                               │
│  • Cron jobs (slot cleanup, reminders)                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│              Supabase PostgreSQL (Single Source of Truth)    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Row Level Security (RLS) auf allen Tabellen      │    │
│  │  • salon_id scoped data isolation                   │    │
│  │  • Generated TypeScript types                       │    │
│  │  • Migrations in supabase/migrations/               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │             Supabase Auth + Storage                 │    │
│  │  • Email/Password auth                              │    │
│  │  • JWT sessions                                     │    │
│  │  • Image + Document storage                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model - Core Entities

### Multi-Tenant Foundation
```sql
-- Every business table has salon_id
-- All queries scoped by salon_id + RLS
salons
  ├─ id (uuid)
  ├─ name, address, timezone
  ├─ legal_entity_name
  └─ accounting_settings (JSONB)
```

### Identity & Access (IAM)
```
auth.users (Supabase)
  └─> profiles (1:1)
        ├─> user_roles (M:N with salons)
        │     ├─ admin
        │     ├─ manager
        │     ├─ mitarbeiter
        │     ├─ kunde
        │     └─ hq (cross-salon)
        │
        ├─> customers (salon-scoped)
        └─> staff (salon-scoped)
```

### Booking Domain
```
services
  ├─> service_prices (temporal, valid_from/to)
  └─> service_categories

staff
  ├─> staff_service_skills (M:N)
  ├─> staff_working_hours (per weekday)
  └─> staff_absences

appointments
  ├─> appointment_services (M:N)
  ├─ status: reserved → confirmed → completed
  ├─ reserved_until (temporal holds)
  └─ deposit tracking

booking_rules (per salon)
  ├─ min_lead_time, max_horizon
  ├─ cancellation_cutoff
  └─ deposit_required_percent

waitlist_entries
```

### Shop & Commerce
```
products
  ├─> product_bundles
  ├─> inventory_items
  └─> stock_movements

carts → cart_items

orders → order_items
  ├─ snapshot prices + VAT
  ├─ invoice_number (unique per salon/year)
  ├─ legal_document references
  └─ shipping_method snapshot

vouchers
  └─> voucher_redemptions
```

### Payments & Accounting
```
payments
  ├─> payment_events (immutable audit trail)
  │     ├─ authorized, captured
  │     ├─ refunded, chargeback
  │     └─ dispute_* states
  │
  └─ payment_method enum:
      • stripe_card, stripe_twint
      • cash, terminal
      • voucher, manual_adjustment

stripe_event_log (idempotency via event_id)

invoice_counters (atomic, per salon/year)

tips (linked to staff + order/appointment)
```

### Loyalty & Marketing
```
loyalty_accounts
  └─> loyalty_transactions
        ├─ points_delta
        └─ invariant: sum = current_points

loyalty_tiers (configurable thresholds)

consents
  └─> consent_logs (granular, per purpose)

notification_templates (multi-language ready)
  └─> notification_logs
```

### Configuration & Compliance
```
opening_hours (per salon, per weekday)
tax_rates (temporal, valid_from/to)
shipping_methods
feature_flags
settings (key-value, non-critical only)

legal_documents (versioned: AGB, Datenschutz, etc.)
  └─> legal_document_acceptances

audit_logs (all critical actions)
  ├─ actor, action_type, target
  └─ metadata (JSONB)
```

---

## 🔐 Security Architecture

### Defense in Depth - Three Layers

#### 1. Database Layer (RLS Policies)
```sql
-- Example: Appointments
CREATE POLICY "salon_staff_access" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.profile_id = auth.uid()
        AND ur.salon_id = appointments.salon_id
        AND ur.role_name IN ('admin', 'manager', 'mitarbeiter')
    )
  );

-- Never trust salon_id from client!
-- Always derive from user_roles
```

#### 2. Application Layer (Server Actions)
```typescript
// Every sensitive action validates:
// - Auth state
// - Role permissions
// - Salon scope
// - Input schema (Zod)

async function createAppointment(input: unknown) {
  const user = await requireAuth();
  const data = CreateAppointmentSchema.parse(input);

  const salon_id = await getUserSalonId(user.id, data.salon_hint);
  if (!salon_id) throw new UnauthorizedError();

  // Business logic with scoped salon_id
}
```

#### 3. UI Layer (Component Guards)
```typescript
// Hide/disable based on role
// But NEVER rely on this alone!
{hasPermission('appointments:write') && (
  <CreateAppointmentButton />
)}
```

### Attack Surface Hardening
- ✅ **CSRF**: Next.js token protection on mutations
- ✅ **XSS**: React escaping + CSP headers
- ✅ **SQL Injection**: Parameterized queries only
- ✅ **Payment tampering**: Webhook signature verification
- ✅ **Rate limiting**: On auth endpoints + slot search
- ✅ **Session security**: Regenerate on privilege change
- ✅ **GDPR/DSG**: Deletion with retention rules

---

## 🚀 Implementation Phases

### **Phase 0**: Foundation (Week 1)
**Goal**: Bootable project with basic structure

**Deliverables**:
- ✅ Next.js 14+ mit App Router, TypeScript, Tailwind
- ✅ Folder structure (`app/`, `features/`, `lib/`, `supabase/`)
- ✅ shadcn/ui installation + theme tokens
- ✅ Environment variables template
- ✅ Git repo + `.gitignore`
- 📄 `docs/architecture.md`
- 📄 `docs/dev-setup.md`

**Tech Setup**:
```bash
npx create-next-app@latest schnittwerk --typescript --tailwind --app
cd schnittwerk
npx shadcn-ui@latest init
```

---

### **Phase 1**: Database & Auth (Week 2-3)
**Goal**: Rock-solid data foundation + auth flows

**Deliverables**:
- ✅ Supabase project (dev, staging, prod)
- ✅ Initial migrations:
  - `001_core_schema.sql`: salons, profiles, roles, user_roles
  - `002_customers_staff.sql`: customers, staff, skills
  - `003_services.sql`: services, categories, prices, tax_rates
  - `004_appointments_minimal.sql`: appointments, appointment_services, booking_rules
  - `005_opening_hours.sql`: opening_hours, staff_working_hours, blocked_times
- ✅ RLS policies auf allen Tabellen
- ✅ TypeScript type generation (`npx supabase gen types`)
- ✅ Auth setup: Email/password flows
- ✅ Seeding script: 1 Salon, 1 Admin, sample services/staff
- 📄 `docs/data-model.md`
- 📄 `docs/security-and-rls.md`

**Critical Tables** (Priority):
```
salons, profiles, roles, user_roles
customers, staff, staff_service_skills
service_categories, services, service_prices, tax_rates
appointments, appointment_services
opening_hours, staff_working_hours, staff_absences
booking_rules, blocked_times
```

---

### **Phase 2**: Design System (Week 4)
**Goal**: Consistent, beautiful UI foundation

**Deliverables**:
- ✅ Design tokens (`styles/tokens.css`):
  - Colors: Primary, accent, neutrals, semantic
  - Typography: Font scale, weights, line heights
  - Spacing: 4px grid system
  - Border radius, shadows, transitions
- ✅ Core components (shadcn + custom):
  - `Button`, `Input`, `Select`, `Textarea`
  - `Card`, `Badge`, `Tag`
  - `Dialog`, `Sheet`, `Dropdown`
  - `Table`, `Pagination`, `Search`
  - `Toast`, `Skeleton`, `Spinner`
- ✅ Layout components:
  - `PublicLayout`, `CustomerLayout`, `AdminLayout`
  - `Header`, `Footer`, `Sidebar`
- ✅ Responsive breakpoints
- ✅ Dark mode toggle (optional v1)
- 📄 `docs/design-system.md`

**Design Language**:
- Modern, calm, luxurious (Apple Store meets beauty brand)
- Generous whitespace, glass-like cards, subtle animations
- Mobile-first, accessibility-conscious

---

### **Phase 3**: Public Website (Week 5-6)
**Goal**: Customer-facing marketing + content

**Routes**:
```
/ (home + hero)
/leistungen (services from DB)
/team (staff cards)
/galerie (image gallery)
/ueber-uns (about)
/kontakt (contact form)
/shop (product listing preview)
/termin-buchen (booking entry point)
/impressum, /datenschutz, /agb (legal)
```

**Deliverables**:
- ✅ All routes with real data from Supabase
- ✅ Service listing (dynamic from `services` table)
- ✅ Contact form → email notification
- ✅ SEO setup:
  - Meta tags, Open Graph
  - Sitemap.xml, robots.txt
  - Local business structured data
- ✅ Footer mit social links, legal links
- ✅ Prominent "Termin buchen" CTA
- 📄 `docs/seo-setup.md`

---

### **Phase 4**: Booking Engine (Week 7-9) 🔥 **CRITICAL**
**Goal**: Bulletproof slot calculation + booking flow

**Deliverables**:
- ✅ Slot engine (`features/booking/slot-engine.ts`):
  - Input: salon_id, date_range, service_ids, preferred_staff
  - Output: Available slots with staff binding
  - Respects:
    - Opening hours, staff schedules, absences
    - Existing appointments, blocked times
    - Lead time, max horizon, cancellation cutoff
    - Slot granularity (e.g., 15min intervals)
- ✅ Booking flow (4 steps):
  1. Choose service(s)
  2. Choose staff or "no preference"
  3. Select time slot (from slot engine)
  4. Confirm + optional deposit
- ✅ Temporary reservation:
  - Create appointment with `status = 'reserved'`
  - Set `reserved_until` (e.g., +15 min)
  - Unique index on `(salon_id, staff_id, starts_at)` for reserved/confirmed
- ✅ Cron job: Clear expired reservations
- ✅ Customer registration + login
- ✅ Customer portal:
  - View upcoming/past appointments
  - Cancel/reschedule (within rules)
- ✅ Email notifications (booking, cancellation, reminder)
- ✅ Property-based tests für slot engine
- 📄 `docs/booking-engine.md`

**Concurrency Protection**:
```sql
-- Unique constraint prevents double bookings
CREATE UNIQUE INDEX idx_staff_time_active ON appointments (
  salon_id, staff_id, starts_at
) WHERE status IN ('reserved', 'confirmed');
```

**Booking Rules Enforcement**:
```typescript
// Example validation
const now = new Date();
const minStart = addMinutes(now, bookingRules.min_lead_time_minutes);
const maxStart = addDays(now, bookingRules.max_booking_horizon_days);

if (slotStart < minStart || slotStart > maxStart) {
  throw new BookingRuleViolationError();
}
```

---

### **Phase 5**: Shop & Payments (Week 10-12)
**Goal**: E-commerce + Stripe integration (CHF)

**Deliverables**:
- ✅ Product domain:
  - `products`, `product_categories`, `product_bundles`
  - `inventory_items`, `stock_movements`
- ✅ Cart system:
  - `carts`, `cart_items` (persisted for logged-in users)
  - Session cart for guests
- ✅ Checkout flow:
  - Shipping method selection
  - Guest checkout support
  - Voucher redemption
- ✅ Orders:
  - `orders`, `order_items` (snapshot prices + VAT)
  - `invoice_counters` (atomic per salon/year)
  - Generate unique invoice_number
- ✅ Stripe integration:
  - Payment Intents for online payments (CHF)
  - Webhook handler (`/api/webhooks/stripe`)
  - `stripe_event_log` (idempotency via event_id)
  - `payments`, `payment_events` (immutable audit trail)
- ✅ Payment methods:
  - Online (Stripe card/Twint)
  - Pay at venue (cash/terminal)
- ✅ Vouchers:
  - `vouchers`, `voucher_redemptions`
  - Apply to cart/checkout
- ✅ Order confirmation emails
- ✅ Customer portal: Order history
- 📄 `docs/payments-and-webhooks.md`

**Stripe Webhook Idempotency**:
```typescript
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, secret);

  // Check if already processed
  const exists = await db
    .from('stripe_event_log')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (exists) return new Response('OK'); // Idempotent

  await db.from('stripe_event_log').insert({ event_id: event.id, ... });

  // Process event...
}
```

**Invoice Number Generation**:
```typescript
// Atomic increment via transaction + row lock
const { invoice_number } = await db.rpc('get_next_invoice_number', {
  p_salon_id: salonId,
  p_year: new Date().getFullYear()
});
```

---

### **Phase 6**: Admin Portal (Week 13-16)
**Goal**: Full backoffice management

**Modules** (in priority order):

#### 6.1 Services & Staff Management
- ✅ CRUD for services, categories, prices
- ✅ CRUD for staff, skills, working hours
- ✅ Assign services to staff via `staff_service_skills`

#### 6.2 Calendar & Appointments
- ✅ Calendar views: Day, Week, Staff
- ✅ Create/edit/cancel appointments
- ✅ Block times (salon-wide or per staff)
- ✅ Emergency reschedule (staff sick)
- ✅ Offline walk-in bookings

#### 6.3 Customer Management
- ✅ Customer list (search, filter, export CSV)
- ✅ Customer detail:
  - Profile, visits, spend, loyalty
  - Appointments, orders, consents, notes
- ✅ Impersonation für support (logged in audit_logs)

#### 6.4 Shop & Inventory
- ✅ CRUD for products, bundles, categories
- ✅ Inventory tracking (stock movements)
- ✅ Low stock warnings

#### 6.5 Orders & Invoices
- ✅ Order list (filter by status, payment method)
- ✅ Order detail view
- ✅ Trigger refunds via Stripe
- ✅ Generate/download invoices (PDF later)

#### 6.6 Notification Templates
- ✅ Template CRUD (email, SMS-ready)
- ✅ Variable replacement preview
- ✅ Test send to admin email
- ✅ Notification logs

#### 6.7 Analytics & Finance
- ✅ Revenue dashboard (period filters)
- ✅ Appointments by staff/service
- ✅ Product sales
- ✅ VAT summary per tax rate
- ✅ Accounting export (CSV)

#### 6.8 Settings
- ✅ Salon profile (name, address, contact)
- ✅ Opening hours management
- ✅ Booking rules config
- ✅ Tax rates, shipping methods
- ✅ Deposit & no-show policy

#### 6.9 Roles & Permissions
- ✅ User role management (RBAC)
- ✅ Audit logs view

**RBAC Enforcement**:
```typescript
// Server action example
export async function deleteService(serviceId: string) {
  const user = await requireAuth();
  const salon_id = await getUserSalonId(user.id);

  await requirePermission(user.id, salon_id, 'services:delete');

  // Delete with RLS enforced
  await db.from('services').delete().eq('id', serviceId).eq('salon_id', salon_id);
}
```

---

### **Phase 7**: Hardening & Testing (Week 17-19)
**Goal**: Production-ready quality

**Testing**:
- ✅ Unit tests (Vitest):
  - Slot engine logic
  - Voucher redemption
  - Loyalty points calculation
  - Price snapshot logic
- ✅ Integration tests (Playwright):
  - Complete booking flow
  - Checkout flow
  - Admin appointment creation
- ✅ Property-based tests (fast-check):
  - Slot engine: No overlaps, rules respected
  - Invoice numbering: No gaps, unique per salon
- ✅ E2E tests:
  - Critical paths (booking, payment, cancellation)

**Observability**:
- ✅ Structured logging (`lib/logging.ts`):
  - Correlation IDs for multi-step flows
  - Error context capture
- ✅ Error tracking (Sentry behind adapter)
- ✅ Health check endpoint (`/api/health`)
- ✅ Monitoring setup (Supabase metrics, Vercel analytics)

**Performance**:
- ✅ Database indexes on hot queries:
  - `appointments(salon_id, staff_id, starts_at)`
  - `orders(salon_id, customer_id, created_at)`
  - `products(salon_id, active)`
- ✅ N+1 query prevention (check admin lists)
- ✅ Caching for read-heavy config (services, opening hours)

**Security Audit**:
- ✅ Review all RLS policies
- ✅ Test role escalation attempts
- ✅ Validate input schemas (Zod at all boundaries)
- ✅ Check Stripe webhook signature validation
- ✅ CSP headers configured

**Documentation**:
- 📄 `docs/testing.md`
- 📄 `docs/operations.md`
- 📄 `docs/deletion-and-retention.md`
- 📄 `docs/migrations-and-zero-downtime.md`

---

### **Phase 8**: Multi-Salon Readiness (Week 20)
**Goal**: Prove architecture scales to N salons

**Deliverables**:
- ✅ Audit all queries for `salon_id` scoping
- ✅ Test with 2+ salons in staging
- ✅ HQ role for cross-salon analytics
- ✅ Per-salon theming (color tokens in DB)
- ✅ Onboarding process for new salon (documented)
- 📄 `docs/multi-salon-guide.md`

**Multi-Tenant Verification Checklist**:
```sql
-- Find tables without salon_id (should be only global config)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('salons', 'roles', 'profiles', 'auth_users')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = tablename AND column_name = 'salon_id'
  );
```

---

## 📂 Project Structure

```
schnittwerk/
├── app/
│   ├── (public)/              # Public marketing site
│   │   ├── page.tsx           # Home
│   │   ├── leistungen/
│   │   ├── team/
│   │   ├── kontakt/
│   │   └── shop/
│   ├── (customer)/            # Customer portal
│   │   ├── layout.tsx         # Auth required
│   │   ├── dashboard/
│   │   ├── appointments/
│   │   ├── orders/
│   │   └── profile/
│   ├── (admin)/               # Admin portal
│   │   ├── layout.tsx         # RBAC enforced
│   │   ├── calendar/
│   │   ├── customers/
│   │   ├── team/
│   │   ├── shop/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   └── health/
│   ├── booking/               # Booking flow
│   │   ├── [step]/
│   │   └── confirmation/
│   └── layout.tsx             # Root layout
│
├── components/
│   ├── ui/                    # shadcn components
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   ├── CustomerLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── booking/
│   ├── shop/
│   └── admin/
│
├── features/                  # Domain modules
│   ├── booking/
│   │   ├── slot-engine.ts     # Core slot logic
│   │   ├── reservation.ts
│   │   ├── rules.ts
│   │   └── __tests__/
│   ├── shop/
│   │   ├── cart.ts
│   │   ├── checkout.ts
│   │   └── vouchers.ts
│   ├── loyalty/
│   │   ├── points.ts
│   │   ├── tiers.ts
│   │   └── transactions.ts
│   ├── notifications/
│   │   ├── email.ts
│   │   ├── sms.ts
│   │   └── templates.ts
│   ├── analytics/
│   ├── accounting/
│   │   ├── invoices.ts
│   │   ├── vat.ts
│   │   └── qr-bill.ts
│   └── payments/
│       ├── stripe.ts
│       ├── webhooks.ts
│       └── pos.ts
│
├── lib/
│   ├── db/
│   │   ├── client.ts          # Supabase client
│   │   ├── types.ts           # Generated types
│   │   └── repositories/      # Data access layer
│   ├── auth/
│   │   ├── session.ts
│   │   ├── rbac.ts
│   │   └── rls-context.ts
│   ├── validators/
│   │   └── schemas.ts         # Zod schemas
│   ├── payments/
│   │   └── stripe-adapter.ts
│   ├── notifications/
│   │   ├── email-adapter.ts
│   │   └── sms-adapter.ts
│   ├── logging/
│   │   ├── logger.ts
│   │   └── correlation.ts
│   ├── config/
│   │   ├── feature-flags.ts
│   │   └── constants.ts
│   └── utils/
│       ├── dates.ts           # Timezone helpers
│       ├── currency.ts        # CHF formatting
│       └── validation.ts
│
├── styles/
│   ├── globals.css
│   └── tokens.css             # Design tokens
│
├── scripts/
│   ├── seed.ts
│   ├── migrate.ts
│   └── generate-types.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_schema.sql
│   │   ├── 002_customers_staff.sql
│   │   ├── 003_services.sql
│   │   ├── ...
│   │   └── 999_rls_policies.sql
│   ├── seed/
│   │   ├── 01_salons.sql
│   │   ├── 02_roles.sql
│   │   └── 03_sample_data.sql
│   └── config.toml
│
├── docs/
│   ├── ARCHITECTURE_PLAN.md   # This file
│   ├── architecture.md
│   ├── data-model.md
│   ├── security-and-rls.md
│   ├── dev-setup.md
│   ├── testing.md
│   ├── operations.md
│   ├── payments-and-webhooks.md
│   ├── deletion-and-retention.md
│   ├── migrations-and-zero-downtime.md
│   └── multi-salon-guide.md
│
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── package.json
└── README.md
```

---

## 🛡️ Critical Invariants & Constraints

### Data Integrity
- ✅ **No double bookings**: Unique index + slot engine logic
- ✅ **Invoice numbers**: Atomic, unique per salon/year, no gaps
- ✅ **Stock movements**: Sum never negative (except explicit override)
- ✅ **Loyalty points**: `loyalty_transactions` sum = `loyalty_accounts.current_points`
- ✅ **Immutable accounting**: Orders/payments never edited, corrections via new records

### Business Rules
- ✅ **Booking lead time**: Min 60min (configurable)
- ✅ **Booking horizon**: Max 90 days (configurable)
- ✅ **Cancellation cutoff**: Min 24h before appointment
- ✅ **Slot granularity**: 15min intervals (configurable)
- ✅ **Reservation timeout**: 15min hold before expiry
- ✅ **No-show policy**: Configurable (none, deposit, full charge)

### Security Invariants
- ✅ **Never trust client for salon_id**: Always derive from `user_roles`
- ✅ **RLS on all user data tables**: No exceptions
- ✅ **Stripe webhook signature**: Must verify before processing
- ✅ **Idempotency**: All critical operations (payments, booking, vouchers)
- ✅ **Audit trail**: All destructive actions logged

---

## 🚨 Known Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Double bookings** | High | Unique index + slot engine + tests |
| **Payment webhook failures** | High | Idempotency via `event_id`, manual reconciliation flow |
| **Timezone bugs** | Medium | Always use `Europe/Zurich`, store `timestamptz`, test DST transitions |
| **VAT rate changes** | Medium | Temporal `tax_rates` table with `valid_from/to` |
| **Stripe outage** | Medium | Support "pay at venue" fallback, retry webhooks |
| **Email delivery failures** | Low | Log all sends in `notification_logs`, retry logic |
| **Data deletion vs. retention** | High | Documented deletion flow, anonymisation, legal retention periods |
| **Performance under load** | Medium | Indexes, caching, load testing before launch |

---

## 🔧 Development Workflow

### Local Development
```bash
# 1. Clone and install
git clone <repo> && cd schnittwerk
npm install

# 2. Setup Supabase
npx supabase init
npx supabase start  # Local Docker instance

# 3. Run migrations
npx supabase db reset  # Includes seed data

# 4. Generate types
npx supabase gen types typescript --local > lib/db/types.ts

# 5. Start Next.js
npm run dev
```

### Branch Strategy
- `main`: Production-ready code
- `staging`: Pre-production testing
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    - Lint (ESLint + Prettier)
    - Type check (tsc --noEmit)
    - Unit tests (Vitest)
    - Integration tests (Playwright)

  deploy-preview:
    - Deploy to Vercel preview

  deploy-staging:
    - On merge to staging branch
    - Run migrations on staging DB
    - Deploy to Vercel (staging)

  deploy-production:
    - On merge to main
    - Manual approval required
    - Run migrations on prod DB
    - Deploy to Vercel (production)
```

---

## 📋 Pre-Launch Checklist

### Phase 0-3: Foundation
- [ ] Next.js project initialized
- [ ] Supabase project created (dev, staging, prod)
- [ ] Design system implemented
- [ ] Public website live

### Phase 4: Booking
- [ ] Slot engine tested (property tests pass)
- [ ] Double booking prevention verified
- [ ] Temporary reservations expire correctly
- [ ] Email notifications working

### Phase 5: Payments
- [ ] Stripe test mode working
- [ ] Webhook idempotency tested
- [ ] Invoice numbering atomic (no gaps)
- [ ] Refund flow tested

### Phase 6: Admin
- [ ] All RBAC roles enforced
- [ ] RLS policies tested
- [ ] Admin cannot see other salon's data
- [ ] Impersonation logged in audit_logs

### Phase 7: Hardening
- [ ] All critical tests pass
- [ ] Load testing completed (booking + checkout)
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring dashboards set up
- [ ] Documentation complete

### Phase 8: Multi-Salon
- [ ] Tested with 2+ salons in staging
- [ ] No cross-salon data leaks
- [ ] HQ role working

### Legal & Compliance
- [ ] Legal documents versioned in DB
- [ ] Consent management working
- [ ] GDPR/DSG deletion flow tested
- [ ] VAT calculation verified by accountant
- [ ] Privacy policy live
- [ ] Terms & conditions live

### Production Cutover
- [ ] Stripe live keys configured
- [ ] Email provider live keys configured
- [ ] DNS configured (custom domain)
- [ ] SSL certificates active
- [ ] Backups scheduled (Supabase)
- [ ] Monitoring alerts configured
- [ ] On-call rotation defined
- [ ] Rollback plan documented

---

## 🎯 Success Criteria

### Technical
- ✅ Zero double bookings in production
- ✅ 99.9% uptime (measured over 30 days)
- ✅ < 2s page load time (Lighthouse score > 90)
- ✅ All tests pass on every deploy
- ✅ No critical security vulnerabilities (regular audits)

### Business
- ✅ Bookings processed without errors
- ✅ Payments captured reliably (< 0.1% failure rate)
- ✅ Customers can self-serve (cancellations, profile edits)
- ✅ Admin can manage daily operations without dev support
- ✅ System scales to 2+ salons without code changes

### Legal
- ✅ GDPR/DSG compliant (audit by legal counsel)
- ✅ VAT calculations correct (verified by accountant)
- ✅ Data retention rules enforced
- ✅ Audit trails complete

---

## 📚 Further Reading

### Internal Docs
- `docs/architecture.md` - High-level system design
- `docs/data-model.md` - Database schema deep dive
- `docs/security-and-rls.md` - Security architecture
- `docs/booking-engine.md` - Slot algorithm explained
- `docs/payments-and-webhooks.md` - Stripe integration guide
- `docs/testing.md` - Testing strategy
- `docs/operations.md` - Runbook for production

### External Resources
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Swiss DSG Guide](https://www.edoeb.admin.ch/edoeb/de/home/datenschutz/grundlagen/datenschutzgesetz.html)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

## 🙋 Questions to Resolve Early

### Business Logic
- [ ] **Deposit percentage**: Standard 20%? Per-service override?
- [ ] **No-show charge**: Deposit only or full amount?
- [ ] **Waitlist priority**: FIFO or customer tier-based?
- [ ] **Loyalty earn rate**: CHF 1 = 1 point? Tier multipliers?
- [ ] **Loyalty redemption**: Min/max points per transaction?

### Technical Decisions
- [ ] **Email provider**: Resend, SendGrid, or Postmark?
- [ ] **SMS provider**: Twilio, Vonage, or later?
- [ ] **Error tracking**: Sentry, Datadog, or Highlight?
- [ ] **Monitoring**: Vercel Analytics, Posthog, or custom?
- [ ] **QR Bill library**: Which Swiss QR code generator?

### Legal & Compliance
- [ ] **Data retention period**: 10 years for accounting data?
- [ ] **Backup anonymisation**: Legal counsel opinion?
- [ ] **Consent granularity**: Email vs. SMS separate?
- [ ] **Cookie consent**: Required for analytics?

---

## 🎉 Next Steps

1. **Review this plan** with stakeholders
2. **Set up environments** (Supabase projects, Vercel)
3. **Kick off Phase 0** (project scaffolding)
4. **Weekly check-ins** to track phase progress
5. **Adjust timeline** based on team capacity

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**Maintained By**: Claude (Senior Fullstack Engineer)
**Project**: SCHNITTWERK by Vanessa Carosella
**Location**: St. Gallen, Switzerland 🇨🇭

---

*"Build it right the first time, so it runs for years."*
