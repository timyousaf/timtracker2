import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import type { ExerciseProgressApiResponse, ExerciseProgressDataPoint, ExerciseSet } from '@/lib/types';
import { fillDateRange } from '@/lib/aggregation';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface HevyExerciseSet {
  type: string;
  reps: number;
  weight_lbs: number | null;
}

interface HevyExercise {
  title: string;
  sets: HevyExerciseSet[];
}

/**
 * GET /api/exercise-progress
 * 
 * Fetch progress data for a specific exercise.
 * 
 * Query params:
 * - exercise: exercise name (required)
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
    const exerciseName = searchParams.get('exercise');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!exerciseName) {
      return NextResponse.json(
        { error: 'exercise parameter required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = createCacheKey('exercise-progress', { 
      exercise: exerciseName, 
      start: start || '', 
      end: end || '' 
    });
    const cached = getCached<ExerciseProgressApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query
    const pool = getPool();
    const params: string[] = [];
    let paramIndex = 1;
    
    let query = `
      SELECT start_time, exercises
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
      start_time: Date;
      exercises: string | HevyExercise[];
    }>(query, params);

    if (result.rows.length === 0) {
      const response: ExerciseProgressApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Filter and process workouts containing the specified exercise
    const progressData: ExerciseProgressDataPoint[] = [];

    for (const row of result.rows) {
      let exercises: HevyExercise[] = [];
      if (typeof row.exercises === 'string') {
        try {
          exercises = JSON.parse(row.exercises);
        } catch {
          continue;
        }
      } else if (Array.isArray(row.exercises)) {
        exercises = row.exercises;
      }

      // Find the matching exercise
      const matchingExercise = exercises.find(
        ex => ex.title.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!matchingExercise) continue;

      // Process sets
      const sets: ExerciseSet[] = [];
      let totalVolume = 0;
      let totalReps = 0;
      let maxWeight = 0;

      for (const s of matchingExercise.sets || []) {
        if (s.type === 'normal' && s.reps) {
          const weight = s.weight_lbs || 0;
          sets.push({
            reps: s.reps,
            weight,
          });
          totalReps += s.reps;
          totalVolume += weight * s.reps;
          if (weight > maxWeight) {
            maxWeight = weight;
          }
        }
      }

      if (sets.length > 0) {
        progressData.push({
          date: new Date(row.start_time).toISOString().split('T')[0],
          totalVolume: Math.round(totalVolume),
          reps: totalReps,
          maxWeight,
          sets,
        });
      }
    }

    // Fill in gaps with null values if date range is specified
    let finalData: (ExerciseProgressDataPoint | { date: string; value: null; movingAvg: null })[] = progressData;
    if (start && end) {
      finalData = fillDateRange(progressData.map(d => ({ ...d, value: d.totalVolume })), start, end)
        .map(d => {
          if ('totalVolume' in d) {
            return d as ExerciseProgressDataPoint;
          }
          // Return null placeholder for missing dates
          return { date: d.date, totalVolume: null, reps: null, maxWeight: null, sets: [] } as any;
        });
    }

    const response: ExerciseProgressApiResponse = { data: finalData as ExerciseProgressDataPoint[] };
    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/exercise-progress:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exercise progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
