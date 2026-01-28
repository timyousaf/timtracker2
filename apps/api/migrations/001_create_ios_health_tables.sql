-- Migration: Create ios_* tables for HealthKit direct ingestion
-- Date: 2026-01-27
-- PRD: docs/PRDs/0004-ios-healthkit-direct-ingest.md

-- ios_apple_health_metrics
-- Stores daily aggregated health metrics from HealthKit
-- One row per (date, type) - aggregated on-device before upload
CREATE TABLE IF NOT EXISTS ios_apple_health_metrics (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    date TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    value DOUBLE PRECISION,
    unit TEXT,
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_ios_metrics_date_type 
    ON ios_apple_health_metrics(date, type);

CREATE INDEX IF NOT EXISTS idx_ios_metrics_type_date 
    ON ios_apple_health_metrics(type, date DESC);

-- ios_apple_health_workouts
-- Stores individual workout sessions from HealthKit
CREATE TABLE IF NOT EXISTS ios_apple_health_workouts (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    type TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    timezone TEXT,
    metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_ios_workouts_start 
    ON ios_apple_health_workouts(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_ios_workouts_type_start 
    ON ios_apple_health_workouts(type, start_time DESC);

-- ios_apple_health_sleep
-- Stores sleep segment data from HealthKit (category samples)
CREATE TABLE IF NOT EXISTS ios_apple_health_sleep (
    id SERIAL PRIMARY KEY,
    healthkit_uuid TEXT NOT NULL UNIQUE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    source TEXT,
    qty DOUBLE PRECISION,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_ios_sleep_end 
    ON ios_apple_health_sleep(end_time DESC);

CREATE INDEX IF NOT EXISTS idx_ios_sleep_start_end 
    ON ios_apple_health_sleep(start_time, end_time);
