# SCHNITTWERK - Enterprise Salon Management System

> **Digital platform for SCHNITTWERK by Vanessa Carosella**
>
> Rorschacherstrasse 152, 9000 St. Gallen, Switzerland 🇨🇭

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)

---

## 🎯 Project Overview

A production-ready, full-stack salon management system designed for Swiss salons. Built from day one to support multiple salons, handle real CHF payments, comply with Swiss DSG/GDPR, and scale reliably for years.

### Core Features
- 📅 **Smart Booking Engine** - Real-time slot calculation, prevents double bookings
- 🛍️ **E-Commerce Shop** - Products, bundles, vouchers, inventory management
- 💳 **Payment Processing** - Stripe integration (CHF), POS support, invoicing
- 👥 **Customer Portal** - Self-service bookings, order history, loyalty program
- 🔧 **Admin Backend** - Calendar, team management, analytics, notifications
- 🔐 **Security First** - Row-level security, RBAC, GDPR/DSG compliance
- 🏢 **Multi-Tenant Ready** - Salon-scoped data from day one

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Server Components + Server Actions

### Backend & Data
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (email/password, JWT sessions)
- **Storage**: Supabase Storage (images, documents)
- **Background Jobs**: Supabase Edge Functions + Cron

### Integrations
- **Payments**: Stripe (CHF, cards, Twint)
- **Email**: Resend (or similar)
- **Monitoring**: Vercel Analytics, Sentry
- **Testing**: Vitest, Playwright, fast-check

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- Supabase CLI
- Docker (for local Supabase)

### Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd schnittwerk

# 2. Install dependencies
npm install

# 3. Setup Supabase (local development)
npx supabase init
npx supabase start

# 4. Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 5. Run migrations
npx supabase db reset

# 6. Generate TypeScript types
npm run generate:types

# 7. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
schnittwerk/
├── app/                  # Next.js App Router
│   ├── (public)/         # Public marketing site
│   ├── (customer)/       # Customer portal
│   ├── (admin)/          # Admin dashboard
│   └── api/              # API routes + webhooks
├── components/           # React components
├── features/             # Domain modules (booking, shop, loyalty, etc.)
├── lib/                  # Shared utilities, DB client, auth
├── supabase/             # Migrations, seeds, config
├── docs/                 # Architecture documentation
└── styles/               # Global styles, design tokens
```

See [ARCHITECTURE_PLAN.md](docs/ARCHITECTURE_PLAN.md) for detailed architecture.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📚 Documentation

- [Architecture Plan](docs/ARCHITECTURE_PLAN.md) - **START HERE** - Complete system design
- [Data Model](docs/data-model.md) - Database schema deep dive
- [Security & RLS](docs/security-and-rls.md) - Security architecture
- [Dev Setup](docs/dev-setup.md) - Detailed development environment setup
- [Testing Strategy](docs/testing.md) - Testing guidelines
- [Operations](docs/operations.md) - Production runbook
- [Payments & Webhooks](docs/payments-and-webhooks.md) - Stripe integration guide

---

## 🔐 Security

This system handles sensitive customer data and real payments. Security is paramount:

- ✅ **Row-Level Security (RLS)** on all tables
- ✅ **Role-Based Access Control (RBAC)** - Admin, Manager, Staff, Customer
- ✅ **Input validation** with Zod schemas at all boundaries
- ✅ **Stripe webhook signature verification**
- ✅ **GDPR/Swiss DSG compliance** - data deletion, consent management
- ✅ **Audit logs** for all critical actions

See [security-and-rls.md](docs/security-and-rls.md) for details.

---

## 🌍 Environments

| Environment | URL | Database | Stripe | Purpose |
|-------------|-----|----------|--------|---------|
| **Development** | localhost:3000 | Local Supabase | Test mode | Local dev |
| **Staging** | staging.schnittwerk.ch | Supabase (staging) | Test mode | Pre-production testing |
| **Production** | www.schnittwerk.ch | Supabase (prod) | Live mode | Customer-facing |

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables
Required environment variables (see `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RESEND_API_KEY=

SENTRY_DSN=
```

---

## 📈 Roadmap

### Phase 0: Foundation ✅ (Current)
- Project scaffolding, design system

### Phase 1: Database & Auth (Weeks 2-3)
- Core schema, RLS policies, auth flows

### Phase 2: Design System (Week 4)
- Component library, design tokens

### Phase 3: Public Website (Weeks 5-6)
- Marketing pages, service listing, SEO

### Phase 4: Booking Engine 🔥 (Weeks 7-9)
- Slot calculation, booking flow, customer portal

### Phase 5: Shop & Payments (Weeks 10-12)
- E-commerce, Stripe integration, invoicing

### Phase 6: Admin Portal (Weeks 13-16)
- Calendar, team, customers, analytics, settings

### Phase 7: Hardening (Weeks 17-19)
- Testing, observability, security audit, performance

### Phase 8: Multi-Salon (Week 20)
- Verify multi-tenant architecture, HQ role

---

## 🤝 Contributing

This is a private project for SCHNITTWERK. If you're part of the development team:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Commit Message Convention
```
type(scope): subject

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 📄 License

Proprietary - All Rights Reserved

Copyright © 2025 SCHNITTWERK by Vanessa Carosella

---

## 📞 Support

For technical questions or issues:
- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues (internal team only)
- **Emergency**: Contact on-call engineer

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Stripe](https://stripe.com/) - Payment processing
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

**Built with ❤️ for Swiss salons**
