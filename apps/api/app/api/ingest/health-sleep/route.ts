import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getUserId } from '@/lib/auth';

/**
 * Sleep segment record from iOS HealthKit.
 * Each segment is a separate row (category samples).
 */
interface SleepRecord {
  healthkit_uuid: string;
  start_time: string; // ISO 8601 timestamp
  end_time: string; // ISO 8601 timestamp
  source: string; // e.g. "Apple Watch", "iPhone"
  qty: number; // Duration in hours
  value: string; // Sleep stage: "InBed", "Asleep", "AsleepCore", "AsleepDeep", "AsleepREM", "Awake"
}

interface IngestRequest {
  records: SleepRecord[];
}

interface IngestResponse {
  received: number;
  inserted: number;
  duplicates: number;
}

/**
 * POST /api/ingest/health-sleep
 * 
 * Batch insert sleep segments from iOS HealthKit.
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
      if (!record.healthkit_uuid || !record.start_time || !record.end_time) {
        return NextResponse.json(
          { error: 'Each record must have healthkit_uuid, start_time, and end_time' },
          { status: 400 }
        );
      }
    }

    const pool = getPool();
    let inserted = 0;

    // Batch insert with ON CONFLICT DO NOTHING
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      
      const values: (string | number | null)[] = [];
      const placeholders: string[] = [];
      
      chunk.forEach((record, idx) => {
        const offset = idx * 6;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
        );
        values.push(
          record.healthkit_uuid,
          record.start_time,
          record.end_time,
          record.source ?? null,
          record.qty ?? null,
          record.value ?? null
        );
      });

      const query = `
        INSERT INTO ios_apple_health_sleep 
          (healthkit_uuid, start_time, end_time, source, qty, value)
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

    console.log(`[ingest/health-sleep] ${JSON.stringify(response)}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error ingesting health sleep:', error);
    return NextResponse.json(
      {
        error: 'Failed to ingest health sleep',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
