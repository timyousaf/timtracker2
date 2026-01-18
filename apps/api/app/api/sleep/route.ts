import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { hoursToReadable } from '@/lib/aggregation';
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

    // Build query - get raw sleep segments
    // Note: apple_health_sleep has no 'date' column, so we derive it from end_time
    // (sleep is typically assigned to the day it ends on)
    const pool = getPool();
    const params: string[] = [];
    let paramIndex = 1;
    
    let query = `
      SELECT 
        DATE(end_time AT TIME ZONE 'America/New_York')::text as date,
        start_time,
        end_time,
        value as sleep_type
      FROM apple_health_sleep
      WHERE 1=1
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

    query += ' ORDER BY end_time';

    // Execute query
    const result = await pool.query<{
      date: string;
      start_time: string;
      end_time: string;
      sleep_type: string;
    }>(query, params);

    if (result.rows.length === 0) {
      const response: SleepApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Process sleep segments into daily totals
    // Group by date and calculate total sleep, handling overlaps
    const sleepByDate = new Map<string, { segments: Array<{ start: Date; end: Date }> }>();

    for (const row of result.rows) {
      const existing = sleepByDate.get(row.date) || { segments: [] };
      existing.segments.push({
        start: new Date(row.start_time),
        end: new Date(row.end_time),
      });
      sleepByDate.set(row.date, existing);
    }

    // Calculate total sleep per day, merging overlapping segments
    const dailyData: Array<{ date: string; hours: number }> = [];

    for (const [date, { segments }] of sleepByDate.entries()) {
      // Sort segments by start time
      segments.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Merge overlapping segments
      const merged: Array<{ start: Date; end: Date }> = [];
      for (const segment of segments) {
        if (merged.length === 0) {
          merged.push({ ...segment });
        } else {
          const last = merged[merged.length - 1];
          if (segment.start <= last.end) {
            // Overlapping - extend the end if needed
            last.end = new Date(Math.max(last.end.getTime(), segment.end.getTime()));
          } else {
            merged.push({ ...segment });
          }
        }
      }

      // Calculate total hours
      const totalMinutes = merged.reduce((sum, seg) => {
        return sum + (seg.end.getTime() - seg.start.getTime()) / 60000;
      }, 0);
      const hours = totalMinutes / 60;

      dailyData.push({ date, hours });
    }

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

    const response: SleepApiResponse = { data: result2 };
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
