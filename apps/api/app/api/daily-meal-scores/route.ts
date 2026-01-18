import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/daily-meal-scores
 * List daily meal health scores.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const pool = getPool();
    const conditions: string[] = [];
    const values: string[] = [];
    let paramIndex = 1;

    if (start) {
      conditions.push(`date >= $${paramIndex++}`);
      values.push(start);
    }
    if (end) {
      conditions.push(`date <= $${paramIndex++}`);
      values.push(end);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT date, health_score, health_comment
       FROM daily_meal_scores
       ${whereClause}
       ORDER BY date DESC`,
      values
    );

    const scores = result.rows.map(row => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      health_score: row.health_score,
      health_comment: row.health_comment,
    }));

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error listing daily meal scores:', error);
    return NextResponse.json(
      { error: 'Failed to list daily meal scores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily-meal-scores
 * Upsert a daily meal score.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, health_score, health_comment } = body;

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO daily_meal_scores (date, health_score, health_comment)
       VALUES ($1, $2, $3)
       ON CONFLICT (date) DO UPDATE SET
         health_score = COALESCE(EXCLUDED.health_score, daily_meal_scores.health_score),
         health_comment = COALESCE(EXCLUDED.health_comment, daily_meal_scores.health_comment),
         updated_at = NOW()`,
      [date, health_score ?? null, health_comment ?? null]
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error upserting daily meal score:', error);
    return NextResponse.json(
      { error: 'Failed to save daily meal score', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
