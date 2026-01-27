# TimTracker2

Personal health tracking with cross-platform charts. Single codebase for web and iOS.

## Quick Start

```bash
npm install
npm run dev        # API (3001) + Expo (8081)
```

## Structure

```
apps/
  api/           → Next.js API (Vercel)
  expo/          → Expo app (web + iOS)
packages/
  ui/            → Shared chart types
  shared/        → Shared utilities
scripts/         → Python migration tools
```

## Environment

**API** (`apps/api/.env.local`):
```
CLERK_SECRET_KEY=sk_...
NEON_DATABASE_URL=postgresql://...
```

**Expo** (`apps/expo/.env`):
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=https://timtracker-api.vercel.app
```

## Deployment

### Vercel (auto-deploys on push to main)

| Project | Root Directory | URL |
|---------|---------------|-----|
| timtracker-api | `apps/api` | timtracker-api.vercel.app |
| timtracker2 | `apps/expo` | timtracker2.vercel.app |

### iOS (TestFlight)

```bash
cd apps/expo && eas build --profile production --platform ios --non-interactive --auto-submit
```

## Charts

Cross-platform ECharts via `@wuba/react-native-echarts`:
- **Sleep** — Stacked bars with quality colors + 7-day moving average
- **Diet** — Calendar heatmap with score-based colors
- **Exercise** — Weekly stacked bars by workout type
- **Strength** — Per-exercise progress (volume bars + max weight line)
- **Health Metrics** — Scatter + moving average (Weight, HRV, RHR, etc.)

## Data Migration

```bash
cd scripts && poetry install
poetry run python migrate_from_gcp.py
```

See [scripts/README.md](./scripts/README.md) for details.

## Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [PRDs](./docs/PRDs/)
