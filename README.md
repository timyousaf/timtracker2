# TimTracker2

A time tracking application built with Next.js, TypeScript, and Clerk authentication.

## Project Overview

TimTracker2 is a modern web application for tracking time, built as a monorepo using npm workspaces. The application uses Next.js 14 with the App Router, Clerk for authentication, and is designed to be deployed on Vercel.

## Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: Neon (PostgreSQL)
- **Monorepo**: npm workspaces
- **Deployment**: Vercel

## Project Structure

```
timtracker2/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/                # App Router pages and routes
│       │   ├── api/            # API routes
│       │   │   └── health-metrics/  # Health metrics API
│       │   ├── health-metrics/ # Health metrics page (protected)
│       │   ├── sign-in/        # Clerk sign-in pages
│       │   ├── sign-up/        # Clerk sign-up pages
│       │   ├── layout.tsx      # Root layout with ClerkProvider
│       │   └── page.tsx        # Home page
│       ├── middleware.ts       # Authentication middleware
│       ├── lib/                # Utility libraries
│       │   └── db.ts           # Database connection pool
│       └── package.json
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture
│   ├── .cursorrules            # Cursor AI rules
│   └── PRDs/                   # Product Requirements Documents
├── package.json                # Root workspace config
└── vercel.json                 # Vercel deployment config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Clerk account (for authentication)
- Neon account (for database)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables (see Environment Variables section below)
# Create apps/web/.env.local with your credentials
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

### Clerk Authentication

The following environment variables are required for Clerk authentication:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

### Neon Database

The following environment variable is required for database access:

```
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Get your Neon database URL from your Neon project dashboard.

**On Vercel**: Set these under Project Settings → Environment Variables.

**Locally**: Create `apps/web/.env.local` with the above values.

## Documentation

- [Architecture Documentation](./docs/ARCHITECTURE.md) - System architecture and design decisions
- [Cursor AI Rules](./docs/.cursorrules) - Guidelines for working with Cursor AI
- [Feature PRDs](./docs/PRDs/) - Product Requirements Documents for features

## Contributing

When adding new features:
1. Create a PRD in `docs/PRDs/` documenting the feature, rationale, and decisions
2. Follow the architecture patterns outlined in `docs/ARCHITECTURE.md`
3. Ensure authentication is properly configured in `middleware.ts` for new routes
4. Update relevant documentation
