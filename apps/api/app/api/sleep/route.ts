import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { hoursToReadable, fillDateRange } from '@/lib/aggregation';
import type { SleepApiResponse, SleepDataPoint } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/sleep
 * 
 * Fetch sleep data with daily totals and 7-day moving averages.
 * Replicates legacy Flask /api/sleep endpoint.
 * 
 * The sleep calculation handles overlapping sleep segments and
 * assigns sleep to the day it ends on.
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
    const cacheKey = createCacheKey('sleep', { start: start || '', end: end || '' });
    const cached = getCached<SleepApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query - sum qty for actual sleep stages only
    // Note: apple_health_sleep has no 'date' column, so we derive it from end_time
    // (sleep is typically assigned to the day it ends on)
    // 
    // We filter to only Core, Deep, REM sleep stages (actual sleep time)
    // Excluding: 'In Bed', 'InBed' (total time in bed which contains the other stages)
    //            'Awake' (time awake during the night)
    // The qty column already contains duration in hours for each stage
    const pool = getPool();
    const params: string[] = [];
    let paramIndex = 1;
    
    let query = `
      SELECT 
        DATE(end_time AT TIME ZONE 'America/New_York')::text as date,
        SUM(qty) as total_hours
      FROM apple_health_sleep
      WHERE value IN ('Core', 'Deep', 'REM')
    `;

    if (start) {
      query += ` AND DATE(end_time AT TIME ZONE 'America/New_York') >= $${paramIndex}`;
      params.push(start);
      paramIndex++;
    }

    if (end) {
      query += ` AND DATE(end_time AT TIME ZONE 'America/New_York') <= $${paramIndex}`;
      params.push(end);
      paramIndex++;
    }

    query += ' GROUP BY DATE(end_time AT TIME ZONE \'America/New_York\') ORDER BY date';

    // Execute query
    const result = await pool.query<{
      date: string;
      total_hours: number;
    }>(query, params);

    if (result.rows.length === 0) {
      const response: SleepApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Build daily data directly from the aggregated query results
    const dailyData: Array<{ date: string; hours: number }> = result.rows.map(row => ({
      date: row.date,
      hours: row.total_hours,
    }));

    // Sort by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate 7-day moving average
    const result2: SleepDataPoint[] = dailyData.map((point, i) => {
      const start = Math.max(0, i - 6);
      const window = dailyData.slice(start, i + 1);
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
