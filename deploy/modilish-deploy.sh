#!/usr/bin/env bash
# Pull-based deploy for the production server (installed as /usr/local/bin/modilish-deploy).
#
# Builds the latest commit on `main` into a fresh release directory, applies any
# new SQL migrations to the local database, points the `current` symlink at the
# new release and restarts the service. The systemd timer runs this every
# minute: it exits immediately when nothing changed, never touches the live
# release while building, and a failed build/migration leaves the old release
# running (and is not retried until a new commit lands). `--force` rebuilds the
# current commit — needed after changing /srv/modilish/shared/env, because
# NEXT_PUBLIC_* values are baked in at build time.
set -euo pipefail

REPO="https://github.com/acornmind/Modilish-Website.git"
BRANCH="main"
APP_DIR="/srv/modilish"
RELEASES="$APP_DIR/releases"
SHARED="$APP_DIR/shared"
CURRENT="$APP_DIR/current"
SERVICE="modilish"
APP_USER="modilish"
DB_NAME="modilish"
KEEP_RELEASES=3
HEALTH_URL="http://127.0.0.1:3000/"

log() { echo "[$(date -Is)] $*"; }
psql_db() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -q -d "$DB_NAME" "$@"; }

exec 9>"$APP_DIR/.deploy.lock"
flock -n 9 || { log "another deploy is already running"; exit 0; }

want=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)
[ -n "$want" ] || { log "could not resolve $BRANCH on $REPO"; exit 1; }
have=$(cat "$CURRENT/.deployed-sha" 2>/dev/null || true)
force=0; [ "${1:-}" = "--force" ] && force=1

if [ "$force" = 0 ]; then
  [ "$have" = "$want" ] && exit 0
  [ "$(cat "$APP_DIR/.failed" 2>/dev/null || true)" = "$want" ] && exit 0
fi

log "deploying $want (live: ${have:-none})"
release="$RELEASES/${want:0:12}-$(date +%Y%m%d%H%M%S)"
mkdir -p "$release"
git init -q "$release"
git -C "$release" remote add origin "$REPO"
git -C "$release" fetch -q --depth 1 origin "$want"
git -C "$release" checkout -q --detach FETCH_HEAD
echo "$want" > "$release/.deployed-sha"

# uploads live outside the release so they survive deploys
rm -rf "$release/public/img/uploads"
ln -s "$SHARED/uploads" "$release/public/img/uploads"

on_fail() {
  log "deploy of $want FAILED — live release left untouched"
  echo "$want" > "$APP_DIR/.failed"
}
trap on_fail ERR

# schema migrations for the local database — applied once each, in filename order
psql_db -c "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())" >/dev/null
for f in "$release"/supabase/migrations/*.sql; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  if [ "$(psql_db -At -c "select 1 from schema_migrations where name = '$name'")" != "1" ]; then
    log "applying migration $name"
    psql_db -f "$f" >/dev/null
    psql_db -c "insert into schema_migrations (name) values ('$name')" >/dev/null
  fi
done
psql_db -c "notify pgrst, 'reload schema'" >/dev/null

cd "$release"
set -a; . "$SHARED/env"; set +a   # NEXT_PUBLIC_* must be present at build time
npm ci --include=dev --no-audit --no-fund
npm run build
chown -R "$APP_USER:$APP_USER" "$release"

ln -sfn "$release" "$CURRENT.tmp"
mv -T "$CURRENT.tmp" "$CURRENT"
systemctl restart "$SERVICE"

for _ in $(seq 1 30); do
  if curl -sf -o /dev/null "$HEALTH_URL"; then
    trap - ERR
    rm -f "$APP_DIR/.failed"
    log "healthy — $want is live"
    # keep the newest releases only (the live one is always the newest)
    ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

log "health check failed after restart"
systemctl status "$SERVICE" --no-pager | tail -20 || true
false
