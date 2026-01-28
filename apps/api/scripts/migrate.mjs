#!/usr/bin/env node
/**
 * Database migration runner.
 * 
 * Usage: node scripts/migrate.mjs
 * 
 * Requires NEON_DATABASE_URL environment variable.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: NEON_DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log('Starting database migrations...');
    console.log('');

    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const appliedResult = await pool.query('SELECT name FROM _migrations ORDER BY name');
    const applied = new Set(appliedResult.rows.map((row) => row.name));

    // Get migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('No migrations directory found');
      process.exit(0);
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s)`);
    console.log(`Already applied: ${applied.size}`);
    console.log('');

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭  Skipping (already applied): ${file}`);
        skippedCount++;
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filepath, 'utf-8');

      console.log(`▶  Running migration: ${file}`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✓  Applied: ${file}`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗  Failed: ${file}`);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('');
    console.log('Migration complete!');
    console.log(`  Applied: ${appliedCount}`);
    console.log(`  Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('');
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
