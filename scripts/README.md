# TimTracker2 Scripts

Utility scripts for managing the TimTracker2 database and migrations.

## Setup

```bash
cd scripts
poetry install
```

## migrate_from_gcp.py

Migrates data from the old timtracker GCP Cloud SQL database to the new Neon database.

### Tables Migrated

- `people` - Contact/relationship records
- `meal_logs` - Individual meal log entries
- `daily_meal_scores` - Daily aggregated meal scores
- `interactions` - Interaction logs with people

> **Note:** The `apple_*` and `hevy_*` tables are already being synced by the pipeline and do not need migration.

### Required Environment Variables

**GCP Cloud SQL (source):**
```bash
export INSTANCE_CONNECTION_NAME="project:region:instance"
export DB_NAME="timtracker"
export DB_USER="your-service-account@project.iam.gserviceaccount.com"
```

**Neon (destination):**
```bash
export NEON_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

### Authentication

The script uses GCP IAM authentication for the Cloud SQL connection. You need either:

1. **Application Default Credentials** (for local development):
   ```bash
   gcloud auth application-default login
   ```

2. **Service Account Key** (for CI/production):
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

### Usage

```bash
# Set environment variables (or use .env file)
export INSTANCE_CONNECTION_NAME="timtracker-project:us-central1:timtracker-db"
export DB_NAME="timtracker"
export DB_USER="timtracker-sa@timtracker-project.iam.gserviceaccount.com"
export NEON_DATABASE_URL="postgresql://user:pass@host/timtracker2?sslmode=require"

# Run migration (interactive)
poetry run python migrate_from_gcp.py

# Run migration (skip confirmation)
poetry run python migrate_from_gcp.py --yes
```

The script will:
1. Connect to both databases
2. Show current row counts
3. Ask for confirmation before proceeding
4. Create tables if they don't exist in Neon
5. Truncate destination tables (to ensure clean migration)
6. Copy all rows from source to destination
7. Reset sequences for SERIAL columns
8. Show final row counts to verify migration

### Notes

- Migration is **destructive** - it truncates destination tables before copying
- Tables are migrated in order to respect foreign key constraints
- The script handles the `people` table first because `interactions` references it
- Run this script once to seed the Neon database, then the pipeline will keep it updated
