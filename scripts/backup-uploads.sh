#!/bin/bash
# Backup uploads directory
# Usage: ./scripts/backup-uploads.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups/uploads}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="uploads_${DATE}.tar.gz"
UPLOADS_SOURCE="./public/uploads"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up uploads..."
tar -czf "${BACKUP_DIR}/${FILENAME}" -C "$(dirname $UPLOADS_SOURCE)" "$(basename $UPLOADS_SOURCE)"
echo "✅ Uploads backup saved to: ${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
echo "🧹 Cleaned up backups older than 30 days"
