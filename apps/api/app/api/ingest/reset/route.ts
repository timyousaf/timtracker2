import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

interface ResetResponse {
  success: boolean;
  deleted: {
    metrics: number;
    workouts: number;
    sleep: number;
  };
}

/**
 * DELETE /api/ingest/reset
 * 
 * Clears all data from the ios_* tables to allow a full re-sync from HealthKit.
 * This treats HealthKit as the source of truth.
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    
    // Delete from all three ios_* tables
    const [metricsResult, workoutsResult, sleepResult] = await Promise.all([
      pool.query('DELETE FROM ios_apple_health_metrics'),
      pool.query('DELETE FROM ios_apple_health_workouts'),
      pool.query('DELETE FROM ios_apple_health_sleep'),
    ]);

    const response: ResetResponse = {
      success: true,
      deleted: {
        metrics: metricsResult.rowCount || 0,
        workouts: workoutsResult.rowCount || 0,
        sleep: sleepResult.rowCount || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resetting health data:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset health data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
