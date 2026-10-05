#!/bin/bash
# ==============================================================================
# Hostinger VPS - Daily Automated PostgreSQL Backup Script
# ==============================================================================

BACKUP_DIR="/var/backups/postgres"
DB_NAME="pediatric_handover_db"
DB_USER="handover_admin"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "📦 Creating compressed PostgreSQL database dump..."
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "✅ Backup saved to: $BACKUP_FILE"

# Retention policy: remove backups older than 14 days
echo "🧹 Purging backups older than 14 days..."
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +14 -delete

echo "✅ Backup routine complete."
