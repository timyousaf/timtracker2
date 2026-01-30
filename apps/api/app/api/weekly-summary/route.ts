import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { calculateDailySleep } from '@/lib/sleepCalculation';
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
    const workoutsByDate = new Map<string, Array<{ type: string; durationMinutes: number }>>();
    const dietScoreByDate = new Map<string, number>();
    const mealsByDate = new Map<string, string[]>();
    const sleepByDate = new Map<string, number>();
    const mindfulByDate = new Map<string, number>();

    // Also track max values for gradient calculation
    let maxExercise = 0;
    let maxMindful = 0;

    // 1. Fetch exercise data (workout durations and types, excluding walks)
    const exerciseResult = await pool.query<{
      start_time: Date;
      duration_seconds: number;
      type: string;
    }>(
      `SELECT start_time, duration_seconds, type
       FROM ios_apple_health_workouts
       WHERE start_time >= $1 AND start_time < $2::date + interval '1 day'
         AND type NOT IN ('Walking')
       ORDER BY start_time`,
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

      // Track workout details
      const workouts = workoutsByDate.get(dateKey) || [];
      workouts.push({ type: row.type, durationMinutes: Math.round(durationMinutes) });
      workoutsByDate.set(dateKey, workouts);
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

    // 2b. Fetch meal descriptions
    const mealsResult = await pool.query<{
      date: string;
      description: string;
    }>(
      `SELECT date::date::text as date, description
       FROM meal_logs
       WHERE date >= $1 AND date <= $2
       ORDER BY date, created_at`,
      [startDateStr, endDateStr]
    );

    for (const row of mealsResult.rows) {
      const meals = mealsByDate.get(row.date) || [];
      if (row.description) {
        meals.push(row.description);
      }
      mealsByDate.set(row.date, meals);
    }

    // 3. Fetch sleep data using shared algorithm
    // Uses session-based calculation with interval merging and source priority
    const sleepData = await calculateDailySleep(pool, startDateStr, endDateStr);
    for (const [date, hours] of sleepData) {
      sleepByDate.set(date, hours);
    }

    // 4. Fetch mindful minutes
    const mindfulResult = await pool.query<{
      date: string;
      value: number;
    }>(
      `SELECT date::date::text as date, value
       FROM ios_apple_health_metrics
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
        workouts: workoutsByDate.get(dateStr),
        meals: mealsByDate.get(dateStr),
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
