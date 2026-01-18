# Architecture

## Overview

Monorepo with shared code between web and iOS. API-first design with all data fetched from Next.js API routes.

```
┌─────────────────────────────────────────────────────┐
│                    Expo App                          │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Web Build  │  │  iOS Build   │                 │
│  │   (Vercel)   │  │ (TestFlight) │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         └────────┬────────┘                         │
│                  ▼                                  │
│         Shared Components                           │
│         (ECharts, UI)                              │
└─────────────────────┬───────────────────────────────┘
                      │ fetch()
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API (Vercel)                   │
│  ┌─────────────────────────────────────────────┐   │
│  │  /api/sleep, /api/metrics, /api/workouts    │   │
│  │  /api/exercise-progress, /api/meal-scores   │   │
│  └─────────────────────┬───────────────────────┘   │
│                        │                            │
│                        ▼                            │
│              Clerk Auth + Neon PostgreSQL           │
└─────────────────────────────────────────────────────┘
```

## Key Patterns

### Cross-Platform Charts

Platform-specific ECharts implementations:
- `EChart.web.tsx` — CanvasRenderer for web
- `EChart.native.tsx` — SVGRenderer via `@wuba/react-native-echarts`

Shared chart components (SleepChart, HealthChart, etc.) use the unified `EChart` export.

### API Design

All endpoints:
1. Verify Clerk auth via `auth()`
2. Query Neon PostgreSQL
3. Aggregate/transform data server-side
4. Return JSON with moving averages pre-computed

Date range filling: APIs fill gaps with `null` values so charts show proper x-axis scaling.

### Authentication

- **API**: Clerk middleware + `auth()` in route handlers
- **Expo**: Clerk React Native SDK with `expo-secure-store` for token caching
- All API calls include `Authorization: Bearer <token>` header

### Navigation

Drawer navigation with:
- Hamburger menu → slide-out drawer
- Home (charts dashboard) + Settings
- Time range picker in header

## Database Schema

Key tables:
- `apple_health_metrics` — Daily health values (weight, HRV, etc.)
- `apple_health_sleep` — Sleep segments with start/end times
- `apple_health_workouts` — Workout sessions from Apple Health
- `hevy_workouts` — Strength training from Hevy app
- `meal_logs` / `daily_meal_scores` — Diet tracking

## Deployment

### Vercel (CI/CD)

Both projects linked to same GitHub repo with different root directories:

```
Push to main
    │
    ├──► timtracker-api (apps/api)
    │    └── npm run build:api
    │
    └──► timtracker2 (apps/expo)
         └── npx expo export -p web
```

### EAS Build (iOS)

```bash
eas build --platform ios --profile production --auto-submit
```

Credentials managed by EAS. Builds submitted directly to TestFlight.

## Security

- All routes protected by Clerk middleware
- Database queries server-side only
- Secrets in Vercel/EAS environment variables
- In-memory caching (5min TTL) to reduce DB load
