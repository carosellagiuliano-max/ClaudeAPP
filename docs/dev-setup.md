# Development Setup Guide

Complete guide to setting up your development environment for SCHNITTWERK.

---

## Prerequisites

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   # Check version
   node --version

   # Install via nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **Package Manager**
   - npm (comes with Node.js)
   - Or yarn: `npm install -g yarn`
   - Or pnpm: `npm install -g pnpm`

3. **Supabase CLI**
   ```bash
   npm install -g supabase

   # Verify installation
   supabase --version
   ```

4. **Docker Desktop** (for local Supabase)
   - Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Required to run Supabase locally

5. **Git**
   ```bash
   git --version
   ```

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
  - PostgreSQL (for DB schema exploration)

- **Database GUI** (optional):
  - Supabase Studio (included with CLI)
  - Or TablePlus / DBeaver

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd schnittwerk
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies defined in `package.json`.

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your local configuration:

```env
# Supabase (local development)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (Resend test)
RESEND_API_KEY=re_...

# Monitoring (optional for dev)
SENTRY_DSN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Supabase Locally

```bash
# Initialize Supabase (first time only)
npx supabase init

# Start local Supabase stack (PostgreSQL, Auth, Storage, etc.)
npx supabase start
```

This will:
- Start PostgreSQL on `localhost:54322`
- Start Supabase Studio on `http://localhost:54323`
- Output your local `anon_key` and `service_role_key`

**Important**: Copy the keys from the output to your `.env.local`

### 5. Run Database Migrations

```bash
# Apply all migrations + seed data
npx supabase db reset

# Or apply migrations only (no seed)
npx supabase migration up
```

This creates all tables, RLS policies, and sample data.

### 6. Generate TypeScript Types

```bash
npm run generate:types
```

This generates TypeScript types from your Supabase schema into `lib/db/types.ts`.

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Scripts

### Development
```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

### Database
```bash
npm run db:reset         # Reset local DB (migrations + seed)
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Run seed scripts
npm run generate:types   # Generate TS types from schema
npm run db:studio        # Open Supabase Studio
```

### Testing
```bash
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests with Playwright
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Database Helpers
```bash
npx supabase status      # Check running services
npx supabase stop        # Stop local Supabase
npx supabase db dump     # Export schema
npx supabase db diff     # Show schema changes
```

---

## Database Access

### Supabase Studio
Open [http://localhost:54323](http://localhost:54323)

Features:
- Table editor (GUI for data)
- SQL editor
- Schema visualization
- Auth user management
- Storage browser

### Direct PostgreSQL Connection
```bash
# Connection details
Host: localhost
Port: 54322
Database: postgres
User: postgres
Password: postgres
```

### Using psql
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

---

## Sample Data

After running `npx supabase db reset`, you'll have:

### Salon
- **Name**: SCHNITTWERK by Vanessa Carosella
- **Address**: Rorschacherstrasse 152, 9000 St. Gallen

### Users
| Email | Password | Role |
|-------|----------|------|
| admin@schnittwerk.ch | admin123 | Admin |
| staff@schnittwerk.ch | staff123 | Staff |
| customer@schnittwerk.ch | customer123 | Customer |

### Services
- Haarschnitt Damen (CHF 80, 60min)
- Haarschnitt Herren (CHF 50, 30min)
- Färben + Schnitt (CHF 180, 120min)
- Balayage (CHF 200, 150min)

### Staff
- Vanessa (Admin, all services)
- Maria (Staff, cuts only)

### Products
- Shampoo (CHF 25)
- Conditioner (CHF 25)
- Styling Gel (CHF 18)

---

## Troubleshooting

### Supabase won't start
```bash
# Check Docker is running
docker ps

# Stop all containers and restart
npx supabase stop
docker system prune -a  # WARNING: removes all Docker data
npx supabase start
```

### Port conflicts
If ports 54321/54322/54323 are in use:

Edit `supabase/config.toml`:
```toml
[api]
port = 54321  # Change if needed

[db]
port = 54322  # Change if needed

[studio]
port = 54323  # Change if needed
```

### Migrations fail
```bash
# Reset everything
npx supabase db reset --force

# If still failing, check migration files for syntax errors
```

### TypeScript errors after migration
```bash
# Regenerate types
npm run generate:types

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### "Cannot find module" errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Stripe webhooks in local dev
Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy webhook signing secret to .env.local
# STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## IDE Configuration

### VS Code Settings (`.vscode/settings.json`)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### VS Code Extensions (`.vscode/extensions.json`)
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "supabase.vscode-supabase"
  ]
}
```

---

## Testing Your Setup

Run this checklist to verify everything works:

```bash
# 1. Check Node version
node --version  # Should be 18+

# 2. Check Supabase is running
npx supabase status  # All services should be "healthy"

# 3. Check database connection
npm run db:studio  # Opens Supabase Studio

# 4. Check TypeScript types are generated
ls -la lib/db/types.ts  # File should exist

# 5. Check Next.js starts
npm run dev  # Should open on http://localhost:3000

# 6. Check linting works
npm run lint  # Should show no errors (or fixable warnings)

# 7. Check tests run
npm test  # Should pass (or show "no tests" if not written yet)
```

---

## Next Steps

Once your environment is set up:

1. Read [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md) for system overview
2. Explore [data-model.md](data-model.md) for database schema
3. Check [security-and-rls.md](security-and-rls.md) for security practices
4. Start with Phase 0 tasks (see ARCHITECTURE_PLAN.md)

---

## Getting Help

- **Documentation**: Check `docs/` folder
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Team Support**: Ask in team chat

---

**Happy coding! 🚀**
