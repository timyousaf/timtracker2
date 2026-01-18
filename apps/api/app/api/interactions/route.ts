import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/interactions
 * List interactions joined with people names.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(1, parseInt(limitParam || '100', 10)), 1000);

    const pool = getPool();
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (start) {
      conditions.push(`i.date >= $${paramIndex++}`);
      values.push(start);
    }
    if (end) {
      conditions.push(`i.date <= $${paramIndex++}`);
      values.push(end);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit);

    const result = await pool.query(
      `SELECT i.id, i.date, p.name AS person_name, i.interaction_type, i.note
       FROM interactions i
       LEFT JOIN people p ON i.person_id = p.id
       ${whereClause}
       ORDER BY i.date DESC
       LIMIT $${paramIndex}`,
      values
    );

    const interactions = result.rows.map(row => ({
      id: row.id,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      person_name: row.person_name,
      interaction_type: row.interaction_type,
      note: row.note,
    }));

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Error listing interactions:', error);
    return NextResponse.json(
      { error: 'Failed to list interactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
