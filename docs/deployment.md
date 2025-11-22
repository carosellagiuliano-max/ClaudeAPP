# Production Deployment Guide

Complete guide for deploying SCHNITTWERK to production on Vercel.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel Pro Setup](#vercel-pro-setup)
- [Custom Domain Configuration](#custom-domain-configuration)
- [SSL Certificates](#ssl-certificates)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Third-Party Services](#third-party-services)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Disaster Recovery](#backup--disaster-recovery)

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

### Code Quality
- [ ] All tests passing (`npm run test:all`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Security audit passes (`npm run security:audit`)
- [ ] Multi-tenant verification passes (`npm run verify:multi-tenant`)

### Performance
- [ ] Load testing completed (Artillery/k6)
- [ ] Database indexes applied
- [ ] Image optimization configured
- [ ] API response times < 500ms (p95)

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] RLS policies tested
- [ ] RBAC enforcement verified
- [ ] Stripe webhook signature verification enabled
- [ ] Email domain verified

### Infrastructure
- [ ] Database backups configured
- [ ] Monitoring setup (health checks)
- [ ] Error tracking configured (Sentry)
- [ ] Cron jobs tested

### Legal & Compliance
- [ ] Privacy policy published
- [ ] Terms & conditions published
- [ ] GDPR compliance verified
- [ ] VAT calculation verified by accountant

---

## Vercel Pro Setup

### 1. Create Vercel Account

**Sign up for Vercel Pro:**
- Go to [vercel.com/signup](https://vercel.com/signup)
- Choose **Pro Plan** ($20/month per member)
- Pro features needed:
  - Custom domains with SSL
  - Team collaboration
  - Advanced analytics
  - Password protection (for staging)
  - 100GB bandwidth (Hobby: 100GB, Pro: 1TB)

### 2. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 3. Link Project

```bash
cd /path/to/ClaudeAPP
vercel link
```

**Select/Create:**
- Scope: Your team/account
- Link to existing project? No (first time)
- Project name: `schnittwerk`
- Directory: `./`

### 4. Configure Project Settings

In Vercel Dashboard → Project Settings:

**Build & Development Settings:**
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

**Root Directory:** `./` (leave empty)

**Node.js Version:** `18.x`

**Environment Variables:** See [Environment Variables](#environment-variables) section

---

## Custom Domain Configuration

### 1. Purchase Domain

**Recommended registrars:**
- Namecheap
- Google Domains (now Squarespace)
- Cloudflare Registrar

Purchase: `schnittwerk.ch`

### 2. Add Domain to Vercel

**Via Vercel Dashboard:**
1. Go to Project → Settings → Domains
2. Click "Add"
3. Enter: `schnittwerk.ch`
4. Click "Add"

Vercel will provide DNS records to configure.

### 3. Configure DNS Records

**Option A: Vercel Nameservers (Recommended)**

Point your domain's nameservers to Vercel:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Benefits:**
- ✅ Automatic SSL
- ✅ Automatic DNS configuration
- ✅ Vercel manages everything

**Option B: External DNS (Advanced)**

If you want to keep your current DNS provider:

```bash
# A Record (root domain)
Type: A
Name: @
Value: 76.76.21.21  # Vercel's IP

# CNAME Record (www subdomain)
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# CNAME Record (API subdomain)
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### 4. Add Subdomains

**Add these subdomains:**
- `www.schnittwerk.ch` → Redirects to apex
- `api.schnittwerk.ch` → API endpoint (optional)
- `staging.schnittwerk.ch` → Staging environment

**For each subdomain:**
1. Project → Settings → Domains
2. Click "Add"
3. Enter subdomain
4. Configure redirect or separate deployment

### 5. Verify Domain

Check DNS propagation:
```bash
dig schnittwerk.ch
dig www.schnittwerk.ch

# Should show Vercel IP or CNAME
```

Wait for DNS propagation (up to 48 hours, usually < 1 hour).

---

## SSL Certificates

### Automatic SSL (Vercel)

Vercel automatically provisions SSL certificates via Let's Encrypt.

**What Vercel does:**
1. Issues SSL certificate for your domain
2. Auto-renews every 90 days
3. Supports wildcard certificates
4. Enforces HTTPS (redirects HTTP → HTTPS)

**No action needed** - SSL is automatic! ✅

### Verify SSL

**Check SSL status:**
```bash
# Via browser
https://schnittwerk.ch

# Via curl
curl -I https://schnittwerk.ch

# Via SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=schnittwerk.ch
```

**Expected result:**
- ✅ Valid SSL certificate
- ✅ Grade A or A+ on SSL Labs
- ✅ TLS 1.2+ supported
- ✅ HSTS enabled

### Force HTTPS

Add to `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
};
```

### SSL Troubleshooting

**Issue: SSL not provisioning**
- Check DNS is pointing to Vercel
- Wait up to 24 hours
- Remove and re-add domain

**Issue: Mixed content warnings**
- Ensure all assets use HTTPS
- Update image URLs to use `https://`
- Check third-party scripts

---

## Environment Variables

### Production Environment Variables

**Set via Vercel Dashboard or CLI:**

```bash
# Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

**Or via Dashboard:**
1. Project → Settings → Environment Variables
2. Add each variable
3. Select "Production" environment
4. Click "Save"

### Environment-Specific Variables

**Development (local):**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
STRIPE_SECRET_KEY=sk_test_xxx
```

**Staging:**
```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add STRIPE_SECRET_KEY preview
```

**Production:**
```bash
# Live keys
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Verify Environment Variables

```bash
# List all env vars
vercel env ls

# Pull env vars to local
vercel env pull .env.production
```

---

## Database Migrations

### Supabase Production Setup

**1. Create Production Project**
- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Click "New Project"
- Name: "SCHNITTWERK Production"
- Region: Choose closest to users (Europe for Switzerland)
- Database password: Generate strong password
- Pricing: Pro ($25/month) - needed for production

**2. Apply Migrations**

```bash
# Option A: Via Supabase CLI
npx supabase link --project-ref your-production-ref
npx supabase db push

# Option B: Via SQL Editor in Dashboard
# Copy contents of each migration file from supabase/migrations/
# Paste into SQL Editor → Run
```

**3. Verify Migrations**

```sql
-- Check migrations table
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**4. Enable Row Level Security**

```sql
-- Ensure RLS is enabled on all tenant tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('salons', 'profiles');

-- Should show rowsecurity = true for all
```

**5. Create Initial Data**

```sql
-- Create first salon
INSERT INTO salons (
  name, slug, email, phone,
  street, postal_code, city, country
) VALUES (
  'SCHNITTWERK Zürich',
  'zurich',
  'zurich@schnittwerk.ch',
  '+41 44 123 45 67',
  'Bahnhofstrasse 1',
  '8001',
  'Zürich',
  'CH'
);
```

### Backup Strategy

**Automated Backups (Supabase Pro):**
- Daily backups (retained 7 days)
- Point-in-time recovery (7 days)
- Configurable backup windows

**Manual Backups:**
```bash
# Dump database
npx supabase db dump -f backup-$(date +%Y%m%d).sql

# Upload to S3 or similar
aws s3 cp backup-$(date +%Y%m%d).sql s3://schnittwerk-backups/
```

---

## Third-Party Services

### Stripe Production Setup

**1. Activate Live Mode**
- Stripe Dashboard → Activate Account
- Complete business verification
- Provide business details
- Verify bank account

**2. Get Live API Keys**
```bash
# Stripe Dashboard → Developers → API Keys
# Publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Secret key (NEVER expose to client)
STRIPE_SECRET_KEY=sk_live_xxx
```

**3. Configure Webhook (Live Mode)**
- Stripe Dashboard → Developers → Webhooks
- Add endpoint: `https://schnittwerk.ch/api/webhooks/stripe`
- Select events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `checkout.session.completed`
- Copy webhook secret: `STRIPE_WEBHOOK_SECRET=whsec_xxx`

**4. Enable Payment Methods**
- Stripe Dashboard → Settings → Payment methods
- Enable: Card, TWINT (Switzerland)
- Configure: Apple Pay, Google Pay

### Resend Production Setup

**1. Verify Domain**
- Resend Dashboard → Domains → Add Domain
- Enter: `schnittwerk.ch`
- Add DNS records:

```dns
TXT  @  v=spf1 include:_spf.resend.com ~all
TXT  resend._domainkey  [Copy from Resend]
TXT  _dmarc  v=DMARC1; p=quarantine; rua=mailto:dmarc@schnittwerk.ch
```

**2. Get Production API Key**
```bash
# Resend Dashboard → API Keys → Create
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**3. Configure Sending Address**
- From address: `noreply@schnittwerk.ch`
- Reply-to: `info@schnittwerk.ch`

**4. Set Up Webhooks (Optional)**
- Resend → Webhooks → Add
- Events: `email.delivered`, `email.bounced`, `email.complained`
- URL: `https://schnittwerk.ch/api/webhooks/resend`

### Sentry Setup (Error Tracking)

**1. Create Sentry Project**
- [sentry.io](https://sentry.io) → Create Project
- Platform: Next.js
- Name: SCHNITTWERK Production

**2. Install Sentry SDK**
```bash
npx @sentry/wizard -i nextjs
```

**3. Configure Sentry**
```bash
# Add to environment variables
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**4. Test Error Tracking**
```javascript
// Trigger test error
Sentry.captureException(new Error('Test error'));
```

---

## Deployment Process

### Initial Deployment

**1. Final Checks**
```bash
# Run all checks
npm run type-check
npm run lint
npm run test:all
npm run security:audit
```

**2. Deploy to Production**
```bash
# Deploy
vercel --prod

# Or via Git (automatic)
git push origin main  # If main branch is linked to production
```

**3. Monitor Deployment**
```bash
# Follow deployment logs
vercel logs --prod --follow

# Or in Dashboard
# Vercel Dashboard → Deployments → Click latest
```

### Deployment via Git (Recommended)

**Setup Git Integration:**
1. Vercel Dashboard → Project → Settings → Git
2. Connect GitHub/GitLab/Bitbucket
3. Configure:
   - Production Branch: `main`
   - Preview Branches: All branches
   - Ignore Build Step: (leave unchecked)

**Deploy Process:**
```bash
# Make changes
git add .
git commit -m "feat: new feature"

# Push to preview (any branch except main)
git push origin feature/new-feature
# → Generates preview URL

# Merge to main for production
git checkout main
git merge feature/new-feature
git push origin main
# → Auto-deploys to production
```

### Zero-Downtime Deployments

Vercel provides zero-downtime deployments automatically:

1. **New deployment** built in background
2. **Health checks** run on new deployment
3. **Traffic switches** atomically when ready
4. **Old deployment** kept for instant rollback

---

## Post-Deployment Verification

### Automated Checks

**1. Health Check**
```bash
curl https://schnittwerk.ch/api/health

# Expected response:
# {"status":"healthy","checks":{"database":{"status":"pass"},...}}
```

**2. SSL Certificate**
```bash
curl -I https://schnittwerk.ch | grep -i strict-transport

# Expected: Strict-Transport-Security header present
```

**3. API Endpoints**
```bash
# Test services endpoint
curl https://schnittwerk.ch/api/services

# Test health endpoint
curl https://schnittwerk.ch/api/health
```

### Manual Verification Checklist

- [ ] Homepage loads (`https://schnittwerk.ch`)
- [ ] Services page loads (`/leistungen`)
- [ ] Shop loads (`/shop`)
- [ ] Booking flow works (create test appointment)
- [ ] Checkout works (create test order)
- [ ] Admin login works (`/admin`)
- [ ] Email confirmation received (test booking)
- [ ] Stripe payment processes (test mode first!)
- [ ] Cron jobs running (check logs after 1 hour)
- [ ] Health check returns 200
- [ ] SSL certificate valid
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)

### Performance Verification

**1. Lighthouse Audit**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://schnittwerk.ch --view

# Target scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

**2. WebPageTest**
- Go to [webpagetest.org](https://www.webpagetest.org)
- Enter: `https://schnittwerk.ch`
- Location: Zurich, Switzerland
- Target: First Contentful Paint < 1.5s

**3. Core Web Vitals**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Monitoring Setup

**1. Uptime Monitoring**

Use [UptimeRobot](https://uptimerobot.com) (free):
- Monitor: `https://schnittwerk.ch/api/health`
- Interval: 5 minutes
- Alert: Email/SMS on downtime

**2. Error Tracking**

Sentry should be automatically capturing errors.

Check: Sentry Dashboard → Issues

**3. Analytics**

Vercel Analytics (included with Pro):
- Dashboard → Analytics
- Monitor: Page views, Web Vitals, Top pages

---

## Rollback Procedure

### Instant Rollback (Vercel)

**Via Dashboard:**
1. Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Confirm

**Via CLI:**
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

**Rollback time:** < 30 seconds

### Database Rollback

**⚠️ More complex - avoid if possible**

**Option A: Point-in-Time Recovery (Supabase Pro)**
1. Supabase Dashboard → Database → Backups
2. Select time point
3. Click "Restore"

**Option B: Manual Restore**
```bash
# Restore from backup
psql -U postgres -h db.xxx.supabase.co -d postgres -f backup.sql
```

**⚠️ Always test rollback in staging first!**

---

## Troubleshooting

### Deployment Failed

**Check build logs:**
```bash
vercel logs --prod
```

**Common issues:**
- TypeScript errors → Fix and redeploy
- Missing env vars → Add via `vercel env add`
- Build timeout → Optimize build process

### 500 Internal Server Error

**Check runtime logs:**
```bash
vercel logs --prod --follow
```

**Common causes:**
- Database connection error → Check Supabase URL
- Missing environment variable → Add and redeploy
- Uncaught exception → Check Sentry for error details

### Stripe Webhook Not Working

**1. Verify endpoint accessible:**
```bash
curl https://schnittwerk.ch/api/webhooks/stripe
# Should return 400 (missing signature) not 404
```

**2. Check webhook secret:**
```bash
vercel env ls
# Verify STRIPE_WEBHOOK_SECRET is set
```

**3. Test webhook:**
- Stripe Dashboard → Webhooks → Your endpoint
- Click "Send test webhook"
- Check response

### Email Not Sending

**1. Verify Resend API key:**
```bash
vercel env ls
# Verify RESEND_API_KEY is set
```

**2. Check domain verification:**
- Resend Dashboard → Domains
- Status should be "Verified"

**3. Check logs:**
```sql
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Performance Issues

**1. Check database queries:**
```sql
-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**2. Check indexes:**
```bash
npm run verify:multi-tenant
```

**3. Enable caching:**
```javascript
// Add to API routes
export const revalidate = 60; // Cache for 60 seconds
```

---

## Monitoring & Observability

Comprehensive monitoring setup to ensure system health, performance, and early detection of issues.

### Vercel Analytics (Built-in)

**Automatically enabled with Pro plan:**

1. **Real User Monitoring (RUM)**
   - Dashboard → Analytics → Web Vitals
   - Tracks: LCP, FID, CLS, TTFB
   - Target: All metrics in "Good" range

2. **Audience Insights**
   - Top pages by traffic
   - Geographic distribution
   - Device/browser breakdown
   - Traffic sources

3. **Performance Metrics**
   ```
   Targets:
   - Page Load Time (p75): < 2s
   - Time to First Byte (p75): < 400ms
   - Largest Contentful Paint: < 2.5s
   - First Input Delay: < 100ms
   - Cumulative Layout Shift: < 0.1
   ```

**Access:** Vercel Dashboard → Project → Analytics

### Error Tracking (Sentry)

**Setup (if not already configured):**

1. **Create Sentry Project**
   ```bash
   # Install Sentry SDK
   npm install @sentry/nextjs

   # Initialize
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Configure Environment**
   ```bash
   vercel env add NEXT_PUBLIC_SENTRY_DSN
   # Paste DSN from Sentry → Settings → Client Keys (DSN)

   vercel env add SENTRY_AUTH_TOKEN
   # Create token at: Sentry → Settings → Auth Tokens
   ```

3. **Key Features**
   - Automatic error capture (unhandled exceptions)
   - Source maps for stack traces
   - Release tracking
   - Performance monitoring
   - User feedback

4. **Alert Configuration**
   - Sentry → Alerts → New Alert Rule
   - **Recommended alerts:**
     - Error rate > 1% (15-minute window)
     - New issue detected
     - Performance degradation (p95 > 5s)

**Dashboard:** [sentry.io/organizations/your-org/issues/](https://sentry.io/)

### Application Performance Monitoring (APM)

Choose **one** of the following based on budget and requirements:

#### Option A: Vercel Speed Insights (Recommended - Built-in)

**Pros:**
- Zero configuration
- No additional cost with Pro plan
- Deep Next.js integration

**Cons:**
- Limited to frontend metrics
- No backend/database monitoring

**Setup:**
```bash
# Already enabled with Vercel Pro
# Just view: Dashboard → Speed Insights
```

#### Option B: Datadog (Enterprise)

**Pros:**
- Full-stack monitoring (frontend + backend + database)
- Advanced alerting
- Log aggregation
- Custom dashboards

**Cons:**
- $15-31/host/month
- More complex setup

**Setup:**
```bash
# Install Datadog integration
npm install dd-trace

# Add to application
# lib/datadog.ts
import tracer from 'dd-trace'
tracer.init({
  service: 'schnittwerk',
  env: process.env.NODE_ENV,
})

# Set environment variables
vercel env add DD_API_KEY
vercel env add DD_SITE # datadoghq.eu for EU
```

**Key Metrics to Track:**
- Request rate (requests/second)
- Error rate (errors/second)
- Response time (p50, p95, p99)
- Database query performance
- Stripe API latency
- Email delivery rate

#### Option C: New Relic (Alternative)

**Pros:**
- 100GB free/month
- Full APM capabilities
- AI-powered insights

**Cons:**
- Complex pricing model
- Longer learning curve

**Setup:**
```bash
# Install New Relic
npm install newrelic

# Configure
# newrelic.js
exports.config = {
  app_name: ['SCHNITTWERK'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  }
}

# Set environment variable
vercel env add NEW_RELIC_LICENSE_KEY
```

### Database Monitoring (Supabase)

**Built-in Supabase Monitoring:**

1. **Dashboard → Database → Query Performance**
   - Slow queries (> 1s)
   - Most frequent queries
   - Query execution plans

2. **Key Metrics**
   ```sql
   -- Check connection pool usage
   SELECT count(*) as active_connections
   FROM pg_stat_activity
   WHERE state = 'active';

   -- Check table sizes
   SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;

   -- Check index usage
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
   AND indexrelname NOT LIKE 'pg_toast_%'
   ORDER BY pg_relation_size(indexrelid) DESC;
   ```

3. **Alerts to Configure**
   - Database CPU > 80% (5 minutes)
   - Connection pool > 80% capacity
   - Disk usage > 80%
   - Slow query detected (> 5s)

**Access:** Supabase Dashboard → Database → Metrics

### Uptime Monitoring

**Recommended: UptimeRobot (Free tier)**

1. **Create Account**: [uptimerobot.com](https://uptimerobot.com)

2. **Add Monitors**:
   ```
   Monitor 1: Main Site
   - Type: HTTP(s)
   - URL: https://schnittwerk.ch
   - Interval: 5 minutes

   Monitor 2: Health Check
   - Type: HTTP(s)
   - URL: https://schnittwerk.ch/api/health
   - Interval: 5 minutes
   - Expected Status: 200

   Monitor 3: Booking API
   - Type: HTTP(s)
   - URL: https://schnittwerk.ch/api/booking/availability
   - Interval: 10 minutes
   ```

3. **Alert Contacts**:
   - Email: alerts@schnittwerk.ch
   - SMS (optional): +41 XX XXX XX XX
   - Slack (optional): #production-alerts

4. **Alert Settings**:
   - Send alert when down: After 2 failed checks
   - Send alert when up: Immediately
   - Alert frequency: Every 30 minutes until resolved

### Custom Health Checks

**Already implemented:** `/api/health` endpoint

**Extend with detailed checks:**

```typescript
// app/api/health/detailed/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks = {
    database: false,
    stripe: false,
    email: false,
    cron: false,
  }

  // Check database
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('salons').select('id').limit(1)
    checks.database = !error
  } catch (e) {
    checks.database = false
  }

  // Check Stripe
  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    })
    checks.stripe = response.ok
  } catch (e) {
    checks.stripe = false
  }

  // Check recent cron execution
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('cron_job_runs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)

    // Cron should run at least once per hour
    const lastRun = data?.[0]?.completed_at
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    checks.cron = lastRun && new Date(lastRun) > oneHourAgo
  } catch (e) {
    checks.cron = false
  }

  const allHealthy = Object.values(checks).every(v => v)

  return NextResponse.json(
    { status: allHealthy ? 'healthy' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  )
}
```

### Log Aggregation

**Option 1: Vercel Logs (Built-in)**

```bash
# View real-time logs
vercel logs --prod --follow

# Filter by function
vercel logs --prod --filter=/api/booking/create

# Export logs
vercel logs --prod --since=2025-01-22 > logs.txt
```

**Option 2: LogDrain to External Service**

Configure log streaming:

```bash
# Stream to Datadog
vercel integration add datadog

# Stream to Logtail
vercel integration add logtail
```

### Monitoring Dashboard Checklist

**Daily Checks (Automated):**
- [ ] Uptime status (UptimeRobot)
- [ ] Error rate < 0.1% (Sentry)
- [ ] Average response time < 500ms (Vercel Analytics)
- [ ] Database CPU < 50% (Supabase)

**Weekly Reviews:**
- [ ] Performance trends (Week-over-week)
- [ ] Top errors (Sentry)
- [ ] Slow queries (Supabase)
- [ ] Traffic patterns (Vercel Analytics)
- [ ] Email delivery rate (notification_logs)

**Monthly Reviews:**
- [ ] Cost optimization opportunities
- [ ] Capacity planning (database size, bandwidth)
- [ ] Security audit results
- [ ] Backup verification

### Alert Configuration Best Practices

**Critical Alerts (Immediate notification):**
- Site down (> 2 minutes)
- Database connection failed
- Error rate spike (> 5% in 5 minutes)
- Payment processing failed

**Warning Alerts (Review within 1 hour):**
- Performance degradation (p95 > 3s)
- Cron job failed
- Email delivery rate < 90%
- Database CPU > 70%

**Info Alerts (Review daily):**
- New deployment completed
- Weekly usage report
- Backup completed

---

## Backup & Disaster Recovery

Comprehensive backup strategy to prevent data loss and enable recovery.

### Database Backups (Supabase)

#### Automatic Daily Backups

**Supabase Pro Plan includes:**
- Daily automated backups (retained for 7 days)
- Point-in-Time Recovery (PITR) - restore to any point in last 7 days

**Verify backup schedule:**
1. Supabase Dashboard → Database → Backups
2. Check "Last backup" timestamp
3. Verify "Next backup" schedule

**Configuration:**
```
Frequency: Daily at 02:00 UTC
Retention: 7 days (Pro), 30 days (Team+)
Type: Physical backup (full database)
```

#### Manual Backups

**Before major changes (migrations, updates):**

```bash
# Via pg_dump (recommended)
pg_dump \
  -h db.xxxxx.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup-$(date +%Y%m%d-%H%M%S).dump

# Via Supabase CLI
supabase db dump -f backup.sql

# Verify backup file
ls -lh backup*.dump
```

**Schedule weekly backups:**

```bash
# Create backup script
# scripts/backup-database.sh
#!/bin/bash

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/schnittwerk"
FILENAME="schnittwerk-$DATE.dump"

mkdir -p $BACKUP_DIR

pg_dump \
  -h $SUPABASE_DB_HOST \
  -U postgres \
  -d postgres \
  -F c \
  -f "$BACKUP_DIR/$FILENAME"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/$FILENAME" s3://schnittwerk-backups/

# Keep only last 30 backups locally
ls -t $BACKUP_DIR/*.dump | tail -n +31 | xargs rm -f

echo "Backup completed: $FILENAME"
```

**Make executable and schedule:**
```bash
chmod +x scripts/backup-database.sh

# Add to crontab (if self-hosted)
0 2 * * 0 /path/to/scripts/backup-database.sh
```

#### Off-Site Backup Storage

**Option A: AWS S3 (Recommended)**

```bash
# Install AWS CLI
npm install -g aws-cli

# Configure credentials
aws configure

# Upload backup
aws s3 cp backup.dump s3://schnittwerk-backups/$(date +%Y/%m/%d)/

# Configure lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket schnittwerk-backups \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "archive-old-backups",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 30,
        "StorageClass": "GLACIER"
      }],
      "Expiration": {
        "Days": 365
      }
    }]
  }'
```

**Cost estimate:**
- Standard storage: $0.023/GB/month
- Glacier archive: $0.004/GB/month
- 10GB database → ~$0.23/month (Standard) or $0.04/month (Glacier)

**Option B: Google Cloud Storage**

```bash
# Install gcloud CLI
# See: cloud.google.com/sdk/install

# Upload backup
gsutil cp backup.dump gs://schnittwerk-backups/$(date +%Y/%m/%d)/

# Set retention policy (1 year)
gsutil lifecycle set lifecycle.json gs://schnittwerk-backups/
```

**Option C: Backblaze B2 (Low-cost alternative)**

```bash
# Cost: $0.005/GB/month (cheaper than S3)
# Install B2 CLI
pip install b2

# Upload backup
b2 upload-file schnittwerk-backups backup.dump $(date +%Y/%m/%d)/backup.dump
```

### Application Backups

#### Code & Configuration

**Git repository is source of truth:**

```bash
# Verify all code is committed
git status

# Tag production releases
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Backup .env configuration (encrypted)
# Store in password manager (1Password, LastPass, etc.)
```

#### Environment Variables

**Export from Vercel:**

```bash
# Download all environment variables
vercel env pull .env.production

# Encrypt and store securely
gpg --encrypt --recipient you@example.com .env.production

# Store encrypted file in secure location
# DO NOT commit to git!
```

**Backup schedule:** After every environment variable change

#### Media Files (User Uploads)

**If using Supabase Storage:**

1. **Configure Supabase Storage backups**
   - Dashboard → Storage → Settings
   - Enable "Backup to S3" (Pro plan feature)

2. **Manual media backup script:**

```typescript
// scripts/backup-media.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function backupMediaFiles() {
  const buckets = ['service-images', 'staff-photos', 'salon-logos']

  for (const bucketName of buckets) {
    const { data: files } = await supabase
      .storage
      .from(bucketName)
      .list()

    for (const file of files || []) {
      const { data } = await supabase
        .storage
        .from(bucketName)
        .download(file.name)

      if (data) {
        const backupPath = `backups/media/${bucketName}/${file.name}`
        fs.mkdirSync(path.dirname(backupPath), { recursive: true })
        fs.writeFileSync(backupPath, Buffer.from(await data.arrayBuffer()))
      }
    }
  }

  console.log('Media backup completed')
}

backupMediaFiles()
```

### Backup Verification

**Monthly backup restoration test:**

```bash
# 1. Create test database instance
createdb schnittwerk_restore_test

# 2. Restore backup
pg_restore \
  -d schnittwerk_restore_test \
  -c \
  backup-20250122.dump

# 3. Verify data integrity
psql schnittwerk_restore_test -c "
  SELECT
    (SELECT COUNT(*) FROM salons) as salons,
    (SELECT COUNT(*) FROM appointments) as appointments,
    (SELECT COUNT(*) FROM orders) as orders;
"

# 4. Cleanup
dropdb schnittwerk_restore_test
```

**Document results:**
- Date tested: ___________
- Backup file: ___________
- Status: ☐ Success ☐ Failed
- Issues found: ___________
- Time to restore: ___________

### Disaster Recovery Plan

#### Recovery Time Objective (RTO)

**Target: 4 hours** (maximum acceptable downtime)

**Recovery Point Objective (RPO)**

**Target: 24 hours** (maximum acceptable data loss)

- Database: PITR allows recovery to any point (RPO: minutes)
- Application: Instant rollback via Vercel (RPO: 0)
- User uploads: Daily backups (RPO: 24 hours)

#### Disaster Scenarios & Recovery Steps

**Scenario 1: Database Corruption**

1. **Identify scope** (full database or specific tables)
2. **If full database:**
   ```bash
   # Option A: PITR (Supabase Pro)
   Supabase Dashboard → Backups → Point-in-Time Recovery
   Select timestamp before corruption

   # Option B: Manual restore
   pg_restore -d postgres -c backup-latest.dump
   ```
3. **If specific tables:**
   ```sql
   -- Restore from backup to temp schema
   pg_restore -d postgres -n temp_restore backup-latest.dump

   -- Copy data back
   INSERT INTO public.appointments
   SELECT * FROM temp_restore.appointments;
   ```
4. **Verify data integrity**
5. **Resume operations**

**Scenario 2: Accidental Data Deletion**

```sql
-- Salons have soft-delete (deleted_at column)
-- Restore deleted records
UPDATE salons
SET deleted_at = NULL
WHERE id = 'xxx' AND deleted_at IS NOT NULL;

-- For hard deletes, use PITR or latest backup
```

**Scenario 3: Complete Supabase Outage**

1. **Check Supabase Status**: [status.supabase.com](https://status.supabase.com)
2. **If extended outage (> 1 hour):**
   - Deploy emergency read-only mode
   - Show maintenance message to users
   - Monitor status updates
3. **When restored:**
   - Verify database connectivity
   - Run health checks
   - Resume normal operations

**Scenario 4: Vercel Outage**

1. **Check Vercel Status**: [vercel-status.com](https://www.vercel-status.com/)
2. **If extended outage:**
   - Deploy to backup hosting (Netlify/AWS)
   - Update DNS to point to backup
3. **When restored:**
   - Verify deployment
   - Switch DNS back
   - Monitor closely

**Scenario 5: Complete Data Center Failure**

**Recovery steps:**
1. Provision new Supabase project in different region
2. Restore latest database backup
3. Update environment variables in Vercel
4. Deploy application
5. Update DNS if needed
6. Verify all integrations (Stripe, Resend)

**Estimated recovery time: 2-4 hours**

### Backup Checklist

**Daily (Automated):**
- [ ] Supabase automatic backup completed
- [ ] Backup logs reviewed (no errors)

**Weekly (Manual):**
- [ ] Manual database backup created
- [ ] Backup uploaded to off-site storage (S3/GCS)
- [ ] Environment variables exported and encrypted
- [ ] Media files backed up (if applicable)

**Monthly:**
- [ ] Backup restoration test performed
- [ ] Backup retention policy enforced (delete old backups)
- [ ] Disaster recovery plan reviewed
- [ ] Recovery time tested and documented

**Quarterly:**
- [ ] Full disaster recovery drill
- [ ] Update recovery procedures
- [ ] Review and update RTO/RPO targets
- [ ] Audit backup access permissions

### Backup Storage Requirements

**Estimated sizes:**
- Database: 1-10 GB (depends on # salons, appointments)
- Media files: 5-50 GB (depends on # images)
- Total: 10-60 GB

**Retention policy:**
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 12 months
- Yearly backups: Keep indefinitely (archived to Glacier)

**Cost estimate (AWS S3):**
- Standard (30 days): ~$0.70/month (30 GB)
- Glacier (1 year): ~$0.12/month (30 GB)
- Total: < $2/month for comprehensive backup strategy

---

## Production Checklist

### Before Launch

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] Stripe live mode enabled and tested
- [ ] Email domain verified
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Cron jobs tested
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring configured
- [ ] Load testing completed
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Privacy policy & T&C published
- [ ] Backup strategy implemented

### Day of Launch

- [ ] Final deployment to production
- [ ] Verify all checks passing
- [ ] Monitor error rates (Sentry)
- [ ] Monitor performance (Vercel Analytics)
- [ ] Test complete booking flow
- [ ] Test payment processing
- [ ] Verify email delivery
- [ ] Check cron jobs executed

### Post-Launch (24 hours)

- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify all emails sent
- [ ] Verify payments processed
- [ ] Check cron job execution
- [ ] Monitor uptime (should be 100%)
- [ ] Review user feedback

### Ongoing (Weekly)

- [ ] Review error rates (target: < 0.1%)
- [ ] Check performance (p95 < 2s)
- [ ] Verify backups running
- [ ] Review security logs
- [ ] Check email delivery rates (> 99%)
- [ ] Monitor disk usage
- [ ] Review slow queries

---

## Support & Maintenance

### Escalation Path

**Level 1 - Self-Service:**
- Check this documentation
- Review error logs (Sentry)
- Check Vercel deployment logs

**Level 2 - Service Providers:**
- Vercel Support (Pro plan includes support)
- Supabase Support (Pro plan includes support)
- Stripe Support (via Dashboard → Help)

**Level 3 - Emergency:**
- Rollback to last working deployment
- Contact on-call engineer
- Post-mortem after resolution

### Maintenance Windows

**Recommended:**
- Database maintenance: Tuesdays 02:00-04:00 CET
- Application updates: Wednesdays 22:00-23:00 CET
- Always announce 48 hours in advance

---

**Last Updated**: 2025-01-22
**Maintained By**: Development Team
