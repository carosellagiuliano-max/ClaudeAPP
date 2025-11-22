/**
 * Multi-Tenant Verification Script
 * Audits codebase to ensure proper salon_id scoping
 *
 * Usage: npx tsx scripts/verify-multi-tenant.ts
 */

import * as fs from 'fs'
import * as path from 'path'

interface TenantIssue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  issue: string
  recommendation: string
  file: string
  line?: number
}

const issues: TenantIssue[] = []

// Tables that SHOULD have salon_id
const TENANT_SCOPED_TABLES = [
  'appointments',
  'services',
  'staff',
  'customers',
  'products',
  'orders',
  'cart_items',
  'vouchers',
  'staff_schedules',
  'blocked_times',
  'opening_hours',
  'payments',
  'notification_logs',
  'audit_logs',
  'temporary_reservations',
  'order_items',
  'product_categories',
]

// Tables that should NOT have salon_id (global)
const GLOBAL_TABLES = [
  'salons',
  'profiles',
  'legal_documents',
  'tax_rates',
]

function addIssue(issue: TenantIssue) {
  issues.push(issue)
}

/**
 * Check 1: Scan server actions for unscoped queries
 */
function auditServerActions() {
  console.log('🔍 Auditing server actions...')

  const actionsDir = path.join(process.cwd(), 'features')
  const actionFiles = findFiles(actionsDir, '**/actions/*.ts')

  for (const file of actionFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Check for Supabase queries on tenant-scoped tables
      for (const table of TENANT_SCOPED_TABLES) {
        const fromPattern = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`)

        if (fromPattern.test(line)) {
          // Look ahead for .eq('salon_id', ...) in next 5 lines
          const contextLines = lines.slice(i, i + 6).join('\n')

          if (!contextLines.includes('.eq(\'salon_id\'') &&
              !contextLines.includes('.eq("salon_id"') &&
              !contextLines.includes('.eq(`salon_id`')) {
            addIssue({
              severity: 'critical',
              category: 'Tenant Scoping',
              issue: `Query on '${table}' without salon_id filter`,
              recommendation: `Add .eq('salon_id', salonId) to the query`,
              file,
              line: lineNum,
            })
          }
        }
      }

      // Check for INSERT without salon_id
      if (line.includes('.insert(') && !line.includes('//')) {
        const contextLines = lines.slice(Math.max(0, i - 10), i + 1).join('\n')

        for (const table of TENANT_SCOPED_TABLES) {
          if (contextLines.includes(`from('${table}')`) ||
              contextLines.includes(`from("${table}")`)) {

            // Check if insert payload includes salon_id
            const insertMatch = line.match(/\.insert\((.*?)\)/)
            if (insertMatch && !contextLines.includes('salon_id')) {
              addIssue({
                severity: 'critical',
                category: 'Tenant Scoping',
                issue: `INSERT on '${table}' without salon_id in payload`,
                recommendation: 'Include salon_id in the insert object',
                file,
                line: lineNum,
              })
            }
          }
        }
      }

      // Check for UPDATE without salon_id filter
      if (line.includes('.update(')) {
        for (const table of TENANT_SCOPED_TABLES) {
          const contextLines = lines.slice(Math.max(0, i - 5), i + 5).join('\n')

          if ((contextLines.includes(`from('${table}')`) ||
               contextLines.includes(`from("${table}")`)) &&
              !contextLines.includes('.eq(\'salon_id\'') &&
              !contextLines.includes('.eq("salon_id"')) {
            addIssue({
              severity: 'critical',
              category: 'Tenant Scoping',
              issue: `UPDATE on '${table}' without salon_id filter`,
              recommendation: `Add .eq('salon_id', salonId) before .update()`,
              file,
              line: lineNum,
            })
          }
        }
      }

      // Check for DELETE without salon_id filter
      if (line.includes('.delete(')) {
        for (const table of TENANT_SCOPED_TABLES) {
          const contextLines = lines.slice(Math.max(0, i - 5), i + 5).join('\n')

          if ((contextLines.includes(`from('${table}')`) ||
               contextLines.includes(`from("${table}")`)) &&
              !contextLines.includes('.eq(\'salon_id\'') &&
              !contextLines.includes('.eq("salon_id"')) {
            addIssue({
              severity: 'critical',
              category: 'Tenant Scoping',
              issue: `DELETE on '${table}' without salon_id filter`,
              recommendation: `Add .eq('salon_id', salonId) before .delete()`,
              file,
              line: lineNum,
            })
          }
        }
      }
    }
  }
}

/**
 * Check 2: Verify RBAC checks at function entry
 */
function auditRBACChecks() {
  console.log('🔍 Auditing RBAC checks...')

  const adminActionsDir = path.join(process.cwd(), 'features/admin/actions')
  if (!fs.existsSync(adminActionsDir)) return

  const actionFiles = findFiles(adminActionsDir, '**/*.ts')

  for (const file of actionFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    // Find exported async functions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.includes('export async function') &&
          !line.includes('// INTERNAL')) {

        // Check if requireAdmin or requireStaff is called in next 10 lines
        const contextLines = lines.slice(i, i + 10).join('\n')

        if (!contextLines.includes('requireAdmin') &&
            !contextLines.includes('requireStaff') &&
            !contextLines.includes('requirePermission')) {
          addIssue({
            severity: 'critical',
            category: 'Authorization',
            issue: 'Admin action without RBAC check',
            recommendation: 'Add requireAdmin(salonId) or requireStaff(salonId) at start',
            file,
            line: i + 1,
          })
        }

        // Check if salonId parameter exists
        const funcMatch = line.match(/function\s+\w+\s*\((.*?)\)/)
        if (funcMatch && !funcMatch[1].includes('salonId')) {
          addIssue({
            severity: 'warning',
            category: 'Tenant Scoping',
            issue: 'Function missing salonId parameter',
            recommendation: 'Add salonId as first parameter',
            file,
            line: i + 1,
          })
        }
      }
    }
  }
}

/**
 * Check 3: Verify database schema has salon_id columns
 */
function auditDatabaseSchema() {
  console.log('🔍 Auditing database schema...')

  const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
  if (!fs.existsSync(migrationsDir)) {
    addIssue({
      severity: 'warning',
      category: 'Database Schema',
      issue: 'No migrations directory found',
      recommendation: 'Create supabase/migrations directory',
      file: 'N/A',
    })
    return
  }

  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
  let tablesFound: Set<string> = new Set()
  let tablesWithSalonId: Set<string> = new Set()

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      // Find CREATE TABLE statements
      const createMatch = line.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/)
      if (createMatch) {
        tablesFound.add(createMatch[1])
      }

      // Find salon_id column definitions
      if (line.includes('salon_id')) {
        // Try to find which table this belongs to
        const reversedLines = lines.slice(0, lines.indexOf(line)).reverse()
        for (const prevLine of reversedLines) {
          const tableMatch = prevLine.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/)
          if (tableMatch) {
            tablesWithSalonId.add(tableMatch[1])
            break
          }
        }
      }
    }
  }

  // Check if tenant-scoped tables have salon_id
  for (const table of TENANT_SCOPED_TABLES) {
    if (tablesFound.has(table) && !tablesWithSalonId.has(table)) {
      addIssue({
        severity: 'critical',
        category: 'Database Schema',
        issue: `Table '${table}' missing salon_id column`,
        recommendation: 'Add salon_id UUID NOT NULL REFERENCES salons(id) to table',
        file: 'supabase/migrations',
      })
    }
  }

  // Check if global tables DON'T have salon_id (they shouldn't)
  for (const table of GLOBAL_TABLES) {
    if (tablesWithSalonId.has(table)) {
      addIssue({
        severity: 'warning',
        category: 'Database Schema',
        issue: `Global table '${table}' has salon_id column (should be global)`,
        recommendation: 'Remove salon_id if this table should be shared across salons',
        file: 'supabase/migrations',
      })
    }
  }
}

/**
 * Check 4: Verify RLS policies enforce salon_id
 */
function auditRLSPolicies() {
  console.log('🔍 Auditing RLS policies...')

  const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
  if (!fs.existsSync(migrationsDir)) return

  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
  const policiesPerTable: Map<string, number> = new Map()

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    const policyMatches = content.matchAll(/CREATE POLICY.*?ON (\w+)/g)

    for (const match of policyMatches) {
      const table = match[1]
      policiesPerTable.set(table, (policiesPerTable.get(table) || 0) + 1)
    }
  }

  // Each tenant-scoped table should have at least SELECT, INSERT, UPDATE, DELETE policies
  for (const table of TENANT_SCOPED_TABLES) {
    const policyCount = policiesPerTable.get(table) || 0

    if (policyCount === 0) {
      addIssue({
        severity: 'critical',
        category: 'RLS Policies',
        issue: `Table '${table}' has no RLS policies`,
        recommendation: 'Create policies for SELECT, INSERT, UPDATE, DELETE',
        file: 'supabase/migrations',
      })
    } else if (policyCount < 4) {
      addIssue({
        severity: 'warning',
        category: 'RLS Policies',
        issue: `Table '${table}' has ${policyCount} policies (expected 4+)`,
        recommendation: 'Ensure SELECT, INSERT, UPDATE, DELETE policies exist',
        file: 'supabase/migrations',
      })
    }
  }
}

/**
 * Check 5: Cross-salon data access tests
 */
function auditTestCoverage() {
  console.log('🔍 Auditing test coverage for multi-tenancy...')

  const testFiles = findFiles(process.cwd(), 'tests/**/*.test.ts')
  const e2eFiles = findFiles(process.cwd(), 'e2e/**/*.spec.ts')

  let hasMultiTenantTests = false

  for (const file of [...testFiles, ...e2eFiles]) {
    const content = fs.readFileSync(file, 'utf-8')

    if (content.includes('salon_id') ||
        content.includes('cross-salon') ||
        content.includes('multi-tenant')) {
      hasMultiTenantTests = true
      break
    }
  }

  if (!hasMultiTenantTests) {
    addIssue({
      severity: 'warning',
      category: 'Testing',
      issue: 'No multi-tenancy tests found',
      recommendation: 'Add tests that verify salon_id scoping and prevent cross-salon access',
      file: 'tests/',
    })
  }
}

/**
 * Helper: Find files matching pattern
 */
function findFiles(dir: string, pattern: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findFiles(fullPath, pattern))
      }
    } else {
      // Simple pattern matching
      if (pattern.includes('**/')) {
        const ext = pattern.split('/').pop()
        if (entry.name.endsWith(ext!.replace('*', ''))) {
          files.push(fullPath)
        }
      } else if (entry.name.match(pattern)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Generate Report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('🏢 MULTI-TENANT VERIFICATION REPORT')
  console.log('='.repeat(80) + '\n')

  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  }

  console.log(`Total Issues: ${issues.length}\n`)
  console.log(`🔴 Critical: ${bySeverity.critical.length}`)
  console.log(`🟡 Warning: ${bySeverity.warning.length}`)
  console.log(`ℹ️  Info: ${bySeverity.info.length}\n`)

  for (const [severity, severityIssues] of Object.entries(bySeverity)) {
    if (severityIssues.length === 0) continue

    const icon = {
      critical: '🔴',
      warning: '🟡',
      info: 'ℹ️',
    }[severity]

    console.log(`\n${icon} ${severity.toUpperCase()} SEVERITY\n`)

    for (const issue of severityIssues) {
      console.log(`  Category: ${issue.category}`)
      console.log(`  Issue: ${issue.issue}`)
      console.log(`  Recommendation: ${issue.recommendation}`)
      console.log(`  File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`)
      console.log('')
    }
  }

  console.log('='.repeat(80))

  // Summary
  if (bySeverity.critical.length === 0) {
    console.log('\n✅ Multi-tenant verification PASSED')
    console.log('   No critical issues found. Safe for multi-salon deployment.')
    process.exit(0)
  } else {
    console.log('\n❌ Multi-tenant verification FAILED')
    console.log(`   ${bySeverity.critical.length} critical issue(s) must be fixed before multi-salon deployment.`)
    console.log('   Data leakage between salons is possible!')
    process.exit(1)
  }
}

/**
 * Main Execution
 */
async function main() {
  console.log('🏢 Starting Multi-Tenant Verification...\n')

  auditDatabaseSchema()
  auditRLSPolicies()
  auditServerActions()
  auditRBACChecks()
  auditTestCoverage()

  generateReport()
}

main().catch(console.error)
