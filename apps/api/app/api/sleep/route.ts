import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { hoursToReadable, fillDateRange } from '@/lib/aggregation';
import type { SleepApiResponse, SleepDataPoint } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Sleep calculation algorithm:
 * 
 * 1. Deduplicate segments by (start_time, end_time, value, source) - there are 
 *    duplicate entries with different healthkit_uuid values
 * 
 * 2. Identify sleep sessions - group segments where gaps are ≤ 2 hours
 * 
 * 3. Merge overlapping intervals within each session to get actual sleep duration
 * 
 * 4. Filter to main overnight sleep only:
 *    - Sessions ending between 3 AM and 2 PM, OR
 *    - Sessions starting after 8 PM with ≥ 3 hours duration
 * 
 * 5. Source priority: Use Oura if available, else Eight Sleep, else other (per night)
 * 
 * 6. Date attribution: Based on session end time (wake-up date)
 */

interface SleepSegment {
  start: Date;
  end: Date;
  source: string;
}

interface SleepSession {
  segments: SleepSegment[];
  source: string;
  startTime: Date;
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
    source: sorted[0].source,
    startTime: sorted[0].start,
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
        source: segment.source,
        startTime: segment.start,
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
 * Check if a session qualifies as main overnight sleep
 * - Ends between 3 AM and 2 PM, OR
 * - Starts after 8 PM and is >= 3 hours
 */
function isMainSleep(session: SleepSession, durationHours: number): boolean {
  const endHour = session.endTime.getUTCHours();
  const startHour = session.startTime.getUTCHours();
  
  // Note: We're working with UTC times, but the data is stored with Eastern timezone
  // The DB query already converts to Eastern, so we'll do the filtering in JS
  // after getting the Eastern-adjusted times
  
  // Ends between 3 AM and 2 PM (in Eastern time)
  if (endHour >= 3 && endHour <= 14) {
    return true;
  }
  
  // Starts after 8 PM and is >= 3 hours
  if (startHour >= 20 && durationHours >= 3) {
    return true;
  }
  
  return false;
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
 * GET /api/sleep
 * 
 * Fetch sleep data with daily totals and 7-day moving averages.
 * 
 * Uses sophisticated algorithm to:
 * - Deduplicate overlapping segments
 * - Identify sleep sessions
 * - Prioritize sources (Oura > Eight Sleep > other)
 * - Filter to main overnight sleep only
 * 
 * Query params:
 * - start: start date (optional, YYYY-MM-DD)
 * - end: end date (optional, YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Check cache
    const cacheKey = createCacheKey('sleep_v2', { start: start || '', end: end || '' });
    const cached = getCached<SleepApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const pool = getPool();

    // Query all sleep segments, deduplicated by (start_time, end_time, value, source)
    // Only get Core, Deep, REM (actual sleep time)
    let query = `
      SELECT DISTINCT ON (start_time, end_time, value, source)
        start_time,
        end_time,
        source,
        value
      FROM ios_apple_health_sleep
      WHERE value IN ('Core', 'Deep', 'REM')
    `;

    const params: string[] = [];
    let paramIndex = 1;

    // Apply date filters with some buffer to catch sessions that start before the range
    if (start) {
      // Include data from 1 day before to catch overnight sessions
      query += ` AND end_time >= ($${paramIndex}::date - interval '1 day')`;
      params.push(start);
      paramIndex++;
    }

    if (end) {
      // Include data up to end of the day
      query += ` AND start_time <= ($${paramIndex}::date + interval '1 day')`;
      params.push(end);
      paramIndex++;
    }

    query += ' ORDER BY start_time, end_time, value, source';

    const result = await pool.query<{
      start_time: Date;
      end_time: Date;
      source: string;
      value: string;
    }>(query, params);

    if (result.rows.length === 0) {
      const response: SleepApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Convert to segments with Eastern timezone handling
    const segments: SleepSegment[] = result.rows.map(row => ({
      start: new Date(row.start_time),
      end: new Date(row.end_time),
      source: row.source,
    }));

    // Group into sessions by source first (so each source's sessions are separate)
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
      date: string; // YYYY-MM-DD in Eastern time
      source: string;
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
        const startInEastern = new Date(session.startTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const startHour = startInEastern.getHours();
        
        // Check if this is main overnight sleep
        const isMain = (endHour >= 3 && endHour <= 14) || (startHour >= 20 && hours >= 3);
        
        if (!isMain) continue;
        
        // Get the date (YYYY-MM-DD) based on end time in Eastern timezone
        const dateStr = end.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        
        allSessions.push({
          date: dateStr,
          source,
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
    const dailyData: Array<{ date: string; hours: number }> = [];
    
    for (const [date, sourceMap] of dailyBySource) {
      // Find the lowest priority number (highest priority source)
      const priorities = Array.from(sourceMap.keys()).sort((a, b) => a - b);
      if (priorities.length > 0) {
        const bestPriority = priorities[0];
        const hours = sourceMap.get(bestPriority)!;
        dailyData.push({ date, hours });
      }
    }

    // Sort by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Filter to requested date range
    const filteredData = dailyData.filter(d => {
      if (start && d.date < start) return false;
      if (end && d.date > end) return false;
      return true;
    });

    // Calculate 7-day moving average
    const result2: SleepDataPoint[] = filteredData.map((point, i) => {
      const startIdx = Math.max(0, i - 6);
      const window = filteredData.slice(startIdx, i + 1);
      const avg = window.reduce((sum, p) => sum + p.hours, 0) / window.length;

      return {
        date: point.date,
        hours: Math.round(point.hours * 100) / 100,
        readable: hoursToReadable(point.hours),
        movingAvg: Math.round(avg * 10) / 10,
      };
    });

    // Fill in missing dates with null values if date range is specified
    let finalData: (SleepDataPoint | { date: string; hours: null; readable: null; movingAvg: null })[] = result2;
    if (start && end) {
      finalData = fillDateRange(result2, start, end).map(d => {
        if ('hours' in d && d.hours !== null) {
          return d as SleepDataPoint;
        }
        return { date: d.date, hours: null, readable: null, movingAvg: null };
      });
    }

    const response: SleepApiResponse = { data: finalData as SleepDataPoint[] };
    setCached(cacheKey, response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/sleep:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch sleep data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
