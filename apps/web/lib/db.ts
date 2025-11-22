import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create a PostgreSQL connection pool.
 * Reuses the same pool across requests for better performance.
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Required for Neon
    },
    // Connection pool settings for serverless environments
    max: 1, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
}

