import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached, createCacheKey } from '@/lib/cache';
import { calculateMovingAverage, groupByDate, groupByWeek } from '@/lib/aggregation';
import type { MetricsApiResponse } from '@/lib/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics
 * 
 * Fetch health metrics with aggregation and moving averages.
 * Replicates legacy Flask /api/metrics endpoint.
 * 
 * Query params:
 * - type: metric type (required, e.g., "Weight/Body Mass (lb)")
 * - start: start date (optional, YYYY-MM-DD)
 * - end: end date (optional, YYYY-MM-DD)
 * - period: 'day' or 'week' (default: 'day')
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const metricType = searchParams.get('type');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const period = searchParams.get('period') || 'day';

    // Validate required parameters
    if (!metricType) {
      return NextResponse.json(
        { error: 'type parameter required' },
        { status: 400 }
      );
    }

    if (period !== 'day' && period !== 'week') {
      return NextResponse.json(
        { error: 'invalid period, must be "day" or "week"' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = createCacheKey('metrics', { type: metricType, start: start || '', end: end || '', period });
    const cached = getCached<MetricsApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query
    const pool = getPool();
    const params: (string | Date)[] = [metricType];
    let paramIndex = 2;
    
    let query = `
      SELECT date::text, value
      FROM apple_health_metrics
      WHERE type = $1
    `;

    if (start) {
      query += ` AND date >= $${paramIndex}`;
      params.push(start);
      paramIndex++;
    }

    if (end) {
      query += ` AND date <= $${paramIndex}`;
      params.push(end);
      paramIndex++;
    }

    query += ' ORDER BY date';

    // Execute query
    const result = await pool.query<{ date: string; value: number }>(query, params);

    if (result.rows.length === 0) {
      const response: MetricsApiResponse = { data: [] };
      setCached(cacheKey, response);
      return NextResponse.json(response);
    }

    // Group by date and average values
    let aggregated = groupByDate(result.rows);

    // Group by week if requested
    if (period === 'week') {
      aggregated = groupByWeek(aggregated);
    }

    // Calculate moving average
    const withMovingAvg = calculateMovingAverage(aggregated);

    const response: MetricsApiResponse = { data: withMovingAvg };
    setCached(cacheKey, response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
