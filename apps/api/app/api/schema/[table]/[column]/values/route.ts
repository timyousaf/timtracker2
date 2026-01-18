import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface RouteParams {
  params: Promise<{
    table: string;
    column: string;
  }>;
}

/**
 * GET /api/schema/:table/:column/values
 * Returns distinct values for a column in a table.
 * Used by ChatGPT to discover valid enum values.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table, column } = await params;
    const pool = getPool();

    // Validate table exists
    const tableCheck = await pool.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    if (tableCheck.rows.length === 0) {
      return NextResponse.json({ error: `Table '${table}' not found` }, { status: 404 });
    }

    // Validate column exists
    const columnCheck = await pool.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (columnCheck.rows.length === 0) {
      return NextResponse.json({ error: `Column '${column}' not found in table '${table}'` }, { status: 404 });
    }

    // Get distinct values (limit to 100 for safety)
    const result = await pool.query(
      `SELECT DISTINCT "${column}" as value FROM "${table}" WHERE "${column}" IS NOT NULL ORDER BY "${column}" LIMIT 100`
    );

    const values = result.rows.map(r => r.value);

    return NextResponse.json({ values });
  } catch (error) {
    console.error('Error fetching column values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch column values', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
