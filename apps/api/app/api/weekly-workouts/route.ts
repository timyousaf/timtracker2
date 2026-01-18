import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { getWeekStart, getWeekLabel } from '@/lib/aggregation';
import type { WeeklyWorkoutsApiResponse, WorkoutSeries } from '@timtracker/ui/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/weekly-workouts
 * 
 * Fetch weekly workout aggregation by type with max heart rate.
 * Excludes "Outdoor Walk" from the data.
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
    const cacheKey = createCacheKey('weekly-workouts', { start: start || '', end: end || '' });
    const cached = getCached<WeeklyWorkoutsApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query
    const pool = getPool();
    const params: string[] = [];
    let paramIndex = 1;
    
    let query = `
      SELECT type, start_time, duration_seconds, metrics
      FROM apple_health_workouts
      WHERE start_time IS NOT NULL
        AND type != 'Outdoor Walk'
    `;

    if (start) {
      query += ` AND start_time >= $${paramIndex}`;
      params.push(start);
      paramIndex++;
    }

    if (end) {
      query += ` AND start_time <= $${paramIndex}`;
      params.push(end);
      paramIndex++;
    }

    query += ' ORDER BY start_time';

    // Execute query
    const result = await pool.query<{
      type: string;
      start_time: Date;
      duration_seconds: number;
      metrics: string | Record<string, any>;
    }>(query, params);

    if (result.rows.length === 0) {
      const response: WeeklyWorkoutsApiResponse = { 
        categories: [], 
        series: [], 
        maxHeartRate: [] 
      };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Group by week and workout type
    const weekData = new Map<string, {
      workoutMinutes: Map<string, number>;
      maxHR: number | null;
    }>();
    const workoutTypes = new Set<string>();

    for (const row of result.rows) {
      const weekStart = getWeekStart(new Date(row.start_time));
      const weekKey = weekStart.toISOString().split('T')[0];
      const minutes = row.duration_seconds / 60;

      workoutTypes.add(row.type);

      // Initialize week data if needed
      if (!weekData.has(weekKey)) {
        weekData.set(weekKey, {
          workoutMinutes: new Map(),
          maxHR: null,
        });
      }

      const week = weekData.get(weekKey)!;

      // Add minutes for this workout type
      const existingMinutes = week.workoutMinutes.get(row.type) || 0;
      week.workoutMinutes.set(row.type, existingMinutes + minutes);

      // Extract max heart rate
      let metrics: Record<string, any> = {};
      if (typeof row.metrics === 'string') {
        try {
          metrics = JSON.parse(row.metrics);
        } catch { /* ignore */ }
      } else if (row.metrics) {
        metrics = row.metrics;
      }

      const maxHR = metrics['Max Heart Rate (bpm)']?.value;
      if (typeof maxHR === 'number') {
        if (week.maxHR === null || maxHR > week.maxHR) {
          week.maxHR = Math.round(maxHR);
        }
      }
    }

    // Sort weeks and create categories
    const sortedWeeks = Array.from(weekData.keys()).sort();
    
    // Ensure we include up to current week
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
    if (sortedWeeks.length > 0 && currentWeekKey > sortedWeeks[sortedWeeks.length - 1]) {
      sortedWeeks.push(currentWeekKey);
      weekData.set(currentWeekKey, { workoutMinutes: new Map(), maxHR: null });
    }

    const categories = sortedWeeks.map(weekKey => {
      const weekStart = new Date(weekKey);
      return getWeekLabel(weekStart);
    });

    // Build series for each workout type
    const sortedTypes = Array.from(workoutTypes).sort();
    const series: WorkoutSeries[] = sortedTypes.map(type => ({
      name: type,
      data: sortedWeeks.map(weekKey => {
        const week = weekData.get(weekKey);
        return Math.round(week?.workoutMinutes.get(type) || 0);
      }),
      stack: 'total',
    }));

    // Build max heart rate series
    const maxHeartRate = sortedWeeks.map(weekKey => {
      const week = weekData.get(weekKey);
      return week?.maxHR ?? null;
    });

    const response: WeeklyWorkoutsApiResponse = {
      categories,
      series,
      maxHeartRate,
    };

    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/weekly-workouts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch weekly workouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
