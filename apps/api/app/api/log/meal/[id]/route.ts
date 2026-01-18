import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MealUpdateRequest {
  text?: string;
  date?: string;
  health_score?: number;
  health_comment?: string;
}

/**
 * PATCH /api/log/meal/:id
 * Update an existing meal entry.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const mealId = parseInt(id, 10);
    if (isNaN(mealId)) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const body: MealUpdateRequest = await request.json();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (body.text !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.text);
    }
    if (body.date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(body.date);
    }
    if (body.health_score !== undefined) {
      updates.push(`health_score = $${paramIndex++}`);
      values.push(body.health_score);
    }
    if (body.health_comment !== undefined) {
      updates.push(`health_comment = $${paramIndex++}`);
      values.push(body.health_comment);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(mealId, userId);

    const pool = getPool();
    await pool.query(
      `UPDATE meal_logs SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/log/meal/:id
 * Delete a meal entry.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const mealId = parseInt(id, 10);
    if (isNaN(mealId)) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      'DELETE FROM meal_logs WHERE id = $1 AND user_id = $2',
      [mealId, userId]
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
