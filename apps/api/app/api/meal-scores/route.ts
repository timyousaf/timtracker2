import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import type { MealScoresApiResponse, DailyMealScoreDataPoint, MealLogDetail } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/meal-scores
 * 
 * Fetch daily meal scores with comments and meal descriptions.
 * Combines data from daily_meal_scores and meal_logs tables.
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
    const cacheKey = createCacheKey('meal-scores', { start: start || '', end: end || '' });
    const cached = getCached<MealScoresApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const pool = getPool();

    // Fetch daily meal scores
    const scoreParams: string[] = [];
    let scoreParamIndex = 1;
    
    let scoreQuery = `
      SELECT date::text, health_score, health_comment
      FROM daily_meal_scores
      WHERE health_score IS NOT NULL
    `;

    if (start) {
      scoreQuery += ` AND date >= $${scoreParamIndex}`;
      scoreParams.push(start);
      scoreParamIndex++;
    }

    if (end) {
      scoreQuery += ` AND date <= $${scoreParamIndex}`;
      scoreParams.push(end);
      scoreParamIndex++;
    }

    scoreQuery += ' ORDER BY date';

    const scoreResult = await pool.query<{
      date: string;
      health_score: number;
      health_comment: string | null;
    }>(scoreQuery, scoreParams);

    if (scoreResult.rows.length === 0) {
      const response: MealScoresApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Fetch meal descriptions for the date range
    const mealParams: string[] = [];
    let mealParamIndex = 1;
    
    let mealQuery = `
      SELECT date::text, description
      FROM meal_logs
      WHERE 1=1
    `;

    if (start) {
      mealQuery += ` AND date >= $${mealParamIndex}`;
      mealParams.push(start);
      mealParamIndex++;
    }

    if (end) {
      mealQuery += ` AND date <= $${mealParamIndex}`;
      mealParams.push(end);
      mealParamIndex++;
    }

    mealQuery += ' ORDER BY date';

    const mealResult = await pool.query<{
      date: string;
      description: string;
    }>(mealQuery, mealParams);

    // Group meals by date
    const mealsByDate = new Map<string, string[]>();
    for (const row of mealResult.rows) {
      const meals = mealsByDate.get(row.date) || [];
      meals.push(row.description);
      mealsByDate.set(row.date, meals);
    }

    // Combine scores with meals
    const data: DailyMealScoreDataPoint[] = scoreResult.rows.map(row => ({
      date: row.date,
      score: row.health_score,
      comment: row.health_comment || undefined,
      meals: mealsByDate.get(row.date) || [],
    }));

    const response: MealScoresApiResponse = { data };
    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/meal-scores:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch meal scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
