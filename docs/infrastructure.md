# Infrastructure Guide

Complete guide for deploying and maintaining SCHNITTWERK infrastructure.

## Table of Contents

- [Overview](#overview)
- [Email Integration](#email-integration)
- [Stripe Webhooks](#stripe-webhooks)
- [Cron Jobs](#cron-jobs)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

SCHNITTWERK uses the following infrastructure services:

- **Email**: Resend (transactional emails)
- **Payments**: Stripe (payment processing)
- **Database**: Supabase PostgreSQL
- **Hosting**: Vercel (Next.js deployment)
- **Cron**: Vercel Cron Jobs (background tasks)

---

## Email Integration

### Resend Setup

**1. Create Resend Account**
- Sign up at [resend.com](https://resend.com)
- Verify your domain (e.g., schnittwerk.ch)
- Add DNS records (SPF, DKIM, DMARC)

**2. Get API Key**
```bash
# From Resend Dashboard → API Keys → Create API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**3. Verify Domain**
```bash
# Add these DNS records:
TXT  @  v=spf1 include:_spf.resend.com ~all
TXT  resend._domainkey  [DKIM key from Resend]
TXT  _dmarc  v=DMARC1; p=none; rua=mailto:dmarc@schnittwerk.ch
```

### Email Templates

SCHNITTWERK includes 3 pre-built email templates:

**1. Booking Confirmation**
```typescript
await sendBookingConfirmation({
  to: 'customer@example.com',
  customerName: 'Max Muster',
  salonName: 'SCHNITTWERK Zurich',
  serviceName: 'Herrenschnitt',
  dateTime: 'Montag, 15. März 2024 um 10:00 Uhr',
  staffName: 'Anna Meier',
  totalPrice: 65,
  confirmationUrl: 'https://schnittwerk.ch/termin/abc123',
})
```

**2. Appointment Reminder**
```typescript
await sendAppointmentReminder({
  to: 'customer@example.com',
  customerName: 'Max Muster',
  salonName: 'SCHNITTWERK Zurich',
  serviceName: 'Herrenschnitt',
  dateTime: 'Morgen, 15. März 2024 um 10:00 Uhr',
  salonAddress: 'Bahnhofstrasse 1, 8001 Zürich',
})
```

**3. Order Confirmation**
```typescript
await sendOrderConfirmation({
  to: 'customer@example.com',
  customerName: 'Max Muster',
  orderNumber: 'ORD-2024-001',
  items: [
    { name: 'Shampoo', quantity: 2, price: 25 },
    { name: 'Conditioner', quantity: 1, price: 18 },
  ],
  totalAmount: 68,
  shippingAddress: 'Bahnhofstrasse 1\n8001 Zürich',
})
```

### Email Provider Abstraction

The email service is abstracted to support multiple providers:

```typescript
// lib/email.ts
interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<{...}>
}

// Providers:
- ResendProvider  (production)
- ConsoleProvider (development)
```

Switch providers by setting `RESEND_API_KEY`.

### Email Logging

All emails are logged to `notification_logs` table:

```sql
SELECT * FROM notification_logs
WHERE type = 'email'
ORDER BY created_at DESC;
```

Columns:
- `status`: 'sent', 'failed', 'bounced'
- `provider_id`: Resend message ID
- `error_message`: Failure reason (if any)

### Retry Logic

Emails are automatically retried on failure:

```typescript
await sendEmail(options, retries = 3)

// Retry backoff: 2s, 4s, 8s
```

---

## Stripe Webhooks

### Stripe Setup

**1. Create Stripe Account**
- Sign up at [stripe.com](https://stripe.com)
- Complete business verification
- Enable payment methods (Card, TWINT, etc.)

**2. Get API Keys**
```bash
# Test Mode
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Live Mode (production)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

**3. Setup Webhook Endpoint**

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

```
URL: https://schnittwerk.ch/api/webhooks/stripe
Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - charge.refunded
  - checkout.session.completed
```

**4. Get Webhook Secret**
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Webhook Events Handled

**payment_intent.succeeded**
- Updates payment status to 'captured'
- Updates order status to 'paid'
- Sends order confirmation email
- Logs transaction

**payment_intent.payment_failed**
- Updates payment status to 'failed'
- Updates order status to 'payment_pending'
- Logs error

**charge.refunded**
- Updates payment status to 'refunded'
- Updates order status based on amount:
  - Full refund: 'refunded'
  - Partial refund: 'partially_refunded'
- Logs refund amount

**checkout.session.completed**
- Confirms checkout completion
- (Most processing happens in payment_intent.succeeded)

### Idempotency

Webhooks are deduplicated using the `stripe_events` table:

```sql
-- Check if event already processed
SELECT * FROM stripe_events WHERE event_id = 'evt_xxx';
```

Prevents duplicate processing if Stripe retries webhook delivery.

### Testing Webhooks Locally

**1. Install Stripe CLI**
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

**2. Forward Webhooks**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**3. Trigger Test Events**
```bash
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
```

### Webhook Security

**Signature Verification**
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  STRIPE_WEBHOOK_SECRET
)
```

Ensures webhook is from Stripe and hasn't been tampered with.

**Event Idempotency**
```typescript
const isDuplicate = await checkEventProcessed(event.id)
if (isDuplicate) return // Skip
```

Prevents duplicate processing.

---

## Cron Jobs

SCHNITTWERK uses Vercel Cron Jobs for background tasks.

### Job 1: Cleanup Expired Reservations

**Schedule**: Every 5 minutes (`*/5 * * * *`)

**Purpose**: Release expired temporary reservations

**Endpoint**: `/api/cron/cleanup-reservations`

**Logic**:
1. Find reservations where `expires_at < NOW()` and `released_at IS NULL`
2. Update `released_at = NOW()` and `released_reason = 'expired'`
3. Log count of released reservations

**Example Output**:
```json
{
  "success": true,
  "message": "Released 15 expired reservations",
  "count": 15
}
```

### Job 2: Send Appointment Reminders

**Schedule**: Every hour (`0 * * * *`)

**Purpose**: Send reminder emails 24 hours before appointments

**Endpoint**: `/api/cron/send-reminders`

**Logic**:
1. Find appointments starting in 23-25 hours
2. Filter by `status = 'confirmed'` and `reminder_sent_at IS NULL`
3. Check salon settings: `send_reminders = true`
4. Send reminder email to each customer
5. Update `reminder_sent_at = NOW()`

**Example Output**:
```json
{
  "success": true,
  "message": "Sent 42 reminders, 2 failed",
  "total": 44,
  "sent": 42,
  "failed": 2
}
```

### Cron Job Security

All cron endpoints are protected:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Set `CRON_SECRET` to a random string:
```bash
CRON_SECRET=$(openssl rand -base64 32)
```

### Cron Job Monitoring

All job runs are logged to `cron_job_runs` table:

```sql
SELECT
  job_name,
  started_at,
  completed_at,
  status,
  records_processed,
  error_message
FROM cron_job_runs
ORDER BY started_at DESC
LIMIT 50;
```

Monitor for:
- ❌ `status = 'failed'` (investigate error_message)
- ⏰ Long-running jobs (`completed_at - started_at > 5 minutes`)
- 📊 Records processed trends

### Vercel Cron Configuration

Cron jobs are defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-reservations",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Vercel automatically invokes these endpoints on schedule.

---

## Environment Variables

### Required Variables

**Supabase**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Stripe**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx  # or pk_live_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx                    # or sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Email (Resend)**
```bash
RESEND_API_KEY=re_xxxxx
```

**Cron Jobs**
```bash
CRON_SECRET=your-random-secret-here
```

### Optional Variables

**Error Tracking (Sentry)**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**App Configuration**
```bash
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_URL=https://schnittwerk.ch
NODE_ENV=production
```

### Environment Files

**Development**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
RESEND_API_KEY=re_xxx
CRON_SECRET=test-secret
```

**Production (Vercel)**

Set via Vercel Dashboard → Settings → Environment Variables

Or via Vercel CLI:
```bash
vercel env add RESEND_API_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add CRON_SECRET production
```

---

## Deployment

### Vercel Deployment

**1. Connect Repository**
```bash
vercel login
vercel link
```

**2. Configure Environment**
```bash
# Add production env vars
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add RESEND_API_KEY production
# ... etc
```

**3. Deploy**
```bash
vercel --prod
```

### Database Migrations

**Before deploying**:
```bash
# Run migrations on Supabase production
npx supabase db push --project-ref your-project-ref
```

Or use Supabase Dashboard → SQL Editor

### Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] Stripe webhook endpoint configured
- [ ] DNS records for email (SPF, DKIM, DMARC)
- [ ] Cron secret configured
- [ ] Test Stripe webhooks with live keys
- [ ] Test email sending with live API key
- [ ] Verify cron jobs are running
- [ ] Check health endpoint: `/api/health`
- [ ] Monitor error logs for 24 hours

---

## Monitoring

### Health Checks

**Endpoint**: `/api/health`

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "pass", "responseTime": 45 },
    "api": { "status": "pass" }
  },
  "timestamp": "2024-03-15T10:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

Add to uptime monitoring service (Uptime Robot, Pingdom, etc.)

### Metrics to Monitor

**Application**
- Health check status (200 = healthy, 503 = degraded)
- API response times (target: < 500ms p95)
- Error rate (target: < 0.1%)

**Database**
- Query performance (slow queries > 1s)
- Connection pool usage
- Table sizes (growth trends)

**Email**
- Delivery rate (target: > 99%)
- Bounce rate (target: < 2%)
- Failed sends (investigate errors)

**Cron Jobs**
- Job completion rate (target: 100%)
- Records processed (trend analysis)
- Failed jobs (alert immediately)

**Stripe**
- Webhook delivery failures
- Payment success rate (target: > 98%)
- Refund rate

### Logging

**Structured Logs**
```typescript
logger.info('Payment processed', {
  orderId: 'xxx',
  amount: 65,
  currency: 'CHF',
})
```

**Log Levels**
- `debug`: Detailed debugging info
- `info`: General information
- `warn`: Warning messages
- `error`: Errors (with stack traces)

**Log Aggregation**

Use Vercel Logs or integrate with:
- Datadog
- Logtail
- Better Stack

### Alerts

Set up alerts for:
- 🔴 Cron job failures
- 🔴 Webhook processing errors
- 🟡 Email delivery failures > 5% in 1 hour
- 🟡 Database response time > 500ms
- 🟡 Error rate > 1% in 5 minutes

---

## Troubleshooting

### Email Not Sending

**1. Check API Key**
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**2. Check Domain Verification**
- Resend Dashboard → Domains
- Ensure status is "Verified"

**3. Check Logs**
```sql
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**4. Check Rate Limits**
- Resend free tier: 100 emails/day
- Upgrade to Pro for higher limits

### Stripe Webhook Not Working

**1. Verify Webhook Secret**
```bash
# Should match Stripe Dashboard
echo $STRIPE_WEBHOOK_SECRET
```

**2. Check Webhook Logs**
- Stripe Dashboard → Developers → Webhooks → [Your endpoint]
- Check response codes (200 = success, 400/500 = error)

**3. Test Locally**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

**4. Check Idempotency**
```sql
SELECT * FROM stripe_events
WHERE event_id = 'evt_xxx';
```

### Cron Job Not Running

**1. Check Vercel Deployment**
```bash
vercel logs --prod
```

**2. Verify Cron Configuration**
```bash
cat vercel.json
# Should contain "crons": [...]
```

**3. Check Authorization**
```bash
# Manually trigger endpoint
curl https://schnittwerk.ch/api/cron/cleanup-reservations \
  -H "Authorization: Bearer $CRON_SECRET"
```

**4. Check Logs**
```sql
SELECT * FROM cron_job_runs
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### Database Connection Errors

**1. Check Supabase Status**
- status.supabase.com

**2. Verify Environment Variables**
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**3. Test Connection**
```bash
npx supabase db ping --project-ref your-ref
```

**4. Check RLS Policies**
```sql
-- Ensure user has access
SELECT * FROM appointments WHERE salon_id = 'xxx';
```

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to git
- ✅ Use Vercel Environment Variables (encrypted at rest)
- ✅ Rotate secrets periodically (quarterly)

### 2. Webhook Security
- ✅ Always verify Stripe signatures
- ✅ Use HTTPS for webhook endpoints
- ✅ Implement idempotency checks

### 3. Cron Job Security
- ✅ Protect endpoints with CRON_SECRET
- ✅ Use strong random secrets (32+ characters)
- ✅ Limit execution time (timeout after 10 minutes)

### 4. Email Security
- ✅ Validate recipient email addresses
- ✅ Implement rate limiting (prevent spam)
- ✅ Log all email sends (audit trail)

### 5. Database Security
- ✅ Use Row Level Security (RLS)
- ✅ Scope all queries by salon_id
- ✅ Use service role key only in server actions

---

## Performance Optimization

### Email Performance
- Use async sending (don't block requests)
- Batch emails where possible
- Cache email templates

### Webhook Performance
- Process asynchronously
- Return 200 immediately
- Queue heavy operations

### Cron Job Performance
- Batch database operations
- Use indexes for queries
- Limit records processed per run (pagination)

---

## Backup & Recovery

### Database Backups

Supabase automatically backs up:
- Daily backups (retained 7 days)
- Point-in-time recovery (last 24 hours)

Manual backup:
```bash
npx supabase db dump -f backup.sql
```

### Email Logs

Retained in `notification_logs` for 90 days.

Archive old logs:
```sql
-- Export to CSV
COPY (
  SELECT * FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
) TO '/tmp/email_logs_archive.csv' CSV HEADER;
```

### Stripe Data

Stripe retains all data indefinitely.

Export via Dashboard → Reports → Export.

---

**Last Updated**: 2025-01-22
**Maintained By**: Development Team
