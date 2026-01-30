import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { hoursToReadable, fillDateRange } from '@/lib/aggregation';
import { calculateDailySleep } from '@/lib/sleepCalculation';
import type { SleepApiResponse, SleepDataPoint } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/sleep
 * 
 * Fetch sleep data with daily totals and 7-day moving averages.
 * 
 * Uses sophisticated algorithm (via shared sleepCalculation module) to:
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

    // If no date range specified, use a reasonable default (last 90 days)
    const effectiveEnd = end || new Date().toISOString().split('T')[0];
    const effectiveStart = start || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return d.toISOString().split('T')[0];
    })();

    // Use shared sleep calculation
    const sleepData = await calculateDailySleep(pool, effectiveStart, effectiveEnd);

    if (sleepData.size === 0) {
      const response: SleepApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Convert to array and sort by date
    const dailyData = Array.from(sleepData.entries())
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate 7-day moving average
    const result2: SleepDataPoint[] = dailyData.map((point, i) => {
      const startIdx = Math.max(0, i - 6);
      const window = dailyData.slice(startIdx, i + 1);
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
