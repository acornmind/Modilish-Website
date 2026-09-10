#!/usr/bin/env bash
# Nightly dump of the local database, keeping 14 days (installed as /usr/local/bin/modilish-backup).
# Restore with: runuser -u postgres -- pg_restore -d modilish --clean --if-exists <file>
set -euo pipefail
dir=/srv/modilish/backups
mkdir -p "$dir"
chmod 700 "$dir"
file="$dir/modilish-$(date +%F).dump"
runuser -u postgres -- pg_dump -Fc modilish > "$file"
find "$dir" -name 'modilish-*.dump' -mtime +14 -delete
echo "backup written: $file ($(du -h "$file" | cut -f1))"
