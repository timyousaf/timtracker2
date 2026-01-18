import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Tables exposed to GPT with metadata
const RAW_TABLES: Record<string, { description: string; recommendedEndpoint?: string }> = {
  apple_health_sleep: {
    description: 'Raw Apple Health sleep intervals. Use /api/sleep for daily totals.',
    recommendedEndpoint: '/api/sleep',
  },
  apple_health_metrics: {
    description: 'Health metrics from Apple Health (heart rate, HRV, etc).',
    recommendedEndpoint: '/api/metrics',
  },
  apple_health_workouts: {
    description: 'Workout sessions from Apple Health.',
    recommendedEndpoint: '/api/weekly-workouts',
  },
  hevy_workouts: {
    description: 'Strength training workouts from Hevy app.',
    recommendedEndpoint: '/api/strength-volume',
  },
  meal_logs: {
    description: 'User-logged meals with optional health scores.',
  },
  daily_meal_scores: {
    description: 'Daily aggregated meal health scores.',
  },
  people: {
    description: 'Known people referenced in social interactions.',
  },
  interactions: {
    description: 'Logged social interactions with people, dates and notes.',
  },
};

const ANALYTIC_ENDPOINTS = [
  { path: '/api/sleep', method: 'GET', description: 'Aggregated daily sleep totals', sourceTable: 'apple_health_sleep' },
  { path: '/api/metrics', method: 'GET', description: 'Daily averages for health metrics (requires type param)', sourceTable: 'apple_health_metrics' },
  { path: '/api/weekly-workouts', method: 'GET', description: 'Weekly workout summaries by type', sourceTable: 'apple_health_workouts' },
  { path: '/api/calendar-heatmap', method: 'GET', description: 'Calendar heatmap data (requires type param)', sourceTable: null },
  { path: '/api/meal-scores', method: 'GET', description: 'Meal logs with health scores and trends', sourceTable: 'meal_logs' },
  { path: '/api/strength-volume', method: 'GET', description: 'Weekly strength training volume', sourceTable: 'hevy_workouts' },
  { path: '/api/exercise-progress', method: 'GET', description: 'Progress for specific exercises (requires exercise param)', sourceTable: 'hevy_workouts' },
];

/**
 * GET /api/schema
 * Returns database schema and available analytic endpoints.
 * Used by ChatGPT to understand the database structure.
 */
export async function GET() {
  try {
    const pool = getPool();

    // Get all tables and their columns
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables: Record<string, {
      columns: Array<{ name: string; type: string; nullable: boolean; values?: string[] }>;
      raw: boolean;
      description: string;
      recommendedEndpoint?: string;
    }> = {};

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Get columns for this table
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const columns = [];
      for (const col of columnsResult.rows) {
        const colInfo: { name: string; type: string; nullable: boolean; values?: string[] } = {
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
        };

        // For text/varchar columns with few distinct values, include them as enum hints
        if (['character varying', 'text'].includes(col.data_type)) {
          try {
            const valuesResult = await pool.query(
              `SELECT DISTINCT "${col.column_name}" FROM "${tableName}" WHERE "${col.column_name}" IS NOT NULL LIMIT 25`
            );
            const values = valuesResult.rows.map(r => r[col.column_name]).filter(Boolean);
            if (values.length > 0 && values.length <= 20) {
              colInfo.values = values;
            }
          } catch {
            // Ignore errors for individual columns
          }
        }

        columns.push(colInfo);
      }

      const rawInfo = RAW_TABLES[tableName];
      tables[tableName] = {
        columns,
        raw: tableName in RAW_TABLES,
        description: rawInfo?.description || '',
        recommendedEndpoint: rawInfo?.recommendedEndpoint,
      };
    }

    return NextResponse.json({
      tables,
      analyticEndpoints: ANALYTIC_ENDPOINTS,
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
