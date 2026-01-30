/**
 * Shared sleep calculation algorithm.
 * 
 * Used by /api/sleep and /api/weekly-summary to ensure consistent sleep calculations.
 * 
 * Algorithm:
 * 1. Deduplicate segments by (start_time, end_time, value, source)
 * 2. Identify sleep sessions - group segments where gaps are ≤ 2 hours
 * 3. Merge overlapping intervals within each session
 * 4. Filter to main overnight sleep only:
 *    - Sessions ending between 3 AM and 2 PM, OR
 *    - Sessions starting after 8 PM with ≥ 3 hours duration
 * 5. Source priority: Use Oura if available, else Eight Sleep, else other (per night)
 * 6. Date attribution: Based on session end time (wake-up date)
 */

import { Pool } from 'pg';

interface SleepSegment {
  start: Date;
  end: Date;
  source: string;
}

interface SleepSession {
  segments: SleepSegment[];
  endTime: Date;
}

interface MergedInterval {
  start: number;
  end: number;
}

/**
 * Merge overlapping time intervals and return total hours
 */
function mergeIntervalsAndSum(segments: SleepSegment[]): { hours: number; start: Date; end: Date } {
  if (segments.length === 0) {
    return { hours: 0, start: new Date(), end: new Date() };
  }

  const intervals: MergedInterval[] = segments.map(s => ({
    start: s.start.getTime(),
    end: s.end.getTime(),
  }));

  // Sort by start time
  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: MergedInterval[] = [];
  let current = { ...intervals[0] };

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i].start <= current.end) {
      // Overlapping - extend current
      current.end = Math.max(current.end, intervals[i].end);
    } else {
      // Gap - push current and start new
      merged.push(current);
      current = { ...intervals[i] };
    }
  }
  merged.push(current);

  // Sum durations
  const totalMs = merged.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
  const hours = totalMs / (1000 * 60 * 60);

  return {
    hours,
    start: new Date(merged[0].start),
    end: new Date(merged[merged.length - 1].end),
  };
}

/**
 * Group segments into sleep sessions (gaps > 2 hours = new session)
 */
function groupIntoSessions(segments: SleepSegment[]): SleepSession[] {
  if (segments.length === 0) return [];

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start.getTime() - b.start.getTime());

  const GAP_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours in ms
  const sessions: SleepSession[] = [];
  
  let currentSession: SleepSession = {
    segments: [sorted[0]],
    endTime: sorted[0].end,
  };

  for (let i = 1; i < sorted.length; i++) {
    const segment = sorted[i];
    const gap = segment.start.getTime() - currentSession.endTime.getTime();

    if (gap > GAP_THRESHOLD) {
      // New session
      sessions.push(currentSession);
      currentSession = {
        segments: [segment],
        endTime: segment.end,
      };
    } else {
      // Continue session
      currentSession.segments.push(segment);
      if (segment.end > currentSession.endTime) {
        currentSession.endTime = segment.end;
      }
    }
  }
  sessions.push(currentSession);

  return sessions;
}

/**
 * Get source priority (lower = higher priority)
 */
function getSourcePriority(source: string): number {
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('oura')) return 1;
  if (lowerSource.includes('eight') || lowerSource.includes('8sleep')) return 2;
  return 3;
}

/**
 * Calculate daily sleep hours using the sophisticated algorithm.
 * 
 * @param pool - Database pool
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Map of date string to sleep hours
 */
export async function calculateDailySleep(
  pool: Pool,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  // Query all sleep segments, deduplicated by (start_time, end_time, value, source)
  // Only get Core, Deep, REM (actual sleep time)
  // Include data from 1 day before to catch overnight sessions
  const query = `
    SELECT DISTINCT ON (start_time, end_time, value, source)
      start_time,
      end_time,
      source,
      value
    FROM ios_apple_health_sleep
    WHERE value IN ('Core', 'Deep', 'REM')
      AND end_time >= ($1::date - interval '1 day')
      AND start_time <= ($2::date + interval '1 day')
    ORDER BY start_time, end_time, value, source
  `;

  const result = await pool.query<{
    start_time: Date;
    end_time: Date;
    source: string;
    value: string;
  }>(query, [startDate, endDate]);

  if (result.rows.length === 0) {
    return new Map();
  }

  // Convert to segments
  const segments: SleepSegment[] = result.rows.map(row => ({
    start: new Date(row.start_time),
    end: new Date(row.end_time),
    source: row.source,
  }));

  // Group by source first
  const segmentsBySource = new Map<string, SleepSegment[]>();
  for (const segment of segments) {
    const key = segment.source;
    if (!segmentsBySource.has(key)) {
      segmentsBySource.set(key, []);
    }
    segmentsBySource.get(key)!.push(segment);
  }

  // Process each source's sessions
  interface ProcessedSession {
    date: string;
    priority: number;
    hours: number;
  }

  const allSessions: ProcessedSession[] = [];

  for (const [source, sourceSegments] of segmentsBySource) {
    const sessions = groupIntoSessions(sourceSegments);
    
    for (const session of sessions) {
      const { hours, end } = mergeIntervalsAndSum(session.segments);
      
      if (hours < 0.5) continue; // Skip very short sessions
      
      // Get end time in Eastern timezone to determine the date
      const endInEastern = new Date(end.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const endHour = endInEastern.getHours();
      
      // Get start time in Eastern timezone
      const startTime = session.segments[0].start;
      const startInEastern = new Date(startTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const startHour = startInEastern.getHours();
      
      // Check if this is main overnight sleep
      const isMain = (endHour >= 3 && endHour <= 14) || (startHour >= 20 && hours >= 3);
      
      if (!isMain) continue;
      
      // Get the date (YYYY-MM-DD) based on end time in Eastern timezone
      const dateStr = end.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      
      allSessions.push({
        date: dateStr,
        priority: getSourcePriority(source),
        hours,
      });
    }
  }

  // For each date, pick the best source and sum hours
  const dailyBySource = new Map<string, Map<number, number>>(); // date -> (priority -> hours)
  
  for (const session of allSessions) {
    if (!dailyBySource.has(session.date)) {
      dailyBySource.set(session.date, new Map());
    }
    const sourceMap = dailyBySource.get(session.date)!;
    const current = sourceMap.get(session.priority) || 0;
    sourceMap.set(session.priority, current + session.hours);
  }

  // For each date, use only the highest priority source that has data
  const result2 = new Map<string, number>();
  
  for (const [date, sourceMap] of dailyBySource) {
    // Filter to requested date range
    if (date < startDate || date > endDate) continue;
    
    // Find the lowest priority number (highest priority source)
    const priorities = Array.from(sourceMap.keys()).sort((a, b) => a - b);
    if (priorities.length > 0) {
      const bestPriority = priorities[0];
      const hours = sourceMap.get(bestPriority)!;
      result2.set(date, Math.round(hours * 100) / 100);
    }
  }

  return result2;
}
