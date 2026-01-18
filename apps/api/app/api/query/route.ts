import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface QueryFilter {
  column: string;
  op: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE';
  value: string | number;
}

interface QueryRequest {
  table: string;
  columns?: string[];
  filters?: QueryFilter[];
  order_by?: string;
  limit?: number;
}

const ALLOWED_OPS = ['=', '>', '<', '>=', '<=', '!=', 'LIKE'];

/**
 * POST /api/query
 * Flexible query endpoint for any table.
 * Used by ChatGPT to read data from the database.
 */
export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    const { table, columns, filters = [], order_by, limit = 10 } = body;

    if (!table) {
      return NextResponse.json({ error: 'table is required' }, { status: 400 });
    }

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

    // Get valid columns for this table
    const columnsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const validColumns = columnsResult.rows.map(r => r.column_name);

    // Validate requested columns
    const selectColumns = columns && columns.length > 0 ? columns : validColumns;
    for (const col of selectColumns) {
      if (!validColumns.includes(col)) {
        return NextResponse.json({ error: `Invalid column: ${col}` }, { status: 400 });
      }
    }

    // Build query
    const quotedColumns = selectColumns.map(c => `"${c}"`).join(', ');
    let sql = `SELECT ${quotedColumns} FROM "${table}"`;
    const params: (string | number)[] = [];

    // Add filters
    if (filters.length > 0) {
      const whereClauses: string[] = [];
      for (const filter of filters) {
        if (!validColumns.includes(filter.column)) {
          return NextResponse.json({ error: `Invalid filter column: ${filter.column}` }, { status: 400 });
        }
        if (!ALLOWED_OPS.includes(filter.op)) {
          return NextResponse.json({ error: `Invalid filter op: ${filter.op}` }, { status: 400 });
        }
        params.push(filter.value);
        whereClauses.push(`"${filter.column}" ${filter.op} $${params.length}`);
      }
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add ORDER BY
    if (order_by && validColumns.includes(order_by)) {
      sql += ` ORDER BY "${order_by}" DESC`;
    }

    // Add LIMIT (cap at 100)
    const safeLimit = Math.min(Math.max(1, limit), 100);
    sql += ` LIMIT ${safeLimit}`;

    const result = await pool.query(sql, params);

    // Convert dates to ISO strings
    const rows = result.rows.map(row => {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          converted[key] = value.toISOString();
        } else {
          converted[key] = value;
        }
      }
      return converted;
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { error: 'Query failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
