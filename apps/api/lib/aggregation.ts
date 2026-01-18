/**
 * Data aggregation utilities for chart data
 * Ported from legacy Flask API patterns
 */

export interface DataPoint {
  date: string;
  value: number;
}

export interface DataPointWithAvg extends DataPoint {
  movingAvg: number | null;
}

/**
 * Calculate 7-day centered moving average
 * @param data - Array of data points sorted by date
 * @returns Data points with moving average added
 */
export function calculateMovingAverage(data: DataPoint[]): DataPointWithAvg[] {
  return data.map((point, i) => {
    const start = Math.max(0, i - 3);
    const end = Math.min(data.length, i + 4);
    const window = data.slice(start, end);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    return {
      ...point,
      movingAvg: Math.round(avg * 100) / 100, // Round to 2 decimal places
    };
  });
}

/**
 * Group data points by date and average values for the same date
 */
export function groupByDate(data: DataPoint[]): DataPoint[] {
  const grouped = new Map<string, number[]>();
  
  for (const point of data) {
    const existing = grouped.get(point.date) || [];
    existing.push(point.value);
    grouped.set(point.date, existing);
  }
  
  return Array.from(grouped.entries())
    .map(([date, values]) => ({
      date,
      value: values.reduce((sum, v) => sum + v, 0) / values.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the start of the week (Sunday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get week label in format "M/D - M/D/YYYY"
 */
export function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startMonth = weekStart.getMonth() + 1;
  const startDay = weekStart.getDate();
  const endMonth = weekEnd.getMonth() + 1;
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();
  
  return `${startMonth}/${startDay} - ${endMonth}/${endDay}/${year}`;
}

/**
 * Group data by week and sum values
 */
export function groupByWeek(data: DataPoint[]): DataPoint[] {
  const grouped = new Map<string, number>();
  
  for (const point of data) {
    const date = new Date(point.date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const existing = grouped.get(weekKey) || 0;
    grouped.set(weekKey, existing + point.value);
  }
  
  return Array.from(grouped.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Convert hours to readable format like "7 hr 30 min"
 */
export function hoursToReadable(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/**
 * Fill in missing dates in a range with null values
 * Ensures charts show gaps for days with no data
 */
export function fillDateRange<T extends { date: string }>(
  data: T[],
  startDate: string,
  endDate: string
): (T | { date: string; value: null; movingAvg: null })[] {
  const dataMap = new Map<string, T>();
  for (const point of data) {
    dataMap.set(point.date, point);
  }

  const result: (T | { date: string; value: null; movingAvg: null })[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const existing = dataMap.get(dateStr);
    if (existing) {
      result.push(existing);
    } else {
      result.push({ date: dateStr, value: null, movingAvg: null });
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Generate all week start dates in a range
 */
export function getWeeksInRange(startDate: string, endDate: string): string[] {
  const weeks: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Move to the first Sunday on or before start
  const firstWeekStart = getWeekStart(start);
  const current = new Date(firstWeekStart);

  while (current <= end) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Fill in missing weeks in a range with null/zero values
 */
export function fillWeekRange<T extends { date: string }>(
  data: T[],
  startDate: string,
  endDate: string
): (T | { date: string; value: null })[] {
  const dataMap = new Map<string, T>();
  for (const point of data) {
    dataMap.set(point.date, point);
  }

  const weeks = getWeeksInRange(startDate, endDate);
  return weeks.map(weekDate => {
    const existing = dataMap.get(weekDate);
    if (existing) {
      return existing;
    }
    return { date: weekDate, value: null };
  });
}
