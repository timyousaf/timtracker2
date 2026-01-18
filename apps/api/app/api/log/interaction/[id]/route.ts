import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface InteractionUpdateRequest {
  people_ids?: number[];
  type?: 'IRL' | 'Call' | 'Text';
  date?: string;
  note?: string;
  people_notes?: Record<string, string>;
}

const VALID_TYPES = ['IRL', 'Call', 'Text'];

/**
 * PATCH /api/log/interaction/:id
 * Update an existing interaction.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const interactionId = parseInt(id, 10);
    if (isNaN(interactionId)) {
      return NextResponse.json({ error: 'Invalid interaction ID' }, { status: 400 });
    }

    const body: InteractionUpdateRequest = await request.json();
    const pool = getPool();

    // Handle people_notes updates
    if (body.people_ids && body.people_ids.length > 0 && body.people_notes) {
      const personId = body.people_ids[0];
      if (body.people_notes[String(personId)]) {
        await pool.query(
          'UPDATE people SET note = $1, updated_at = NOW() WHERE id = $2',
          [body.people_notes[String(personId)], personId]
        );
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (body.people_ids && body.people_ids.length > 0) {
      updates.push(`person_id = $${paramIndex++}`);
      values.push(body.people_ids[0]);
    }
    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json({ error: `Invalid interaction type: ${body.type}` }, { status: 400 });
      }
      updates.push(`interaction_type = $${paramIndex++}`);
      values.push(body.type);
    }
    if (body.date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(body.date);
    }
    if (body.note !== undefined) {
      updates.push(`note = $${paramIndex++}`);
      values.push(body.note);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(interactionId, userId);

    await pool.query(
      `UPDATE interactions SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error updating interaction:', error);
    return NextResponse.json(
      { error: 'Failed to update interaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/log/interaction/:id
 * Delete an interaction.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const interactionId = parseInt(id, 10);
    if (isNaN(interactionId)) {
      return NextResponse.json({ error: 'Invalid interaction ID' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      'DELETE FROM interactions WHERE id = $1 AND user_id = $2',
      [interactionId, userId]
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error deleting interaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete interaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
