import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

interface InteractionEntry {
  people_ids: number[];
  type: 'IRL' | 'Call' | 'Text';
  date: string;
  note?: string;
  people_notes?: Record<string, string>;
}

interface InteractionLogRequest {
  interactions?: InteractionEntry[];
  // Single interaction format (backwards compatibility)
  people_ids?: number[];
  type?: 'IRL' | 'Call' | 'Text';
  date?: string;
  note?: string;
  people_notes?: Record<string, string>;
}

const VALID_TYPES = ['IRL', 'Call', 'Text'];

/**
 * POST /api/log/interaction
 * Log one or more social interactions.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: InteractionLogRequest = await request.json();

    // Support both array format and single interaction format
    const entries: InteractionEntry[] = body.interactions || [
      {
        people_ids: body.people_ids || [],
        type: body.type as 'IRL' | 'Call' | 'Text',
        date: body.date || '',
        note: body.note,
        people_notes: body.people_notes,
      },
    ];

    const pool = getPool();
    const insertedIds: number[] = [];

    for (const entry of entries) {
      const { people_ids, type, date, note, people_notes } = entry;

      if (!people_ids || people_ids.length === 0 || !type || !date) {
        return NextResponse.json(
          { error: 'people_ids, type, and date are required for each interaction' },
          { status: 400 }
        );
      }

      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: `Invalid interaction type: ${type}` }, { status: 400 });
      }

      // Process each person in the interaction
      for (const personId of people_ids) {
        // Update person notes if provided
        if (people_notes && people_notes[String(personId)]) {
          await pool.query(
            'UPDATE people SET note = $1, updated_at = NOW() WHERE id = $2',
            [people_notes[String(personId)], personId]
          );
        }

        // Insert interaction
        const result = await pool.query(
          `INSERT INTO interactions (user_id, person_id, interaction_type, date, note)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [userId, personId, type, date, note ?? null]
        );
        insertedIds.push(result.rows[0].id);
      }
    }

    return NextResponse.json({ ids: insertedIds });
  } catch (error) {
    console.error('Error logging interaction:', error);
    return NextResponse.json(
      { error: 'Failed to log interaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
