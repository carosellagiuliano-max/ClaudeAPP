/**
 * Security Audit Script
 * Checks for common security issues and vulnerabilities
 *
 * Usage: npx tsx scripts/security-audit.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

interface AuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  issue: string
  recommendation: string
  file?: string
  line?: number
}

const issues: AuditIssue[] = []

function addIssue(issue: AuditIssue) {
  issues.push(issue)
}

/**
 * Check 1: Environment Variables
 */
function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...')

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      addIssue({
        severity: 'high',
        category: 'Environment',
        issue: `Missing required environment variable: ${envVar}`,
        recommendation: 'Set this variable in .env.local or deployment environment',
      })
    }
  }

  // Check for exposed secrets in code
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
    addIssue({
      severity: 'info',
      category: 'Environment',
      issue: 'Using Stripe live keys',
      recommendation: 'Ensure this is intentional for production environment',
    })
  }
}

/**
 * Check 2: Input Validation
 */
async function checkInputValidation() {
  console.log('🔍 Checking input validation...')

  const actionsDir = path.join(process.cwd(), 'features')
  const files = getAllTypeScriptFiles(actionsDir)

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')

    // Check for server actions without 'use server' directive
    if (file.includes('/actions/') && !content.includes("'use server'")) {
      addIssue({
        severity: 'high',
        category: 'Input Validation',
        issue: 'Server action file missing "use server" directive',
        recommendation: 'Add "use server" at the top of the file',
        file,
      })
    }

    // Check for direct database queries without validation
    if (content.includes('.insert(') || content.includes('.update(')) {
      if (!content.includes('zod') && !content.includes('.parse(')) {
        addIssue({
          severity: 'medium',
          category: 'Input Validation',
          issue: 'Database mutation without Zod validation',
          recommendation: 'Add Zod schema validation before database operations',
          file,
        })
      }
    }

    // Check for raw SQL (should use Supabase query builder)
    if (content.includes('.rpc(') && !content.includes('// SECURITY: ')) {
      addIssue({
        severity: 'medium',
        category: 'SQL Injection',
        issue: 'Using .rpc() without security comment',
        recommendation: 'Add security review comment or use query builder',
        file,
      })
    }
  }
}

/**
 * Check 3: Authentication & Authorization
 */
async function checkAuthAndRBAC() {
  console.log('🔍 Checking authentication and authorization...')

  const actionsDir = path.join(process.cwd(), 'features/admin/actions')
  if (fs.existsSync(actionsDir)) {
    const files = getAllTypeScriptFiles(actionsDir)

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')

      // Admin actions should have RBAC checks
      if (!content.includes('requireAdmin') && !content.includes('requireStaff')) {
        addIssue({
          severity: 'critical',
          category: 'Authorization',
          issue: 'Admin action without RBAC check',
          recommendation: 'Add requireAdmin() or requireStaff() at start of function',
          file,
        })
      }
    }
  }

  // Check for public API routes
  const apiDir = path.join(process.cwd(), 'app/api')
  if (fs.existsSync(apiDir)) {
    const routeFiles = getAllTypeScriptFiles(apiDir)

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf-8')

      // API routes should check authentication (except public endpoints)
      if (
        !file.includes('webhook') &&
        !file.includes('health') &&
        !content.includes('auth.getUser')
      ) {
        addIssue({
          severity: 'high',
          category: 'Authentication',
          issue: 'API route without authentication check',
          recommendation: 'Add auth.getUser() check or document as public endpoint',
          file,
        })
      }
    }
  }
}

/**
 * Check 4: Stripe Webhook Security
 */
async function checkStripeWebhooks() {
  console.log('🔍 Checking Stripe webhook security...')

  const webhookFile = path.join(process.cwd(), 'app/api/webhooks/stripe/route.ts')

  if (fs.existsSync(webhookFile)) {
    const content = fs.readFileSync(webhookFile, 'utf-8')

    // Must verify webhook signature
    if (!content.includes('stripe.webhooks.constructEvent')) {
      addIssue({
        severity: 'critical',
        category: 'Webhook Security',
        issue: 'Stripe webhook without signature verification',
        recommendation: 'Use stripe.webhooks.constructEvent() to verify signatures',
        file: webhookFile,
      })
    }

    // Must check idempotency
    if (!content.includes('event_id') && !content.includes('idempotency')) {
      addIssue({
        severity: 'high',
        category: 'Webhook Security',
        issue: 'Webhook without idempotency check',
        recommendation: 'Check event_id to prevent duplicate processing',
        file: webhookFile,
      })
    }
  } else {
    addIssue({
      severity: 'medium',
      category: 'Webhook Security',
      issue: 'Stripe webhook handler not found',
      recommendation: 'Implement webhook handler for payment processing',
    })
  }
}

/**
 * Check 5: CORS and CSP Headers
 */
async function checkSecurityHeaders() {
  console.log('🔍 Checking security headers...')

  const nextConfigFile = path.join(process.cwd(), 'next.config.js')
  const nextConfigFileTs = path.join(process.cwd(), 'next.config.ts')

  let configFile = nextConfigFile
  if (!fs.existsSync(configFile)) {
    configFile = nextConfigFileTs
  }

  if (fs.existsSync(configFile)) {
    const content = fs.readFileSync(configFile, 'utf-8')

    // Check for CSP headers
    if (!content.includes('Content-Security-Policy')) {
      addIssue({
        severity: 'medium',
        category: 'Security Headers',
        issue: 'Missing Content-Security-Policy header',
        recommendation: 'Add CSP headers in next.config.js',
        file: configFile,
      })
    }

    // Check for X-Frame-Options
    if (!content.includes('X-Frame-Options')) {
      addIssue({
        severity: 'low',
        category: 'Security Headers',
        issue: 'Missing X-Frame-Options header',
        recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN',
        file: configFile,
      })
    }
  }
}

/**
 * Check 6: Secrets in Code
 */
async function checkForHardcodedSecrets() {
  console.log('🔍 Checking for hardcoded secrets...')

  const files = getAllTypeScriptFiles(process.cwd())
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /sk_test_[a-zA-Z0-9]{24,}/,
    /whsec_[a-zA-Z0-9]{32,}/,
    /password\s*=\s*["'][^"']+["']/i,
    /api[_-]?key\s*=\s*["'][^"']+["']/i,
  ]

  for (const file of files) {
    // Skip node_modules and .next
    if (file.includes('node_modules') || file.includes('.next')) continue

    const content = fs.readFileSync(file, 'utf-8')

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        addIssue({
          severity: 'critical',
          category: 'Secrets',
          issue: 'Potential hardcoded secret detected',
          recommendation: 'Move to environment variables immediately',
          file,
        })
      }
    }
  }
}

/**
 * Check 7: RLS Policies
 */
async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies...')

  const migrationFiles = fs
    .readdirSync(path.join(process.cwd(), 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))

  let rlsEnabled = false
  let policiesFound = 0

  for (const file of migrationFiles) {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations', file),
      'utf-8'
    )

    if (content.includes('ALTER TABLE') && content.includes('ENABLE ROW LEVEL SECURITY')) {
      rlsEnabled = true
    }

    if (content.includes('CREATE POLICY')) {
      policiesFound++
    }
  }

  if (!rlsEnabled) {
    addIssue({
      severity: 'critical',
      category: 'Database Security',
      issue: 'Row Level Security not enabled on tables',
      recommendation: 'Enable RLS on all tables containing tenant data',
    })
  }

  if (policiesFound < 5) {
    addIssue({
      severity: 'high',
      category: 'Database Security',
      issue: 'Insufficient RLS policies',
      recommendation: 'Create policies for SELECT, INSERT, UPDATE, DELETE operations',
    })
  }
}

/**
 * Helper: Get all TypeScript files recursively
 */
function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...getAllTypeScriptFiles(fullPath))
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Generate Report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('🔒 SECURITY AUDIT REPORT')
  console.log('='.repeat(80) + '\n')

  const bySeverity = {
    critical: issues.filter((i) => i.severity === 'critical'),
    high: issues.filter((i) => i.severity === 'high'),
    medium: issues.filter((i) => i.severity === 'medium'),
    low: issues.filter((i) => i.severity === 'low'),
    info: issues.filter((i) => i.severity === 'info'),
  }

  console.log(`Total Issues: ${issues.length}\n`)
  console.log(`🔴 Critical: ${bySeverity.critical.length}`)
  console.log(`🟠 High: ${bySeverity.high.length}`)
  console.log(`🟡 Medium: ${bySeverity.medium.length}`)
  console.log(`🟢 Low: ${bySeverity.low.length}`)
  console.log(`ℹ️  Info: ${bySeverity.info.length}\n`)

  for (const [severity, severityIssues] of Object.entries(bySeverity)) {
    if (severityIssues.length === 0) continue

    const icon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️',
    }[severity]

    console.log(`\n${icon} ${severity.toUpperCase()} SEVERITY\n`)

    for (const issue of severityIssues) {
      console.log(`  Category: ${issue.category}`)
      console.log(`  Issue: ${issue.issue}`)
      console.log(`  Recommendation: ${issue.recommendation}`)
      if (issue.file) {
        console.log(`  File: ${issue.file}`)
      }
      console.log('')
    }
  }

  console.log('='.repeat(80))

  // Exit with error code if critical or high issues found
  if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
    console.log('\n❌ Security audit FAILED. Please fix critical and high severity issues.')
    process.exit(1)
  } else {
    console.log('\n✅ Security audit PASSED. No critical or high severity issues found.')
    process.exit(0)
  }
}

/**
 * Main Execution
 */
async function main() {
  console.log('🔒 Starting Security Audit...\n')

  checkEnvironmentVariables()
  await checkInputValidation()
  await checkAuthAndRBAC()
  await checkStripeWebhooks()
  await checkSecurityHeaders()
  await checkForHardcodedSecrets()
  await checkRLSPolicies()

  generateReport()
}

main().catch(console.error)
