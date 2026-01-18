import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

interface MealLogRequest {
  text: string;
  date: string;
  health_score?: number;
  health_comment?: string;
}

/**
 * POST /api/log/meal
 * Log a new meal entry.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MealLogRequest = await request.json();
    const { text, date, health_score, health_comment } = body;

    if (!text || !date) {
      return NextResponse.json({ error: 'text and date are required' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO meal_logs (user_id, description, date, health_score, health_comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, text, date, health_score ?? null, health_comment ?? null]
    );

    return NextResponse.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error logging meal:', error);
    return NextResponse.json(
      { error: 'Failed to log meal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
