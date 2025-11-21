# SCHNITTWERK - Installation Guide

Quick setup guide for local development.

## Prerequisites

- Node.js 18+ installed
- npm 9+ or yarn/pnpm
- Docker Desktop (for Supabase)
- Git

## Step-by-Step Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd schnittwerk
```

### 2. Install Dependencies

```bash
npm install
```

This will install all packages defined in `package.json` including:
- Next.js 14
- React 18
- Supabase Client
- Tailwind CSS
- shadcn/ui components
- Zod for validation
- Date-fns for date handling

### 3. Setup Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Supabase (get from `npx supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Start Supabase

```bash
# Initialize Supabase (first time only)
npx supabase init

# Start Supabase stack
npx supabase start
```

This will output your keys. Copy them to `.env.local`.

### 5. Run Migrations & Seed Data

```bash
# Apply all migrations + seed data
npx supabase db reset

# Or manually:
npm run db:migrate
npm run db:seed
```

### 6. Generate TypeScript Types

```bash
npm run generate:types
```

This creates `lib/db/types.ts` from your database schema.

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Open Supabase Studio (Optional)

```bash
npm run db:studio
```

Open [http://localhost:54323](http://localhost:54323)

## Project Structure

```
schnittwerk/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   └── ui/                 # shadcn/ui components
├── features/               # Domain modules (booking, shop, etc.)
├── lib/
│   ├── utils.ts            # Shared utilities
│   └── db/                 # Database client & types
├── styles/
│   └── globals.css         # Design tokens & global styles
├── supabase/
│   ├── config.toml         # Supabase configuration
│   ├── migrations/         # Database migrations (6 files)
│   └── seed.sql            # Sample data
└── docs/                   # Documentation

```

## Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:reset         # Reset DB (migrations + seed)
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Run seed scripts
npm run db:studio        # Open Supabase Studio
npm run generate:types   # Generate TS types from schema

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier

# Testing (coming in Phase 7)
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests with Playwright
```

## Verify Setup

After installation, check:

1. **Database**: `npm run db:studio` - Should show all tables
2. **Types**: `ls -la lib/db/types.ts` - File should exist
3. **Next.js**: `npm run dev` - Should start without errors
4. **Lint**: `npm run lint` - Should show no errors

## Troubleshooting

### Port conflicts

If ports 54321/54322/54323 are in use, edit `supabase/config.toml`.

### Supabase won't start

```bash
docker ps  # Check Docker is running
npx supabase stop
docker system prune -a  # WARNING: removes all Docker data
npx supabase start
```

### TypeScript errors

```bash
npm run generate:types  # Regenerate types
# Restart TypeScript server in VS Code
```

### Module not found

```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [ARCHITECTURE_PLAN.md](docs/ARCHITECTURE_PLAN.md) for system overview
- Check [dev-setup.md](docs/dev-setup.md) for detailed setup
- Explore database schema in Supabase Studio
- Start building features (Phase 3+)

## Need Help?

- Documentation: `docs/` folder
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
