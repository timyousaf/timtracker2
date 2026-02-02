/**
 * Aggregation utilities for HealthKit samples.
 * 
 * HealthKit returns raw samples (potentially many per day).
 * We aggregate them to daily values to match our database schema.
 */

import { AggregationMethod } from './types';
import { roundTo } from './unitConversions';

interface Sample {
  startDate: Date | string;
  endDate: Date | string;
  quantity?: number;
  value?: number;
}

interface AggregatedValue {
  date: string; // YYYY-MM-DD
  value: number;
  count: number;
}

/**
 * Get the date string (YYYY-MM-DD) from a date, using local timezone
 */
export function getDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use local timezone components, not UTC (toISOString uses UTC)
  // This ensures 10 PM local time stays on the same day, not shifted to next day
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the start of day in ISO format for a date
 */
export function getStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * Group samples by date
 */
export function groupByDate<T extends Sample>(
  samples: readonly T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  for (const sample of samples) {
    // Use the startDate for grouping
    const dateStr = getDateString(sample.startDate);
    const existing = groups.get(dateStr) || [];
    existing.push(sample);
    groups.set(dateStr, existing);
  }
  
  return groups;
}

/**
 * Aggregate samples for a single day using the specified method
 */
export function aggregateValues(
  values: number[],
  method: AggregationMethod
): number {
  if (values.length === 0) return 0;
  
  switch (method) {
    case 'sum':
      return roundTo(values.reduce((a, b) => a + b, 0), 2);
    case 'avg':
      return roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2);
    case 'min':
      return roundTo(Math.min(...values), 2);
    case 'max':
      return roundTo(Math.max(...values), 2);
    default:
      return roundTo(values[0], 2);
  }
}

/**
 * Aggregate samples to daily values
 */
export function aggregateSamplesToDaily<T extends Sample>(
  samples: readonly T[],
  method: AggregationMethod,
  getValue: (sample: T) => number | undefined
): AggregatedValue[] {
  const grouped = groupByDate(samples);
  const result: AggregatedValue[] = [];
  
  for (const [date, dateSamples] of grouped.entries()) {
    const values = dateSamples
      .map(getValue)
      .filter((v): v is number => v !== undefined && !isNaN(v));
    
    if (values.length > 0) {
      result.push({
        date,
        value: aggregateValues(values, method),
        count: values.length,
      });
    }
  }
  
  // Sort by date ascending
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Special aggregation for heart rate - returns min, max, and avg
 */
export function aggregateHeartRate(
  samples: readonly Sample[]
): { date: string; min: number; max: number; avg: number }[] {
  const grouped = groupByDate(samples);
  const result: { date: string; min: number; max: number; avg: number }[] = [];
  
  for (const [date, dateSamples] of grouped.entries()) {
    const values = dateSamples
      .map((s) => s.quantity ?? s.value)
      .filter((v): v is number => v !== undefined && !isNaN(v));
    
    if (values.length > 0) {
      result.push({
        date,
        min: roundTo(Math.min(...values), 0),
        max: roundTo(Math.max(...values), 0),
        avg: roundTo(values.reduce((a, b) => a + b, 0) / values.length, 0),
      });
    }
  }
  
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Calculate duration in hours between start and end dates
 */
export function calculateDurationHours(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const ms = end.getTime() - start.getTime();
  return roundTo(ms / (1000 * 60 * 60), 2);
}

/**
 * Calculate duration in seconds between start and end dates
 */
export function calculateDurationSeconds(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return Math.round((end.getTime() - start.getTime()) / 1000);
}

/**
 * Calculate duration in minutes between start and end dates
 */
export function calculateDurationMinutes(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return roundTo((end.getTime() - start.getTime()) / (1000 * 60), 2);
}

/**
 * Aggregate mindful sessions to daily minutes
 */
export function aggregateMindfulSessions(
  samples: readonly Sample[]
): AggregatedValue[] {
  const grouped = groupByDate(samples);
  const result: AggregatedValue[] = [];
  
  for (const [date, dateSamples] of grouped.entries()) {
    const totalMinutes = dateSamples.reduce((sum, sample) => {
      return sum + calculateDurationMinutes(sample.startDate, sample.endDate);
    }, 0);
    
    if (totalMinutes > 0) {
      result.push({
        date,
        value: roundTo(totalMinutes, 0),
        count: dateSamples.length,
      });
    }
  }
  
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}
