import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PersonUpdateRequest {
  name?: string;
  note?: string;
  gender?: 'male' | 'female' | 'other';
  importance?: number;
  alive?: boolean;
  tag?: string[];
  relationships?: number[];
}

/**
 * PATCH /api/people/:id
 * Update an existing person.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const personId = parseInt(id, 10);
    if (isNaN(personId)) {
      return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });
    }

    const body: PersonUpdateRequest = await request.json();
    const updates: string[] = [];
    const values: (string | number | boolean | string[] | number[] | null)[] = [];
    let paramIndex = 1;

    const fields: (keyof PersonUpdateRequest)[] = ['name', 'note', 'gender', 'importance', 'alive', 'tag', 'relationships'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field] as string | number | boolean | string[] | number[]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(personId);

    const pool = getPool();
    await pool.query(
      `UPDATE people SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Failed to update person', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
