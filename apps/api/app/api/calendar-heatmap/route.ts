import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import type { 
  CalendarHeatmapApiResponse, 
  CalendarHeatmapPoint,
  WorkoutDetail,
  InteractionDetail,
  MealDetail,
} from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const TIMEZONE = 'America/New_York';
const HEATMAP_NUM_DAYS = 35; // 5 weeks

/**
 * Compute the date range for the heatmap ending on a Saturday
 */
function computeRange(offset: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = (6 - currentDay + 7) % 7;
  
  const upcomingSaturday = new Date(now);
  upcomingSaturday.setDate(now.getDate() + daysUntilSaturday);
  upcomingSaturday.setHours(0, 0, 0, 0);
  
  const endDate = new Date(upcomingSaturday);
  endDate.setDate(endDate.getDate() - (offset * 7));
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (HEATMAP_NUM_DAYS - 1));
  
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
 * GET /api/calendar-heatmap
 * 
 * Fetch calendar heatmap data for exercise, mindful, interaction, or meal.
 * 
 * Query params:
 * - type: 'exercise' | 'mindful' | 'interaction' | 'meal' (required)
 * - offset: number of weeks to go back (default: 0)
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
    const chartType = searchParams.get('type') as 'exercise' | 'mindful' | 'interaction' | 'meal';
    const offsetStr = searchParams.get('offset') || '0';
    const offset = Math.max(0, parseInt(offsetStr, 10) || 0);

    // Validate type
    if (!['exercise', 'mindful', 'interaction', 'meal'].includes(chartType)) {
      return NextResponse.json(
        { error: 'invalid type, must be "exercise", "mindful", "interaction", or "meal"' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = createCacheKey('calendar-heatmap', { type: chartType, offset });
    const cached = getCached<CalendarHeatmapApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const pool = getPool();
    const { startDate, endDate } = computeRange(offset);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Maps to store aggregated data
    const valueMap = new Map<string, number>();
    const workoutsByDate = new Map<string, WorkoutDetail[]>();
    const interactionsByDate = new Map<string, InteractionDetail[]>();
    const mealsByDate = new Map<string, MealDetail[]>();
    const scoresByDate = new Map<string, number>();

    if (chartType === 'mindful') {
      const result = await pool.query<{ date: string; value: number }>(
        `SELECT date::date::text as date, value
         FROM apple_health_metrics
         WHERE type = 'Mindful Minutes (min)'
           AND date >= $1 AND date <= $2`,
        [startDateStr, endDateStr]
      );

      // Sum values by date
      for (const row of result.rows) {
        const existing = valueMap.get(row.date) || 0;
        valueMap.set(row.date, Math.round(existing + row.value));
      }
    } else if (chartType === 'exercise') {
      const result = await pool.query<{
        start_time: Date;
        type: string;
        duration_seconds: number;
        metrics: string | Record<string, any>;
      }>(
        `SELECT start_time, type, duration_seconds, metrics
         FROM apple_health_workouts
         WHERE start_time >= $1 AND start_time < $2::date + interval '1 day'`,
        [startDateStr, endDateStr]
      );

      // Group by date
      const seenWorkouts = new Set<string>();
      for (const row of result.rows) {
        const workoutDate = new Date(row.start_time);
        const dateKey = workoutDate.toISOString().split('T')[0];
        
        // Deduplicate by start_time
        const workoutKey = row.start_time.toString();
        if (seenWorkouts.has(workoutKey)) continue;
        seenWorkouts.add(workoutKey);

        const durationMinutes = row.duration_seconds / 60;
        
        // Sum duration
        const existing = valueMap.get(dateKey) || 0;
        valueMap.set(dateKey, Math.round(existing + durationMinutes));

        // Parse metrics
        let metrics: Record<string, any> = {};
        if (typeof row.metrics === 'string') {
          try {
            metrics = JSON.parse(row.metrics);
          } catch { /* ignore */ }
        } else if (row.metrics) {
          metrics = row.metrics;
        }

        // Build workout detail
        const workout: WorkoutDetail = {
          type: row.type,
          durationMinutes: Math.round(durationMinutes),
          avgHeartRate: metrics['Avg Heart Rate (bpm)']?.value,
          maxHeartRate: metrics['Max Heart Rate (bpm)']?.value,
        };

        const workouts = workoutsByDate.get(dateKey) || [];
        workouts.push(workout);
        workoutsByDate.set(dateKey, workouts);
      }
    } else if (chartType === 'interaction') {
      const result = await pool.query<{
        date: string;
        person_name: string;
        interaction_type: string;
        note: string | null;
      }>(
        `SELECT i.date::text, p.name AS person_name, i.interaction_type, i.note
         FROM interactions i
         LEFT JOIN people p ON i.person_id = p.id
         WHERE i.date >= $1 AND i.date <= $2`,
        [startDateStr, endDateStr]
      );

      for (const row of result.rows) {
        // Count interactions
        const existing = valueMap.get(row.date) || 0;
        valueMap.set(row.date, existing + 1);

        // Store interaction details
        const interaction: InteractionDetail = {
          personName: row.person_name || 'Unknown',
          interactionType: row.interaction_type,
          note: row.note || undefined,
        };

        const interactions = interactionsByDate.get(row.date) || [];
        interactions.push(interaction);
        interactionsByDate.set(row.date, interactions);
      }
    } else if (chartType === 'meal') {
      // Fetch meal logs
      const mealResult = await pool.query<{
        date: string;
        description: string;
      }>(
        `SELECT date::text, description
         FROM meal_logs
         WHERE date >= $1 AND date <= $2`,
        [startDateStr, endDateStr]
      );

      for (const row of mealResult.rows) {
        // Count meals
        const existing = valueMap.get(row.date) || 0;
        valueMap.set(row.date, existing + 1);

        // Store meal details
        const meal: MealDetail = {
          description: row.description,
        };

        const meals = mealsByDate.get(row.date) || [];
        meals.push(meal);
        mealsByDate.set(row.date, meals);
      }

      // Fetch daily meal scores for coloring
      const scoreResult = await pool.query<{
        date: string;
        health_score: number;
      }>(
        `SELECT date::text, health_score
         FROM daily_meal_scores
         WHERE date >= $1 AND date <= $2 AND health_score IS NOT NULL`,
        [startDateStr, endDateStr]
      );

      for (const row of scoreResult.rows) {
        scoresByDate.set(row.date, row.health_score);
      }
    }

    // Build calendar points
    const points: CalendarHeatmapPoint[] = [];
    let currentWeek = 0;

    for (let i = 0; i < HEATMAP_NUM_DAYS; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      
      const dayOfWeek = day.getDay(); // 0 = Sunday
      if (dayOfWeek === 0 && i > 0) {
        currentWeek++;
      }

      const dateStr = day.toISOString().split('T')[0];
      const value = valueMap.get(dateStr) ?? null;

      const point: CalendarHeatmapPoint = {
        x: dayOfWeek,
        y: currentWeek,
        value,
        date: dateStr,
      };

      // Add type-specific details
      if (chartType === 'exercise') {
        const workouts = workoutsByDate.get(dateStr);
        if (workouts && workouts.length > 0) {
          // Sort by duration descending
          point.workouts = workouts.sort((a, b) => b.durationMinutes - a.durationMinutes);
        }
      } else if (chartType === 'interaction') {
        const interactions = interactionsByDate.get(dateStr);
        if (interactions && interactions.length > 0) {
          point.interactions = interactions;
        }
      } else if (chartType === 'meal') {
        const meals = mealsByDate.get(dateStr);
        if (meals && meals.length > 0) {
          point.meals = meals;
        }
        // Add diet score for coloring
        const score = scoresByDate.get(dateStr);
        if (score !== undefined) {
          point.score = score;
        }
      }

      points.push(point);
    }

    const response: CalendarHeatmapApiResponse = {
      startDateStr: formatDateStr(startDate),
      endDateStr: formatDateStr(endDate, true),
      points,
    };

    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/calendar-heatmap:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar heatmap data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
