import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { getWeekStart, getWeekLabel } from '@/lib/aggregation';
import type { StrengthVolumeApiResponse, StrengthWorkoutSummary } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface ExerciseSet {
  type: string;
  reps: number;
  weight_lbs: number | null;
}

interface Exercise {
  sets: ExerciseSet[];
}

/**
 * GET /api/strength-volume
 * 
 * Fetch weekly strength training volume with workout details.
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
    const cacheKey = createCacheKey('strength-volume', { start: start || '', end: end || '' });
    const cached = getCached<StrengthVolumeApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query
    const pool = getPool();
    const params: string[] = [];
    let paramIndex = 1;
    
    let query = `
      SELECT title, start_time, end_time, exercises
      FROM hevy_workouts
      WHERE start_time IS NOT NULL
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
      title: string;
      start_time: Date;
      end_time: Date | null;
      exercises: string | Exercise[];
    }>(query, params);

    if (result.rows.length === 0) {
      const response: StrengthVolumeApiResponse = { 
        categories: [], 
        series: [], 
        workouts: [] 
      };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Process workouts
    interface WorkoutData {
      date: Date;
      title: string;
      sets: number;
      reps: number;
      duration: number;
      volume: number;
    }

    const workoutData: WorkoutData[] = [];

    for (const row of result.rows) {
      let exercises: Exercise[] = [];
      if (typeof row.exercises === 'string') {
        try {
          exercises = JSON.parse(row.exercises);
        } catch {
          continue;
        }
      } else if (Array.isArray(row.exercises)) {
        exercises = row.exercises;
      }

      let volume = 0;
      let sets = 0;
      let reps = 0;

      for (const ex of exercises) {
        for (const s of ex.sets || []) {
          if (s.type === 'normal' && s.reps && s.weight_lbs !== null && s.weight_lbs !== undefined) {
            sets++;
            reps += s.reps;
            volume += s.weight_lbs * s.reps;
          }
        }
      }

      if (volume > 0) {
        const startTime = new Date(row.start_time);
        const endTime = row.end_time ? new Date(row.end_time) : null;
        const duration = endTime 
          ? (endTime.getTime() - startTime.getTime()) / 60000 
          : 0;

        workoutData.push({
          date: startTime,
          title: row.title,
          sets,
          reps,
          duration,
          volume,
        });
      }
    }

    if (workoutData.length === 0) {
      const response: StrengthVolumeApiResponse = { 
        categories: [], 
        series: [], 
        workouts: [] 
      };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Group by week
    const weekVolumes = new Map<string, number>();
    const weekWorkouts = new Map<string, StrengthWorkoutSummary[]>();

    for (const workout of workoutData) {
      const weekStart = getWeekStart(workout.date);
      const weekKey = weekStart.toISOString().split('T')[0];

      // Sum volume
      const existing = weekVolumes.get(weekKey) || 0;
      weekVolumes.set(weekKey, existing + workout.volume);

      // Store workout summary
      const workouts = weekWorkouts.get(weekKey) || [];
      workouts.push({
        date: workout.date.toISOString().split('T')[0],
        title: workout.title,
        duration: Math.round(workout.duration),
        sets: workout.sets,
        reps: workout.reps,
        volume: Math.round(workout.volume),
      });
      weekWorkouts.set(weekKey, workouts);
    }

    // Sort weeks and create output
    const sortedWeeks = Array.from(weekVolumes.keys()).sort();

    // Ensure we include up to current week
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
    if (sortedWeeks.length > 0 && currentWeekKey > sortedWeeks[sortedWeeks.length - 1]) {
      sortedWeeks.push(currentWeekKey);
    }

    const categories = sortedWeeks.map(weekKey => {
      const weekStart = new Date(weekKey);
      return getWeekLabel(weekStart);
    });

    const series = sortedWeeks.map(weekKey => 
      Math.round(weekVolumes.get(weekKey) || 0)
    );

    const workouts = sortedWeeks.map(weekKey => {
      const wks = weekWorkouts.get(weekKey) || [];
      return wks.sort((a, b) => a.date.localeCompare(b.date));
    });

    const response: StrengthVolumeApiResponse = {
      categories,
      series,
      workouts,
    };

    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/strength-volume:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch strength volume',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
