#!/bin/bash
# Backup PostgreSQL database
# Usage: ./scripts/backup-db.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups/db}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="restaurant_db_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up database..."

# For Docker deployment
if docker ps --format "{{.Names}}" | grep -q "restaurant_db"; then
  docker exec restaurant_db pg_dump -U postgres restaurant_db | gzip > "${BACKUP_DIR}/${FILENAME}"
else
  # For local PostgreSQL
  pg_dump "${DATABASE_URL:-postgresql://postgres:password@localhost:5432/restaurant_db}" | gzip > "${BACKUP_DIR}/${FILENAME}"
fi

echo "✅ Backup saved to: ${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "🧹 Cleaned up backups older than 30 days"
