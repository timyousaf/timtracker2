# TimTracker2

A personal health tracking application with web and iOS apps, sharing the same API and authentication.

## Quick Start

```bash
# Install dependencies
npm install

# Start both API and Expo dev servers
npm run dev

# Or run separately:
npm run dev:api   # API on http://localhost:3001
npm run dev:expo  # Expo on http://localhost:8081
```

## Project Structure

```
timtracker2/
├── apps/
│   ├── api/              # Next.js 14 API server
│   │   ├── app/api/      # API routes
│   │   ├── lib/db.ts     # Database connection
│   │   └── middleware.ts # Auth middleware
│   └── expo/             # Expo app (web + iOS)
│       ├── app/          # Expo Router screens
│       ├── components/   # React Native components
│       └── lib/          # API client, utilities
├── packages/
│   └── shared/           # Shared TypeScript types
├── scripts/              # Migration & utility scripts (Python)
└── docs/                 # Documentation
```

## Environment Variables

### API (apps/api/.env.local)

```
CLERK_SECRET_KEY=sk_...
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Expo (apps/expo/.env)

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=http://localhost:3001  # Only for local dev
```

Get credentials from [Clerk Dashboard](https://dashboard.clerk.com) and [Neon Console](https://console.neon.tech).

## Deployment

### Web (Vercel)

Two Vercel projects from this repo:
1. **API**: Root directory `apps/api` → deploys to `timtracker-api.vercel.app`
2. **Web**: Root directory `apps/expo` → deploys to your main domain

### iOS (TestFlight)

```bash
cd apps/expo
eas build --profile production --platform ios
eas submit --platform ios
```

## Data Migration

To migrate data from the old timtracker (GCP Cloud SQL) to this project (Neon):

```bash
cd scripts
poetry install
poetry run python migrate_from_gcp.py
```

See [scripts/README.md](./scripts/README.md) for full details and required environment variables.

## Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** — System design, patterns, and decisions
- **[AI Rules](./.cursorrules)** — Guidelines for AI-assisted development
- **[PRDs](./docs/PRDs/)** — Feature requirements and decision records

## Tech Stack

- **API**: Next.js 14 (App Router) · TypeScript · Clerk · Neon PostgreSQL · Vercel
- **App**: Expo SDK 52 · React Native · Expo Router · Clerk · TestFlight
- **Shared**: TypeScript types
