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
                      │ fetch() + Clerk token
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API (Vercel)                   │
│  ┌─────────────────────────────────────────────┐   │
│  │  /api/sleep, /api/metrics, /api/workouts    │   │
│  │  /api/exercise-progress, /api/meal-scores   │   │
│  │  /api/log/meal, /api/log/interaction        │   │
│  └─────────────────────┬───────────────────────┘   │
│                        │                            │
│                        ▼                            │
│     Clerk Auth OR GPT_API_KEY → Neon PostgreSQL    │
└─────────────────────────────────────────────────────┘
                      ▲
                      │ fetch() + GPT_API_KEY
┌─────────────────────┴───────────────────────────────┐
│              ChatGPT Custom GPT                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  OpenAPI Actions (gpt/openapi.yaml)         │   │
│  │  System Prompt (gpt/chatgpt.PROMPT)         │   │
│  └─────────────────────────────────────────────┘   │
│              Natural language → API calls           │
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
- **ChatGPT**: Static API key (`GPT_API_KEY` env var) for Custom GPT access
- All API calls include `Authorization: Bearer <token>` header

### ChatGPT Integration

The API supports a Custom GPT in ChatGPT for natural language access to TimTracker data.

**How it works:**
1. A Custom GPT is configured in ChatGPT with the OpenAPI spec from `apps/api/gpt/openapi.yaml`
2. The GPT uses a static bearer token (`GPT_API_KEY`) for authentication
3. The middleware checks for this key before falling back to Clerk auth
4. The GPT can query data, log meals, record interactions, and score daily nutrition

**Key files:**
- `apps/api/gpt/openapi.yaml` — OpenAPI 3.1.0 spec defining all available actions
- `apps/api/gpt/chatgpt.PROMPT` — System prompt with usage instructions for the GPT
- `apps/api/middleware.ts` — Checks `GPT_API_KEY` before Clerk auth
- `apps/api/lib/auth.ts` — Unified auth helper returning `{ type: 'gpt' | 'clerk', userId }`

**GPT endpoints:**
- `GET /api/schema` — Discover tables, columns, and analytic endpoints
- `POST /api/query` — Flexible query for any table
- `POST /api/log/meal` — Log a meal
- `POST /api/log/interaction` — Log social interactions
- `POST /api/daily-meal-scores` — Upsert daily nutrition score
- `GET /api/people` — List people for interaction logging
- Plus all analytic endpoints (sleep, metrics, workouts, etc.)

**Setup:**
1. Generate a secure API key and add as `GPT_API_KEY` in Vercel
2. Create a Custom GPT at chatgpt.com
3. Paste `openapi.yaml` contents in Actions schema
4. Configure authentication as "API Key" with Bearer scheme
5. Paste `chatgpt.PROMPT` contents as the GPT's instructions

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
cd apps/expo && eas build --profile production --platform ios --non-interactive --auto-submit
```

Credentials managed by EAS. Builds submitted directly to TestFlight.

## Security

- All routes protected by Clerk middleware
- Database queries server-side only
- Secrets in Vercel/EAS environment variables
- In-memory caching (5min TTL) to reduce DB load
