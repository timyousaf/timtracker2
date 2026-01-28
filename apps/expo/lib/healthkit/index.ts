/**
 * HealthKit integration for TimTracker.
 * 
 * This module provides:
 * - Type mappings from HealthKit to our canonical database schema
 * - Unit conversions
 * - Sync logic for incremental updates
 */

export * from './types';
export * from './quantityMapping';
export * from './categoryMapping';
export * from './workoutMapping';
export * from './unitConversions';
export * from './aggregation';
export * from './anchorStorage';
export * from './sync';
