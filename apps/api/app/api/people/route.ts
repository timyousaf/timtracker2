import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface PersonCreateRequest {
  name: string;
  note?: string;
  gender?: 'male' | 'female' | 'other';
  importance?: number;
  alive?: boolean;
  tag?: string[];
  relationships?: number[];
}

/**
 * GET /api/people
 * List all people, optionally filtered by search query.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    const pool = getPool();
    let result;

    if (query) {
      result = await pool.query(
        'SELECT * FROM people WHERE name ILIKE $1 ORDER BY name',
        [`%${query}%`]
      );
    } else {
      result = await pool.query('SELECT * FROM people ORDER BY name');
    }

    // Convert dates to ISO strings
    const people = result.rows.map(row => {
      const person: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          person[key] = value.toISOString();
        } else {
          person[key] = value;
        }
      }
      return person;
    });

    return NextResponse.json(people);
  } catch (error) {
    console.error('Error listing people:', error);
    return NextResponse.json(
      { error: 'Failed to list people', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/people
 * Create a new person or update if name conflicts.
 */
export async function POST(request: NextRequest) {
  try {
    const body: PersonCreateRequest = await request.json();
    const { name, note, gender, importance, alive, tag, relationships } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO people (name, note, gender, importance, alive, tag, relationships)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (name) DO UPDATE SET
         note = COALESCE(EXCLUDED.note, people.note),
         gender = COALESCE(EXCLUDED.gender, people.gender),
         importance = COALESCE(EXCLUDED.importance, people.importance),
         alive = COALESCE(EXCLUDED.alive, people.alive),
         tag = COALESCE(EXCLUDED.tag, people.tag),
         relationships = COALESCE(EXCLUDED.relationships, people.relationships),
         updated_at = NOW()
       RETURNING id`,
      [name, note ?? null, gender ?? null, importance ?? null, alive ?? null, tag ?? null, relationships ?? null]
    );

    return NextResponse.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json(
      { error: 'Failed to create person', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
