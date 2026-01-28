import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import type { WeeklySummaryApiResponse, WeeklySummaryDay } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Compute the date range for a single week ending on Saturday
 */
function computeWeekRange(offset: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = (6 - currentDay + 7) % 7;
  
  const upcomingSaturday = new Date(now);
  upcomingSaturday.setDate(now.getDate() + daysUntilSaturday);
  upcomingSaturday.setHours(0, 0, 0, 0);
  
  const endDate = new Date(upcomingSaturday);
  endDate.setDate(endDate.getDate() - (offset * 7));
  
  // Start on Sunday (6 days before Saturday)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  
  return { startDate, endDate };
}

/**
 * Format date for display
 */
function formatDateStr(date: Date, includeYear = false): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {})
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * GET /api/weekly-summary
 * 
 * Fetch weekly summary data for exercise, diet, sleep, and mindfulness.
 * Returns 7 days (Sunday-Saturday) for the specified week.
 * 
 * Query params:
 * - offset: number of weeks to go back (default: 0 = current week)
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
    const offsetStr = searchParams.get('offset') || '0';
    const offset = Math.max(0, parseInt(offsetStr, 10) || 0);

    // Check cache
    const cacheKey = createCacheKey('weekly-summary', { offset });
    const cached = getCached<WeeklySummaryApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const pool = getPool();
    const { startDate, endDate } = computeWeekRange(offset);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Initialize maps for each metric type
    const exerciseByDate = new Map<string, number>();
    const dietScoreByDate = new Map<string, number>();
    const sleepByDate = new Map<string, number>();
    const mindfulByDate = new Map<string, number>();

    // Also track max values for gradient calculation
    let maxExercise = 0;
    let maxMindful = 0;

    // 1. Fetch exercise data (workout durations, excluding walks)
    const exerciseResult = await pool.query<{
      start_time: Date;
      duration_seconds: number;
    }>(
      `SELECT start_time, duration_seconds
       FROM apple_health_workouts
       WHERE start_time >= $1 AND start_time < $2::date + interval '1 day'
         AND type NOT IN ('Walk', 'Outdoor Walk')`,
      [startDateStr, endDateStr]
    );

    const seenWorkouts = new Set<string>();
    for (const row of exerciseResult.rows) {
      const workoutDate = new Date(row.start_time);
      const dateKey = workoutDate.toISOString().split('T')[0];
      
      // Deduplicate by start_time
      const workoutKey = row.start_time.toString();
      if (seenWorkouts.has(workoutKey)) continue;
      seenWorkouts.add(workoutKey);

      const durationMinutes = row.duration_seconds / 60;
      const existing = exerciseByDate.get(dateKey) || 0;
      const newValue = existing + durationMinutes;
      exerciseByDate.set(dateKey, newValue);
      maxExercise = Math.max(maxExercise, newValue);
    }

    // 2. Fetch diet scores
    const dietResult = await pool.query<{
      date: string;
      health_score: number;
    }>(
      `SELECT date::date::text as date, health_score
       FROM daily_meal_scores
       WHERE date >= $1 AND date <= $2 AND health_score IS NOT NULL`,
      [startDateStr, endDateStr]
    );

    for (const row of dietResult.rows) {
      dietScoreByDate.set(row.date, row.health_score);
    }

    // 3. Fetch sleep data - calculate from start_time/end_time like the /api/sleep endpoint
    const sleepResult = await pool.query<{
      date: string;
      start_time: Date;
      end_time: Date;
    }>(
      `SELECT 
         DATE(end_time AT TIME ZONE 'America/New_York')::text as date,
         start_time,
         end_time
       FROM apple_health_sleep
       WHERE DATE(end_time AT TIME ZONE 'America/New_York') >= $1
         AND DATE(end_time AT TIME ZONE 'America/New_York') <= $2`,
      [startDateStr, endDateStr]
    );

    // Group sleep segments by date and merge overlapping ones (same logic as /api/sleep)
    const sleepSegmentsByDate = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const row of sleepResult.rows) {
      const existing = sleepSegmentsByDate.get(row.date) || [];
      existing.push({
        start: new Date(row.start_time),
        end: new Date(row.end_time),
      });
      sleepSegmentsByDate.set(row.date, existing);
    }

    // Calculate total sleep per day, merging overlapping segments
    for (const [date, segments] of sleepSegmentsByDate.entries()) {
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
      sleepByDate.set(date, hours);
    }

    // 4. Fetch mindful minutes
    const mindfulResult = await pool.query<{
      date: string;
      value: number;
    }>(
      `SELECT date::date::text as date, value
       FROM apple_health_metrics
       WHERE type = 'Mindful Minutes (min)'
         AND date >= $1 AND date <= $2`,
      [startDateStr, endDateStr]
    );

    for (const row of mindfulResult.rows) {
      const existing = mindfulByDate.get(row.date) || 0;
      const newValue = existing + row.value;
      mindfulByDate.set(row.date, newValue);
      maxMindful = Math.max(maxMindful, newValue);
    }

    // Build the response with 7 days
    const days: WeeklySummaryDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayOfWeek = day.getDay(); // 0 = Sunday

      days.push({
        date: dateStr,
        dayOfWeek,
        exercise: exerciseByDate.get(dateStr) ?? null,
        dietScore: dietScoreByDate.get(dateStr) ?? null,
        sleepHours: sleepByDate.get(dateStr) ?? null,
        mindfulMinutes: mindfulByDate.get(dateStr) ?? null,
      });
    }

    const response: WeeklySummaryApiResponse = {
      startDateStr: formatDateStr(startDate),
      endDateStr: formatDateStr(endDate, true),
      days,
      maxExercise: maxExercise || 60, // Default to 60 min if no data
      maxMindful: maxMindful || 30,   // Default to 30 min if no data
    };

    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/weekly-summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch weekly summary data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
