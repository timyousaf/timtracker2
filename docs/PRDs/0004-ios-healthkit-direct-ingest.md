# PRD: iOS HealthKit Direct Ingestion → Neon (`ios_*` tables)

**Date**: 2026-01-27  
**Author**: Tim Yousaf + Cursor  
**Status**: Draft

## Overview

"Invert" the current Apple Health ingestion pipeline so the **TimTracker iOS app** reads Apple Health data **directly from HealthKit on-device** and writes it to the Neon Postgres database via the existing `apps/api` service.

Phase 1 is **write-only** from the iOS app:
- iOS app writes into **new Neon tables** that mirror existing `apple_health_*` tables but are prefixed with `ios_` (e.g. `ios_apple_health_metrics`).
- The app and charts **continue to read** from the existing tables populated by the current `timtracker` GitHub Action pipeline.

## Problem Statement

Today's pipeline is:

```
Apple Health (iPhone)
    → Health Auto Export (iOS app)
    → Google Drive export
    → hourly GitHub Action (`timtracker`)
    → Neon tables
    → TimTracker iOS app reads Neon
```

This causes:
- **Up to ~1 hour lag** in data freshness
- **Unnecessary dependency** on Health Auto Export + Google Drive
- Extra moving pieces (Drive credentials, export formats, cron schedule)

Now that TimTracker is itself an iOS app, it can read HealthKit directly and push data with much lower latency.

## Goals

- **Full history sync**: fetch the complete HealthKit history for all metrics/workouts/sleep and write to Neon.
- **Incremental updates**: after initial sync, only upload new or changed data — avoid re-uploading everything.
- **Idempotent writes**: re-running sync must not create duplicates in the database.
- **Schema compatibility**: reuse the existing pipeline schema, but write to `ios_*` tables to keep sources distinct.
- **Parity of ingested data**: ingest all health metrics, workouts, and sleep currently sourced from Drive exports.
- **Safe rollout**: Phase 1 does not change any reads or charts; it only starts populating parallel `ios_*` tables.

## Non-Goals (Phase 1)

- Switching charts/API reads to `ios_*` tables.
- Deleting or disabling the existing Drive/GitHub Action pipeline.
- Real-time / background sync (sync triggers on app open or manual pull-to-refresh only).
- Supporting multiple users in the same raw health tables (schema currently appears single-user; Phase 1 keeps parity).
- Android Health Connect ingestion.

## Requirements

### Functional Requirements

1. **HealthKit authorization**
   - The iOS app must request HealthKit read permissions for all required data types (metrics, workouts, sleep).
2. **Read HealthKit data**
   - The app must read all metrics and workout data currently ingested by `timtracker/functions/sql_pipeline.py`.
3. **Full history on first sync**
   - First sync fetches all available HealthKit history (potentially years of data).
4. **Incremental sync thereafter**
   - Use HealthKit anchors to fetch only new/changed samples after initial sync.
5. **Write to Neon**
   - The app must write to Neon via `timtracker2/apps/api` using Clerk auth.
6. **Write to new `ios_*` tables**
   - Mirror existing table schemas exactly (columns + types), but use `ios_` prefix:
     - `ios_apple_health_metrics`
     - `ios_apple_health_workouts`
     - `ios_apple_health_sleep`
   - Add `healthkit_uuid` column to each table for idempotent upserts.
7. **Idempotent ingest**
   - Server uses `INSERT ... ON CONFLICT (healthkit_uuid) DO NOTHING` to reject duplicates.
8. **Phase 1: no read-path changes**
   - Existing analytics endpoints continue querying the original `apple_health_*` tables.

### Non-Functional Requirements

- **Privacy**: raw HealthKit data is sensitive; all uploads must be authenticated and transmitted over HTTPS only.
- **Reliability**: ingestion should tolerate flaky mobile connectivity and retry safely.
- **Performance**: uploading should be batched (e.g., 500 samples per request) to handle large initial syncs.
- **Observability**: basic logging to confirm ingest volume and last-sync time.

## Data Scope (Parity with current pipeline)

The current Drive → Neon pipeline parses and stores:

### 1) Daily health metrics (`apple_health_metrics`)

Current stored schema (from `timtracker/functions/schema.sql`):
- `id` (SERIAL PRIMARY KEY)
- `date` (TIMESTAMPTZ)
- `type` (TEXT)
- `value` (DOUBLE PRECISION)
- `unit` (TEXT)
- `timezone` (TEXT)

New `ios_apple_health_metrics` adds:
- `healthkit_uuid` (TEXT UNIQUE) — the HealthKit sample UUID for idempotency.

Metric "type" strings currently ingested (canonical names from `parse_health_metrics()`):

| Canonical Type String | HealthKit Identifier | Unit Stored | Aggregation |
|-----------------------|---------------------|-------------|-------------|
| `Apple Exercise Time (min)` | `appleExerciseTime` | min | daily sum |
| `Apple Move Time (min)` | `appleMoveTime` | min | daily sum |
| `Body Fat Percentage (%)` | `bodyFatPercentage` | % | daily avg |
| `Body Mass Index (count)` | `bodyMassIndex` | count | daily avg |
| `Carbohydrates (g)` | `dietaryCarbohydrates` | g | daily sum |
| `Dietary Energy (kcal)` | `dietaryEnergyConsumed` | kcal | daily sum |
| `Fiber (g)` | `dietaryFiber` | g | daily sum |
| `Heart Rate [Min] (bpm)` | `heartRate` | bpm | daily min |
| `Heart Rate [Max] (bpm)` | `heartRate` | bpm | daily max |
| `Heart Rate [Avg] (bpm)` | `heartRate` | bpm | daily avg |
| `Heart Rate Variability (ms)` | `heartRateVariabilitySDNN` | ms | daily avg |
| `Lean Body Mass (lb)` | `leanBodyMass` | lb | daily avg |
| `Mindful Minutes (min)` | `mindfulSession` (category) | min | daily sum |
| `Protein (g)` | `dietaryProtein` | g | daily sum |
| `Resting Heart Rate (bpm)` | `restingHeartRate` | bpm | daily avg |
| `Running Speed (mi/hr)` | `runningSpeed` | mi/hr | daily avg |
| `Sleep Analysis [Asleep] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Sleep Analysis [In Bed] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Sleep Analysis [Core] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Sleep Analysis [Deep] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Sleep Analysis [REM] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Sleep Analysis [Awake] (hr)` | `sleepAnalysis` (category) | hr | daily sum |
| `Total Fat (g)` | `dietaryFatTotal` | g | daily sum |
| `VO2 Max (ml/(kg·min))` | `vo2Max` | ml/(kg·min) | daily avg |
| `Waist Circumference (in)` | `waistCircumference` | in | daily avg |
| `Walking + Running Distance (mi)` | `distanceWalkingRunning` | mi | daily sum |
| `Walking Heart Rate Average (bpm)` | `walkingHeartRateAverage` | bpm | daily avg |
| `Weight/Body Mass (lb)` | `bodyMass` | lb | daily avg |

Notes:
- The existing pipeline stores **one row per (date, type)** — a daily aggregate.
- The iOS app must aggregate raw HealthKit samples to daily values **on-device** before upload.
- Unit conversions: HealthKit uses SI by default; convert to imperial where needed (kg→lb, m→mi).

### 2) Workouts (`apple_health_workouts`)

Current stored schema:
- `id` (SERIAL PRIMARY KEY)
- `type` (TEXT)
- `start_time` (TIMESTAMPTZ)
- `end_time` (TIMESTAMPTZ)
- `duration_seconds` (INTEGER)
- `timezone` (TEXT)
- `metrics` (JSONB)

New `ios_apple_health_workouts` adds:
- `healthkit_uuid` (TEXT UNIQUE)

Workout metrics keys currently ingested (stored in `metrics` JSONB):
- `Distance (mi)` — from `HKQuantityTypeIdentifierDistanceWalkingRunning` or workout distance
- `Total Energy (kcal)` — `totalEnergyBurned`
- `Active Energy (kcal)` — `activeEnergyBurned`
- `Avg Heart Rate (bpm)` — workout statistics
- `Max Heart Rate (bpm)` — workout statistics
- `Avg Speed(mi/hr)` — derived or `runningSpeed`
- `Max Speed(mi/hr)` — derived
- `Step Count (count)` — `stepCount` during workout
- `Swimming Strokes Count (count)` — `swimmingStrokeCount`
- `Elevation Ascended (m)` — `flightsClimbed` or elevation data
- `Elevation Descended (m)` — elevation data

Notes:
- Workouts are **not aggregated** — each workout is a separate row.
- The `healthkit_uuid` is the workout's native UUID.
- Extracting workout statistics (avg/max HR) requires querying associated samples or using `HKStatisticsQuery`.

### 3) Sleep segments (`apple_health_sleep`)

Current stored schema:
- `id` (SERIAL PRIMARY KEY)
- `start_time` (TIMESTAMPTZ)
- `end_time` (TIMESTAMPTZ)
- `source` (TEXT)
- `qty` (DOUBLE PRECISION)
- `value` (TEXT)

New `ios_apple_health_sleep` adds:
- `healthkit_uuid` (TEXT UNIQUE)

Notes:
- Sleep in HealthKit is a **category type** (`HKCategoryTypeIdentifier.sleepAnalysis`).
- Values: `inBed`, `asleepUnspecified`, `asleepCore`, `asleepDeep`, `asleepREM`, `awake`.
- Each segment is a separate row (not aggregated).
- The `value` column maps to the sleep stage; `qty` is duration in hours.

## Technical Approach

### Architecture (Phase 1)

```
HealthKit (iOS)
    → TimTracker Expo app (@kingstinct/react-native-healthkit)
    → apps/api ingest endpoints (Clerk auth)
    → Neon `ios_*` tables
```

No changes to existing read endpoints in Phase 1.

### Library Choice: `@kingstinct/react-native-healthkit`

We will use [`@kingstinct/react-native-healthkit`](https://github.com/kingstinct/react-native-healthkit) (v13+):

**Why this library:**
- **TypeScript-first** with 100+ quantity types, 63+ category types, 75+ workout types
- **Expo config plugin** — handles entitlements + Info.plist automatically
- **Anchor-based queries** via `queryQuantitySamplesWithAnchor()` for efficient incremental sync
- **Actively maintained** (latest release Dec 2025)
- **Works with EAS Build** (requires custom dev client, not Expo Go)

**Dependencies:**
- `@kingstinct/react-native-healthkit`
- `react-native-nitro-modules` (peer dependency)

**Expo config (`app.json`):**

```json
{
  "expo": {
    "plugins": [
      ["@kingstinct/react-native-healthkit", {
        "NSHealthShareUsageDescription": "TimTracker syncs your health data to show personalized charts and trends.",
        "NSHealthUpdateUsageDescription": false,
        "background": false
      }]
    ]
  }
}
```

### Incremental Sync Strategy

**Problem:** HealthKit may contain years of data. We need to:
1. Sync full history on first run
2. Only sync new data on subsequent runs
3. Never create duplicates

**Solution: HealthKit Anchors + Server-side Idempotency**

1. **First sync (no anchor stored):**
   - Call `queryQuantitySamplesWithAnchor(type, { limit: 0 })` — returns ALL samples + a `newAnchor`.
   - Aggregate samples to daily values (for metrics).
   - Upload in batches (500 records per request).
   - Store `newAnchor` on device (AsyncStorage keyed by sample type).

2. **Subsequent syncs (anchor exists):**
   - Call `queryQuantitySamplesWithAnchor(type, { anchor: storedAnchor })` — returns only new/changed samples since last sync.
   - Aggregate and upload.
   - Update stored anchor.

3. **Server-side safety net:**
   - Each record includes `healthkit_uuid` (the sample's native UUID).
   - Tables have `UNIQUE (healthkit_uuid)` constraint.
   - Insert uses `ON CONFLICT (healthkit_uuid) DO NOTHING`.
   - Even if anchors get lost or the same data is re-sent, no duplicates are created.

**Sync trigger:**
- Manual "Sync Now" button in Settings.
- Automatic sync on app foreground (optional).
- No background/real-time sync in Phase 1.

### On-Device Aggregation (Metrics Only)

The existing `apple_health_metrics` table stores **one value per day per type**. Raw HealthKit samples can be many-per-day (e.g., heart rate every few seconds).

**Aggregation rules (applied on-device before upload):**

| Metric Category | Aggregation |
|-----------------|-------------|
| Cumulative (steps, distance, calories, exercise time) | Daily SUM |
| Discrete (weight, body fat, waist, BMI, HRV, VO2 max) | Daily AVERAGE |
| Heart rate | Min, Max, Avg as separate type strings |
| Sleep duration | Sum per sleep stage per day |

After aggregation, each metric becomes one row with a **synthetic `healthkit_uuid`** = `{date}_{type}` (since aggregated rows don't correspond to a single sample).

### Server/API: Ingestion Endpoints

Create new authenticated endpoints in `apps/api`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/health-metrics` | POST | Batch insert daily metric aggregates |
| `/api/ingest/health-workouts` | POST | Batch insert workouts |
| `/api/ingest/health-sleep` | POST | Batch insert sleep segments |

**Request format (example for metrics):**

```typescript
POST /api/ingest/health-metrics
Authorization: Bearer <clerk_token>
Content-Type: application/json

{
  "records": [
    {
      "healthkit_uuid": "2026-01-15_Weight/Body Mass (lb)",
      "date": "2026-01-15T00:00:00Z",
      "type": "Weight/Body Mass (lb)",
      "value": 175.2,
      "unit": "lb",
      "timezone": "America/New_York"
    },
    // ... more records
  ]
}
```

**Response format:**

```typescript
{
  "received": 100,
  "inserted": 95,
  "duplicates": 5
}
```

**Server responsibilities:**
- Validate payload (required fields, reasonable value bounds).
- Insert with `ON CONFLICT (healthkit_uuid) DO NOTHING`.
- Return counts for client logging.

### Database: `ios_*` Tables

```sql
-- Clone schema from existing tables, add healthkit_uuid

CREATE TABLE ios_apple_health_metrics (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    date TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    value DOUBLE PRECISION,
    unit TEXT,
    timezone TEXT
);

CREATE TABLE ios_apple_health_workouts (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    type TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    timezone TEXT,
    metrics JSONB
);

CREATE TABLE ios_apple_health_sleep (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    source TEXT,
    qty DOUBLE PRECISION,
    value TEXT
);

-- Indexes for common queries
CREATE INDEX idx_ios_metrics_date_type ON ios_apple_health_metrics(date, type);
CREATE INDEX idx_ios_workouts_start ON ios_apple_health_workouts(start_time);
CREATE INDEX idx_ios_sleep_end ON ios_apple_health_sleep(end_time);
```

## Design Decisions

### Decision 1: Upload via API (not direct Postgres from iOS)

**Context**: iOS apps should not embed raw DB credentials; Neon is not meant to be directly accessed from untrusted clients.  
**Decision**: Upload via authenticated Next.js API routes (Clerk).  
**Trade-offs**: Requires endpoint work and server-side dedupe, but keeps security sane.

### Decision 2: Create parallel `ios_*` tables in Phase 1

**Context**: We want to ship ingestion safely without breaking charts.  
**Decision**: Write to `ios_*` tables first; keep reads unchanged.  
**Trade-offs**: Data duplication for a period, but enables easy diffing/validation.

### Decision 3: Use `@kingstinct/react-native-healthkit`

**Context**: Need HealthKit access from Expo without writing custom Swift.

**Options Considered**:
- **Option A**: `@kingstinct/react-native-healthkit` — TypeScript, Expo config plugin, anchor queries, active maintenance.
- **Option B**: `react-native-health` — older, requires more manual setup, being rewritten.
- **Option C**: Custom Swift module — full control, but significant effort.

**Decision**: Option A.

**Rationale**: First-class Expo support via config plugin; anchor-based incremental sync built-in; TypeScript throughout; actively maintained.

**Trade-offs**: Adds `react-native-nitro-modules` peer dependency; must use custom dev client (not Expo Go).

### Decision 4: Aggregate metrics on-device, not server-side

**Context**: Existing schema stores one value per (date, type). Raw HealthKit has many samples per day.

**Decision**: Aggregate to daily values on-device before upload.

**Rationale**: Matches existing table semantics; reduces upload volume; simpler server logic.

**Trade-offs**: Loses granularity of raw samples; if we later want raw data, need schema change.

### Decision 5: Use HealthKit anchors + `healthkit_uuid` for idempotency

**Context**: Need to handle full history sync, incremental sync, and retries without duplicates.

**Decision**: 
- Use HealthKit anchors to fetch deltas efficiently.
- Include `healthkit_uuid` in every record.
- Server uses `ON CONFLICT DO NOTHING` as safety net.

**Rationale**: Anchors minimize data transfer; UUIDs guarantee no duplicates even if anchors are lost.

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| **Large initial sync** — years of data could be slow to upload | Batch uploads (500 records/request); show progress UI; allow resuming |
| **Simulator limitations** — HealthKit has limited data in simulator | Test on real device via TestFlight early |
| **Permissions UX** — requesting many HealthKit types at once | Group permissions logically; request on first "Connect" tap |
| **Unit conversion errors** — HealthKit SI vs our imperial units | Explicit conversion functions with unit tests |
| **Aggregation mismatches** — our daily aggregates may differ from Health Auto Export's | Validate by comparing `ios_*` vs `apple_health_*` tables |

## Testing Strategy

- **Unit tests**: Mapping functions, aggregation logic, unit conversions.
- **Integration tests**: API endpoints with sample payloads; verify insert/conflict behavior.
- **Device testing**: Full sync on real iPhone via TestFlight.
- **Validation**: Compare `ios_*` tables vs `apple_health_*` tables for recent 14 days.

## Success Metrics

- **Completeness**: for last 14 days, `ios_*` counts per day/type match or exceed legacy ingestion.
- **Idempotency**: zero duplicate rows in `ios_*` tables after multiple syncs.
- **Performance**: initial sync of 1 year of data completes in < 2 minutes.

## Rollout Plan

- **Phase 1 (this PRD)**: iOS writes `ios_*` tables only; charts still read old tables.
- **Phase 2**: Add server-side feature flag to switch analytic endpoints to `ios_*` tables.
- **Phase 3**: Deprecate Drive/GitHub Action pipeline and remove Health Auto Export dependency.

---

## Implementation Checklist

### Phase 1A: Database Prep (Neon)

- [ ] Create `ios_apple_health_metrics` table with `healthkit_uuid` column
- [ ] Create `ios_apple_health_workouts` table with `healthkit_uuid` column
- [ ] Create `ios_apple_health_sleep` table with `healthkit_uuid` column
- [ ] Add unique constraint on `healthkit_uuid` for each table
- [ ] Add indexes for common query patterns
- [ ] Test insert + `ON CONFLICT DO NOTHING` behavior manually

### Phase 1B: API Ingestion Endpoints (`apps/api`)

- [ ] Create `POST /api/ingest/health-metrics` route
  - [ ] Request validation (Zod schema)
  - [ ] Batch insert with `ON CONFLICT (healthkit_uuid) DO NOTHING`
  - [ ] Return `{ received, inserted, duplicates }` counts
- [ ] Create `POST /api/ingest/health-workouts` route
  - [ ] Request validation
  - [ ] Batch insert with conflict handling
- [ ] Create `POST /api/ingest/health-sleep` route
  - [ ] Request validation
  - [ ] Batch insert with conflict handling
- [ ] Ensure all endpoints are protected by Clerk middleware
- [ ] Add request logging for observability
- [ ] Write integration tests for each endpoint

### Phase 1C: Expo HealthKit Setup (`apps/expo`)

- [ ] Install `@kingstinct/react-native-healthkit` and `react-native-nitro-modules`
- [ ] Add config plugin to `app.json` with usage descriptions
- [ ] Run `npx expo prebuild` to generate native project
- [ ] Create EAS development build (`eas build --profile development --platform ios`)
- [ ] Test that HealthKit authorization prompt appears on device
- [ ] Verify build works in EAS Build (not just local)

### Phase 1D: HealthKit ↔ Canonical Type Mapping (`apps/expo/lib/healthkit/`)

- [ ] Create `types.ts` with TypeScript types for our canonical metric names
- [ ] Create `quantityMapping.ts`: map HealthKit `QuantityTypeIdentifier` → canonical type string
- [ ] Create `categoryMapping.ts`: map HealthKit `CategoryTypeIdentifier` → canonical type string (sleep, mindful)
- [ ] Create `workoutMapping.ts`: map HealthKit `WorkoutActivityType` → our workout type string
- [ ] Create `unitConversions.ts`: kg→lb, m→mi, etc.
- [ ] Write unit tests for all mappings and conversions

### Phase 1E: Sync Implementation (`apps/expo/lib/healthkit/`)

- [ ] Create `anchorStorage.ts`: read/write anchors to AsyncStorage keyed by sample type
- [ ] Create `aggregateMetrics.ts`: aggregate raw samples to daily values (sum/avg/min/max)
- [ ] Create `syncMetrics.ts`:
  - [ ] Query HealthKit with anchor
  - [ ] Aggregate to daily values
  - [ ] Map to canonical types
  - [ ] Upload to API in batches
  - [ ] Store new anchor
- [ ] Create `syncWorkouts.ts`:
  - [ ] Query workouts with anchor
  - [ ] Extract workout statistics (duration, distance, HR)
  - [ ] Map to canonical format
  - [ ] Upload to API in batches
  - [ ] Store new anchor
- [ ] Create `syncSleep.ts`:
  - [ ] Query sleep category samples with anchor
  - [ ] Map sleep stages to our `value` strings
  - [ ] Upload to API in batches
  - [ ] Store new anchor
- [ ] Create `syncAll.ts`: orchestrate all three syncs with error handling
- [ ] Implement retry with exponential backoff for failed uploads
- [ ] Add logging for sync progress and errors

### Phase 1F: Settings UI (`apps/expo/app/(drawer)/settings.tsx`)

- [ ] Add "Health Sync" section
- [ ] Add "Connect to Apple Health" button
  - [ ] Triggers HealthKit authorization request
  - [ ] Shows "Connected" state after auth
- [ ] Add "Sync Now" button
  - [ ] Triggers `syncAll()`
  - [ ] Shows loading spinner during sync
- [ ] Add "Last synced" timestamp display (stored in AsyncStorage)
- [ ] Add sync progress indicator (X of Y records)
- [ ] Add error state display with retry option

### Phase 1G: App Lifecycle Integration

- [ ] Trigger sync on app foreground (when returning from background) — optional, can defer
- [ ] Or: only manual sync via Settings for Phase 1

### Phase 1H: Validation & Testing

- [ ] Deploy to TestFlight
- [ ] Run full sync on real device with multi-year health history
- [ ] Compare `ios_apple_health_metrics` vs `apple_health_metrics` for recent 14 days
- [ ] Compare `ios_apple_health_workouts` vs `apple_health_workouts` for recent 14 days
- [ ] Compare `ios_apple_health_sleep` vs `apple_health_sleep` for recent 14 days
- [ ] Document any discrepancies and root causes
- [ ] Verify zero duplicates after multiple sync runs
- [ ] Measure and log sync performance (time for initial sync)

---

## References

- Legacy ingestion + schema: `git/personal/timtracker/functions/sql_pipeline.py`, `git/personal/timtracker/functions/schema.sql`
- Current read endpoints: `apps/api/app/api/metrics/route.ts`, `apps/api/app/api/weekly-workouts/route.ts`, `apps/api/app/api/sleep/route.ts`
- `timtracker2` architecture: `docs/ARCHITECTURE.md`
- HealthKit library: https://github.com/kingstinct/react-native-healthkit
- HealthKit anchor queries: https://kingstinct.com/react-native-healthkit/

## Changelog

- 2026-01-27: Initial draft
- 2026-01-27: Updated with library choice (`@kingstinct/react-native-healthkit`), incremental sync strategy, HealthKit mapping table, detailed implementation checklist
