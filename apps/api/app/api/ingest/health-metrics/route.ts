import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

/**
 * Health metric record from iOS HealthKit.
 * These are daily aggregates (one row per date + type).
 */
interface HealthMetricRecord {
  healthkit_uuid: string;
  date: string; // ISO 8601 timestamp
  type: string; // Canonical type string e.g. "Weight/Body Mass (lb)"
  value: number;
  unit: string;
  timezone: string;
}

interface IngestRequest {
  records: HealthMetricRecord[];
}

interface IngestResponse {
  received: number;
  inserted: number;
  duplicates: number;
}

/**
 * POST /api/ingest/health-metrics
 * 
 * Batch insert health metrics from iOS HealthKit.
 * Uses ON CONFLICT DO NOTHING for idempotent inserts.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: IngestRequest = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'records array is required' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json<IngestResponse>({
        received: 0,
        inserted: 0,
        duplicates: 0,
      });
    }

    // Validate records
    for (const record of records) {
      if (!record.healthkit_uuid || !record.date || !record.type) {
        return NextResponse.json(
          { error: 'Each record must have healthkit_uuid, date, and type' },
          { status: 400 }
        );
      }
    }

    const pool = getPool();
    let inserted = 0;

    // Batch insert with ON CONFLICT DO NOTHING
    // Process in chunks to avoid query size limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      
      // Build parameterized query for batch insert
      const values: (string | number | null)[] = [];
      const placeholders: string[] = [];
      
      chunk.forEach((record, idx) => {
        const offset = idx * 6;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
        );
        values.push(
          record.healthkit_uuid,
          record.date,
          record.type,
          record.value ?? null,
          record.unit ?? null,
          record.timezone ?? null
        );
      });

      const query = `
        INSERT INTO ios_apple_health_metrics 
          (healthkit_uuid, date, type, value, unit, timezone)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (healthkit_uuid) DO NOTHING
      `;

      const result = await pool.query(query, values);
      inserted += result.rowCount ?? 0;
    }

    const response: IngestResponse = {
      received: records.length,
      inserted,
      duplicates: records.length - inserted,
    };

    console.log(`[ingest/health-metrics] ${JSON.stringify(response)}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error ingesting health metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to ingest health metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
