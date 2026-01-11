# TimTracker2

A personal health tracking application built with Next.js, Clerk authentication, and Neon (PostgreSQL).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:3000
```

## Environment Variables

Create `apps/web/.env.local` with:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Get credentials from [Clerk Dashboard](https://dashboard.clerk.com) and [Neon Console](https://console.neon.tech).

For Vercel deployment, set these under Project Settings → Environment Variables.

## Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** — System design, patterns, and decisions
- **[AI Rules](./.cursorrules)** — Guidelines for AI-assisted development
- **[PRDs](./docs/PRDs/)** — Feature requirements and decision records

## Project Structure

```
timtracker2/
├── apps/web/          # Next.js 14 app (App Router)
│   ├── app/           # Pages, layouts, API routes
│   ├── lib/           # Utilities (db.ts, etc.)
│   └── middleware.ts  # Auth route protection
├── docs/              # Documentation
└── vercel.json        # Deployment config
```

## Tech Stack

Next.js 14 (App Router) · TypeScript · Clerk · Neon PostgreSQL · Tailwind · Vercel
