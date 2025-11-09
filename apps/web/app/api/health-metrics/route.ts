import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/health-metrics
 * 
 * Returns the first few rows from the apple_health_metrics table.
 * Protected route - requires authentication.
 */
export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database connection pool
    const pool = getPool();

    // Query the first 10 rows from apple_health_metrics
    const result = await pool.query(
      `SELECT id, date, type, value, unit, timezone
       FROM apple_health_metrics
       ORDER BY date DESC
       LIMIT 10`
    );

    return NextResponse.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error querying health metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch health metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

