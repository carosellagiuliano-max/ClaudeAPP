# SCHNITTWERK Production Readiness Checklist

**Version:** 1.0.0
**Date:** 2025-01-22
**Purpose:** Complete checklist for launching SCHNITTWERK to production

---

## Overview

This checklist consolidates all requirements from the deployment guide into one actionable document. Use this as your final verification before going live.

**Estimated Time to Complete:** 4-6 hours
**Recommended Team:** 2-3 people (Developer, QA, Product Owner)

---

## Phase 1: Code Quality & Testing ✓

### Unit & Integration Tests
- [ ] All unit tests passing: `npm run test`
- [ ] Coverage > 80%: `npm run test:coverage`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Slot engine tests passing (20+ tests)
- [ ] Multi-tenancy tests passing (20+ tests)

### Code Quality
- [ ] TypeScript compilation: `npm run type-check` (no errors)
- [ ] Linting passes: `npm run lint` (no errors)
- [ ] Build succeeds: `npm run build` (no errors)
- [ ] Bundle size reviewed (< 500KB main bundle)

### Security Audit
- [ ] Security audit passes: `npm run security:audit`
- [ ] Multi-tenant verification: `npm run verify:multi-tenant`
- [ ] All queries have `salon_id` scoping
- [ ] RBAC enforcement verified
- [ ] RLS policies tested
- [ ] No secrets in code (all in env vars)
- [ ] Dependencies updated (no critical vulnerabilities)

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 2: Infrastructure Setup 🔧

### Vercel Configuration
- [ ] Vercel Pro account created ($20/month)
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Logged in: `vercel login`
- [ ] Project linked: `vercel link`
- [ ] Build settings configured:
  - Framework: Next.js
  - Build command: `npm run build`
  - Output directory: `.next`
  - Node version: 20.x

### Database (Supabase)
- [ ] Supabase Pro account created
- [ ] Production project created
- [ ] Connection pooling enabled (port 6543)
- [ ] All migrations applied:
  ```bash
  # Verify migrations
  supabase db diff --linked
  ```
- [ ] RLS policies enabled on all tables
- [ ] Database backups configured (daily at 02:00 UTC)
- [ ] Point-in-Time Recovery (PITR) enabled
- [ ] Connection limits reviewed (max 60 for Pro)

### Performance Optimization
- [ ] Database indexes applied (20+ indexes from migration)
- [ ] Slow query audit completed
- [ ] Image optimization configured
- [ ] API routes use `revalidate` for caching where appropriate

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 3: Environment Variables 🔐

### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (⚠️ Keep secret!)

### Stripe (LIVE MODE)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set (pk_live_...)
- [ ] `STRIPE_SECRET_KEY` set (sk_live_...) (⚠️ Keep secret!)
- [ ] `STRIPE_WEBHOOK_SECRET` set (whsec_...) (⚠️ Keep secret!)
- [ ] Webhook endpoint configured: `https://schnittwerk.ch/api/webhooks/stripe`
- [ ] Webhook events enabled:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `checkout.session.completed`

### Email (Resend)
- [ ] `RESEND_API_KEY` set (re_...) (⚠️ Keep secret!)
- [ ] Domain verified at Resend Dashboard
- [ ] DNS records added (SPF, DKIM, DMARC)
- [ ] Test email sent successfully

### Cron Jobs
- [ ] `CRON_SECRET` generated: `openssl rand -base64 32`
- [ ] `CRON_SECRET` set in Vercel (⚠️ Keep secret!)

### Error Tracking (Optional but Recommended)
- [ ] Sentry account created
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set
- [ ] `SENTRY_AUTH_TOKEN` set (for source maps)

### Application Settings
- [ ] `NODE_ENV` = `production`
- [ ] `NEXT_PUBLIC_APP_VERSION` = `1.0.0`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://schnittwerk.ch`

**Verification:**
```bash
# List all environment variables
vercel env ls

# Pull to verify (DO NOT commit this file!)
vercel env pull .env.production
```

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 4: Third-Party Services 🔌

### Stripe Setup
- [ ] Stripe account verified (business details)
- [ ] Live mode activated
- [ ] Bank account connected (for payouts)
- [ ] Tax settings configured (VAT/MwSt for Switzerland)
- [ ] Products created in Stripe Dashboard
- [ ] Webhook endpoint tested (send test webhook)
- [ ] Payment intents tested with test card in live mode

### Email Service (Resend)
- [ ] Domain added: schnittwerk.ch
- [ ] Domain verified (DNS records)
- [ ] SPF record: `v=spf1 include:resend.io ~all`
- [ ] DKIM record: (provided by Resend)
- [ ] Test email sent and received
- [ ] Email templates reviewed:
  - Booking confirmation
  - Appointment reminder
  - Order confirmation

### Monitoring Services
- [ ] **Sentry** (Error Tracking):
  - Project created
  - SDK installed and configured
  - Test error sent and received
  - Alerts configured
- [ ] **UptimeRobot** (Uptime Monitoring):
  - Account created (free tier)
  - Monitors added:
    - Main site (https://schnittwerk.ch)
    - Health check (/api/health)
    - Booking API (/api/booking/availability)
  - Alert contacts configured
- [ ] **Vercel Analytics** (Built-in):
  - Automatically enabled with Pro plan
  - Dashboard reviewed

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 5: Domain & SSL 🌐

### Domain Configuration
- [ ] Domain purchased: `schnittwerk.ch`
- [ ] Domain added to Vercel Dashboard
- [ ] DNS configured:

**Option A: Vercel Nameservers (Recommended)**
- [ ] Nameservers changed to Vercel:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

**Option B: External DNS**
- [ ] A record: `@` → Vercel IP (76.76.21.21)
- [ ] CNAME record: `www` → `cname.vercel-dns.com`

### SSL Certificate
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] Certificate status: "Active" in Vercel Dashboard
- [ ] HTTPS working: https://schnittwerk.ch
- [ ] HTTP → HTTPS redirect working
- [ ] `www` → non-www redirect configured (if desired)

### Email DNS Records (from Resend)
- [ ] SPF record added
- [ ] DKIM record added
- [ ] DMARC record added (optional but recommended)

**Verification:**
```bash
# Check DNS propagation
dig schnittwerk.ch
dig www.schnittwerk.ch

# Check SSL certificate
openssl s_client -connect schnittwerk.ch:443 -servername schnittwerk.ch
```

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 6: Deployment 🚀

### Pre-Deployment
- [ ] All previous phases completed
- [ ] Database backup created manually
- [ ] Environment variables exported and encrypted
- [ ] Git tag created: `git tag -a v1.0.0 -m "Production release 1.0.0"`
- [ ] All changes committed and pushed

### Initial Deployment
- [ ] Deploy to production:
  ```bash
  vercel --prod
  ```
- [ ] Deployment succeeded (check Vercel Dashboard)
- [ ] Build logs reviewed (no errors)
- [ ] Runtime logs reviewed (no errors)

### Post-Deployment Checks
- [ ] Site loads: https://schnittwerk.ch
- [ ] No console errors (check browser DevTools)
- [ ] Health check passes: https://schnittwerk.ch/api/health
- [ ] Database connection working

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 7: Functional Testing 🧪

### Public Pages
- [ ] Homepage loads correctly
- [ ] Services page displays all services
- [ ] About page loads
- [ ] Contact page loads
- [ ] Legal pages (Privacy Policy, Terms & Conditions)

### Booking Flow (End-to-End)
- [ ] Select service
- [ ] Choose date and time
- [ ] Available slots displayed correctly
- [ ] Select slot
- [ ] Enter customer details
- [ ] Booking created successfully
- [ ] Confirmation email received
- [ ] Appointment visible in admin dashboard
- [ ] Booked slot no longer available for other users

### Payment Flow
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Stripe Checkout opens
- [ ] Complete payment with test card:
  - Card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
- [ ] Payment succeeds
- [ ] Order status updated to "paid"
- [ ] Confirmation email received
- [ ] Webhook received and processed

### Admin Dashboard
- [ ] Login with admin credentials
- [ ] Dashboard loads
- [ ] View appointments
- [ ] Create manual appointment
- [ ] Update appointment status
- [ ] View customers
- [ ] View analytics
- [ ] View orders
- [ ] Export reports

### Staff Portal
- [ ] Login with staff credentials
- [ ] View assigned appointments
- [ ] Update appointment status
- [ ] View schedule
- [ ] Block time slots

### Multi-Salon Features
- [ ] Create second salon
- [ ] Verify data isolation (Salon A cannot see Salon B data)
- [ ] HQ user can access both salons
- [ ] Cross-salon analytics working

### Cron Jobs
- [ ] Verify cron jobs in Vercel Dashboard → Cron
- [ ] Wait for next execution window
- [ ] Check `cron_job_runs` table:
  ```sql
  SELECT * FROM cron_job_runs
  ORDER BY completed_at DESC
  LIMIT 10;
  ```
- [ ] Verify reminders sent (if appointments exist)
- [ ] Verify expired reservations cleaned up

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 8: Performance Testing ⚡

### Load Testing
- [ ] Artillery test executed:
  ```bash
  artillery run artillery.yml
  ```
- [ ] Results reviewed:
  - p95 response time < 2s ✓
  - p99 response time < 5s ✓
  - Error rate < 1% ✓
- [ ] k6 test executed:
  ```bash
  k6 run k6-load-test.js
  ```
- [ ] Results reviewed:
  - Booking success rate > 95% ✓
  - No database connection errors ✓

### Core Web Vitals
- [ ] Lighthouse audit run (Chrome DevTools)
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90
- [ ] Core Web Vitals:
  - LCP (Largest Contentful Paint) < 2.5s ✓
  - FID (First Input Delay) < 100ms ✓
  - CLS (Cumulative Layout Shift) < 0.1 ✓

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 9: Monitoring & Observability 📊

### Error Tracking (Sentry)
- [ ] Sentry receiving events
- [ ] Source maps uploaded (stack traces readable)
- [ ] Alerts configured:
  - Error rate > 1% (15-minute window)
  - New issue detected
  - Performance degradation (p95 > 5s)
- [ ] Alert notifications working (email/Slack)

### Uptime Monitoring (UptimeRobot)
- [ ] All monitors active and "Up"
- [ ] Alert contacts verified
- [ ] Test alert sent and received

### Application Performance
- [ ] Vercel Analytics dashboard reviewed
- [ ] Web Vitals in "Good" range
- [ ] No significant errors in last hour
- [ ] Database performance reviewed (Supabase Dashboard)
- [ ] No slow queries (> 1s)

### Custom Health Checks
- [ ] `/api/health` returns 200 OK
- [ ] `/api/health/detailed` shows all systems healthy:
  ```json
  {
    "status": "healthy",
    "checks": {
      "database": true,
      "stripe": true,
      "email": true,
      "cron": true
    }
  }
  ```

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 10: Backup & Disaster Recovery 💾

### Database Backups
- [ ] Supabase automatic backups enabled
- [ ] Last backup timestamp verified (< 24 hours ago)
- [ ] Manual backup created and downloaded:
  ```bash
  pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres -F c -f backup-$(date +%Y%m%d).dump
  ```
- [ ] Backup uploaded to off-site storage (S3/GCS)
- [ ] Backup restoration tested successfully

### Configuration Backups
- [ ] Environment variables exported:
  ```bash
  vercel env pull .env.production
  gpg --encrypt .env.production
  ```
- [ ] Encrypted env file stored securely (password manager)
- [ ] Git repository tagged: `v1.0.0`

### Disaster Recovery Plan
- [ ] Disaster recovery procedures documented
- [ ] Recovery Time Objective (RTO) defined: 4 hours
- [ ] Recovery Point Objective (RPO) defined: 24 hours
- [ ] Team trained on recovery procedures
- [ ] Emergency contacts list created

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 11: Security Hardening 🔒

### Authentication & Authorization
- [ ] All admin routes require authentication
- [ ] RBAC enforced (admin, staff, customer roles)
- [ ] Session management secure (httpOnly cookies)
- [ ] Password requirements enforced
- [ ] No exposed admin credentials in code/docs

### Data Protection
- [ ] All database queries scoped by `salon_id`
- [ ] RLS policies prevent cross-tenant access
- [ ] Sensitive data encrypted at rest (Supabase default)
- [ ] Sensitive data encrypted in transit (HTTPS everywhere)
- [ ] No PII in logs or error messages

### API Security
- [ ] Rate limiting configured (Vercel)
- [ ] Webhook signature verification enabled (Stripe)
- [ ] Cron endpoints secured with `CRON_SECRET`
- [ ] CORS configured correctly
- [ ] Input validation with Zod on all forms

### GDPR Compliance
- [ ] Privacy Policy published
- [ ] Cookie consent banner (if using analytics cookies)
- [ ] Data retention policies documented
- [ ] User data export capability (GDPR right to access)
- [ ] User data deletion capability (GDPR right to be forgotten)

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 12: Legal & Compliance 📜

### Legal Pages
- [ ] Privacy Policy published at /privacy
- [ ] Terms & Conditions published at /terms
- [ ] Impressum (required in Switzerland) published at /impressum
- [ ] All legal pages reviewed by legal counsel

### Business Compliance
- [ ] Business registered in Switzerland
- [ ] VAT number obtained (if required)
- [ ] VAT/MwSt calculation verified (7.7% for Switzerland)
- [ ] Stripe account verified with business details
- [ ] Payment processing compliant with Swiss regulations

### Accessibility
- [ ] WCAG 2.1 AA compliance reviewed
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/JAWS)
- [ ] Color contrast verified (4.5:1 minimum)
- [ ] Alt text on all images

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 13: Documentation 📖

### Technical Documentation
- [ ] `README.md` updated with production info
- [ ] `docs/deployment.md` complete and accurate
- [ ] `docs/infrastructure.md` complete
- [ ] `docs/testing.md` complete
- [ ] `docs/multi-salon-guide.md` complete
- [ ] API documentation created (if exposing public APIs)

### Operational Documentation
- [ ] Runbooks created for common issues
- [ ] On-call procedures documented
- [ ] Escalation path defined
- [ ] Maintenance window schedule defined

### User Documentation
- [ ] User guide for customers (how to book)
- [ ] Admin manual (how to manage salon)
- [ ] Staff manual (how to use staff portal)
- [ ] FAQs compiled

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## Phase 14: Pre-Launch Final Checks ✅

### Final Smoke Tests
- [ ] Complete a real booking as a customer
- [ ] Complete a payment as a customer
- [ ] Login as admin and verify data
- [ ] Login as staff and verify schedule
- [ ] Verify all emails are being sent
- [ ] Verify all cron jobs executed successfully

### Performance Verification
- [ ] Run final load test
- [ ] Check Lighthouse score
- [ ] Verify Web Vitals
- [ ] Check error rate (should be 0%)

### Team Readiness
- [ ] Development team notified of launch
- [ ] Support team trained
- [ ] On-call engineer assigned
- [ ] Communication plan prepared (status page, social media)

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Team trained on rollback steps
- [ ] Previous deployment URL saved (for instant rollback)

**Status:** ☐ Not Started ☐ In Progress ✓ Completed
**Responsible:** _______________
**Completed:** _______________

---

## GO/NO-GO Decision

**Date:** _______________
**Attendees:** _______________

### Go Criteria
All phases above must be marked as "Completed" (✓)

**Overall Status:**
- ☐ **GO** - All checks passed, ready to launch
- ☐ **NO-GO** - Issues found, need to address before launch

**Blocking Issues (if NO-GO):**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Decision Maker Signature:** _______________

---

## Launch Day Checklist 🎉

### T-60 minutes
- [ ] Final backup created
- [ ] All team members online
- [ ] Monitoring dashboards open
- [ ] Support channels ready

### T-30 minutes
- [ ] Final smoke test completed
- [ ] No errors in logs
- [ ] All systems green

### T-0 (Launch)
- [ ] DNS updated (if switching from old site)
- [ ] Site live at https://schnittwerk.ch
- [ ] Announcement posted (social media, email)

### T+15 minutes
- [ ] Site accessible
- [ ] No errors in Sentry
- [ ] Uptime monitors green
- [ ] First booking completed (test or real)

### T+60 minutes
- [ ] Error rate < 0.1%
- [ ] Response times normal
- [ ] Database performance normal
- [ ] No customer complaints

### T+4 hours
- [ ] First cron job executed
- [ ] Email delivery 100%
- [ ] Payment processing working
- [ ] Team debrief completed

---

## Post-Launch Monitoring (First 24 Hours)

### Hourly Checks
- [ ] Hour 1: Error rate, uptime, response times
- [ ] Hour 2: Error rate, uptime, response times
- [ ] Hour 4: Error rate, uptime, response times
- [ ] Hour 8: Error rate, uptime, response times
- [ ] Hour 24: Full system review

### Metrics to Monitor
- Uptime: Target 100%
- Error rate: Target < 0.1%
- Response time (p95): Target < 2s
- Booking success rate: Target > 98%
- Email delivery rate: Target > 99%
- Payment success rate: Target > 95%

### Incident Response
- [ ] Incident response team identified
- [ ] Communication channels established (Slack #production-alerts)
- [ ] Escalation path defined
- [ ] Rollback procedure ready

---

## Post-Launch Review (After 1 Week)

### Performance Review
- [ ] Uptime: _____ % (target: 99.9%+)
- [ ] Error rate: _____ % (target: < 0.1%)
- [ ] Average response time: _____ ms (target: < 500ms)
- [ ] Core Web Vitals: ☐ All Green ☐ Needs Improvement

### Business Metrics
- [ ] Total bookings: _____
- [ ] Total revenue: CHF _____
- [ ] Conversion rate: _____ %
- [ ] Customer satisfaction: _____ / 5

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Action Items
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Lessons Learned
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Ongoing Maintenance

### Daily
- [ ] Review error logs (Sentry)
- [ ] Check uptime status (UptimeRobot)
- [ ] Verify cron jobs executed

### Weekly
- [ ] Review performance metrics
- [ ] Check database growth
- [ ] Review slow queries
- [ ] Update dependencies (if security patches)

### Monthly
- [ ] Full security audit
- [ ] Backup restoration test
- [ ] Cost optimization review
- [ ] Capacity planning review

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Update documentation
- [ ] Review and update RTO/RPO
- [ ] Security penetration test

---

## Emergency Contacts

**On-Call Engineer:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Backup Engineer:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Product Owner:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Service Providers:**
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.io
- Stripe Support: https://support.stripe.com

---

## Appendix: Quick Reference

### Useful Commands
```bash
# Deploy to production
vercel --prod

# View production logs
vercel logs --prod --follow

# Rollback to previous deployment
vercel rollback [deployment-url]

# Check environment variables
vercel env ls

# Create database backup
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres -F c -f backup.dump

# Run all tests
npm run test:all

# Security audit
npm run security:audit
```

### Important URLs
- Production site: https://schnittwerk.ch
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com
- Sentry Dashboard: https://sentry.io
- UptimeRobot Dashboard: https://uptimerobot.com/dashboard

---

**Checklist Version:** 1.0.0
**Last Updated:** 2025-01-22
**Next Review:** 2025-02-22
