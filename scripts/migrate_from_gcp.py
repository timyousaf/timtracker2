#!/usr/bin/env python3
"""
Migration script to copy tables from GCP Cloud SQL (timtracker) to Neon (timtracker2).

Tables to migrate:
- people (no dependencies)
- meal_logs (no dependencies)
- daily_meal_scores (no dependencies)
- interactions (depends on people via foreign key)

The apple_* and hevy_* tables are already being synced by the pipeline.

Usage:
    cd timtracker2/scripts
    poetry install
    poetry run python migrate_from_gcp.py

Required environment variables:
    GCP Cloud SQL (source):
        INSTANCE_CONNECTION_NAME - project:region:instance
        DB_NAME - database name
        DB_USER - IAM user email

    Neon (destination):
        NEON_DATABASE_URL - postgres connection string
"""

import argparse
import os
import sys
import logging
from contextlib import contextmanager

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Tables to migrate in order (respecting foreign key constraints)
TABLES_TO_MIGRATE = [
    "people",           # No dependencies
    "meal_logs",        # No dependencies  
    "daily_meal_scores", # No dependencies
    "interactions",     # References people(id)
]


def get_gcp_engine():
    """Create a SQLAlchemy engine connected to GCP Cloud SQL via the Cloud SQL Connector."""
    from google.cloud.sql.connector import Connector
    from sqlalchemy import create_engine

    instance = os.environ.get("INSTANCE_CONNECTION_NAME")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")

    if not instance or not db_name or not db_user:
        raise RuntimeError(
            "GCP Cloud SQL requires: INSTANCE_CONNECTION_NAME, DB_NAME, DB_USER"
        )

    # Validate INSTANCE_CONNECTION_NAME format
    if instance.count(":") != 2:
        raise RuntimeError(
            f"INSTANCE_CONNECTION_NAME must be in format 'project:region:instance', got: {instance}"
        )

    logger.info(f"Connecting to GCP Cloud SQL as {db_user}")
    connector = Connector()

    def getconn():
        return connector.connect(
            instance,
            "pg8000",
            user=db_user,
            db=db_name,
            enable_iam_auth=True,
        )

    engine = create_engine("postgresql+pg8000://", creator=getconn)
    return engine


def get_neon_engine():
    """Create a SQLAlchemy engine connected to Neon database."""
    from sqlalchemy import create_engine

    neon_url = os.environ.get("NEON_DATABASE_URL")
    if not neon_url:
        raise RuntimeError("NEON_DATABASE_URL environment variable is required")

    # Normalize connection string for psycopg2
    if neon_url.startswith("postgres://"):
        neon_url = neon_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif neon_url.startswith("postgresql://"):
        neon_url = neon_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    logger.info("Connecting to Neon database")
    engine = create_engine(neon_url)
    return engine


def ensure_schema_exists(engine, tables: list[str]):
    """Ensure the required tables exist in the destination database."""
    from sqlalchemy import text

    schema_sql = """
    CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        note TEXT,
        gender TEXT CHECK (gender IN ('male','female','other')),
        importance INTEGER,
        alive BOOLEAN,
        tag TEXT[],
        relationships INTEGER[],
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        description TEXT NOT NULL,
        health_score INTEGER,
        health_comment TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS daily_meal_scores (
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        health_score INTEGER,
        health_comment TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS interactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        person_id INTEGER REFERENCES people(id),
        interaction_type TEXT CHECK (interaction_type IN ('IRL', 'Call', 'Text')),
        date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    """

    with engine.begin() as conn:
        conn.execute(text(schema_sql))
    logger.info("Schema ensured in destination database")


def get_table_count(engine, table: str) -> int:
    """Get the row count for a table."""
    from sqlalchemy import text

    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
        return result.scalar()


def get_table_columns(engine, table: str) -> list[str]:
    """Get column names for a table."""
    from sqlalchemy import text

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table
            ORDER BY ordinal_position
            """
            ),
            {"table": table},
        )
        return [row[0] for row in result]


def migrate_table(source_engine, dest_engine, table: str, batch_size: int = 1000):
    """Migrate a single table from source to destination."""
    from sqlalchemy import text

    source_count = get_table_count(source_engine, table)
    logger.info(f"Migrating {table}: {source_count} rows in source")

    if source_count == 0:
        logger.info(f"  Skipping {table}: no rows to migrate")
        return

    # Get columns from source
    columns = get_table_columns(source_engine, table)
    columns_str = ", ".join(columns)
    placeholders = ", ".join([f":{col}" for col in columns])

    # Clear destination table before migration
    with dest_engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    logger.info(f"  Cleared {table} in destination")

    # Read all data from source
    with source_engine.connect() as source_conn:
        result = source_conn.execute(text(f"SELECT {columns_str} FROM {table}"))
        rows = result.fetchall()

    # Insert into destination in batches
    inserted = 0
    with dest_engine.begin() as dest_conn:
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            for row in batch:
                # Convert row to dict for parameterized insert
                row_dict = dict(zip(columns, row))
                dest_conn.execute(
                    text(f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"),
                    row_dict,
                )
            inserted += len(batch)
            logger.info(f"  Inserted {inserted}/{len(rows)} rows")

    # Reset sequence for tables with SERIAL id
    if "id" in columns and table != "daily_meal_scores":
        with dest_engine.begin() as conn:
            conn.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}"
                )
            )
        logger.info(f"  Reset sequence for {table}")

    dest_count = get_table_count(dest_engine, table)
    logger.info(f"  Completed {table}: {dest_count} rows in destination")


def main():
    """Main migration function."""
    parser = argparse.ArgumentParser(
        description="Migrate tables from GCP Cloud SQL to Neon"
    )
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Skip confirmation prompt"
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Starting migration from GCP Cloud SQL to Neon")
    logger.info("=" * 60)

    # Validate environment
    required_gcp = ["INSTANCE_CONNECTION_NAME", "DB_NAME", "DB_USER"]
    required_neon = ["NEON_DATABASE_URL"]

    missing = []
    for var in required_gcp + required_neon:
        if not os.environ.get(var):
            missing.append(var)

    if missing:
        logger.error(f"Missing environment variables: {', '.join(missing)}")
        logger.error("\nRequired environment variables:")
        logger.error("  GCP Cloud SQL (source):")
        logger.error("    INSTANCE_CONNECTION_NAME - project:region:instance")
        logger.error("    DB_NAME - database name")
        logger.error("    DB_USER - IAM user email")
        logger.error("  Neon (destination):")
        logger.error("    NEON_DATABASE_URL - postgres connection string")
        sys.exit(1)

    try:
        # Connect to both databases
        logger.info("\nConnecting to databases...")
        source_engine = get_gcp_engine()
        dest_engine = get_neon_engine()

        # Test connections
        from sqlalchemy import text

        with source_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("  ✓ GCP Cloud SQL connection successful")

        with dest_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("  ✓ Neon connection successful")

        # Ensure schema exists
        logger.info("\nEnsuring schema exists in destination...")
        ensure_schema_exists(dest_engine, TABLES_TO_MIGRATE)

        # Show current state
        logger.info("\nCurrent state before migration:")
        for table in TABLES_TO_MIGRATE:
            try:
                source_count = get_table_count(source_engine, table)
                dest_count = get_table_count(dest_engine, table)
                logger.info(f"  {table}: {source_count} (source) → {dest_count} (dest)")
            except Exception as e:
                logger.warning(f"  {table}: error checking counts - {e}")

        # Confirm migration
        print("\n" + "=" * 60)
        print("Ready to migrate the following tables:")
        for table in TABLES_TO_MIGRATE:
            print(f"  - {table}")
        print("\nThis will TRUNCATE the destination tables before copying.")
        print("=" * 60)

        if not args.yes:
            response = input("\nProceed with migration? [y/N]: ").strip().lower()
            if response != "y":
                logger.info("Migration cancelled")
                sys.exit(0)

        # Migrate each table
        logger.info("\nStarting table migration...")
        for table in TABLES_TO_MIGRATE:
            try:
                migrate_table(source_engine, dest_engine, table)
            except Exception as e:
                logger.error(f"Failed to migrate {table}: {e}")
                raise

        # Show final state
        logger.info("\nFinal state after migration:")
        for table in TABLES_TO_MIGRATE:
            source_count = get_table_count(source_engine, table)
            dest_count = get_table_count(dest_engine, table)
            status = "✓" if source_count == dest_count else "⚠"
            logger.info(f"  {status} {table}: {source_count} (source) = {dest_count} (dest)")

        logger.info("\n" + "=" * 60)
        logger.info("Migration completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"\nMigration failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
