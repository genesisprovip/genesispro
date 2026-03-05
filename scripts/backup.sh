#!/bin/bash
# GenesisPro - Automated PostgreSQL Backup
# Runs via cron daily at 3 AM
# Keeps last 7 daily + 4 weekly backups

set -euo pipefail

APP_DIR="/opt/genesispro"
BACKUP_DIR="/opt/genesispro-backups"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

cd "$APP_DIR"

# Source env vars
source .env

echo "[$(date)] Starting backup..."

# Create backup
BACKUP_FILE="$BACKUP_DIR/genesispro_${DATE}.sql.gz"
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($FILESIZE)"

# Keep weekly backup on Sundays
if [ "$DAY_OF_WEEK" = "7" ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/weekly_$(date +%Y%m%d).sql.gz"
fi

# Cleanup: remove daily backups older than 7 days
find "$BACKUP_DIR" -name "genesispro_*.sql.gz" -mtime +7 -delete

# Cleanup: remove weekly backups older than 30 days
find "$BACKUP_DIR" -name "weekly_*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup complete. Remaining backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l
echo " backup files"
