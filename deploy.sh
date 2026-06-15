#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/root/eyzencore-new}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
PM2_APP="${PM2_APP:-eyzencore-new}"
PORT="${PORT:-3001}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/eyzencore}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_path="${BACKUP_DIR}/${timestamp}"
previous_commit=""
database_path=""
release_activated=0
app_was_running=0

log() {
  printf '\n\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"
}

fail() {
  printf '\n\033[1;31mDeploy failed:\033[0m %s\n' "$*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  printf '\n\033[1;31mDeploy stopped on line %s (exit %s).\033[0m\n' "${BASH_LINENO[0]}" "$exit_code" >&2
  if [[ "$release_activated" -eq 0 && -n "$previous_commit" && -d "$APP_DIR/.git" ]]; then
    printf 'Rolling back code to %s...\n' "$previous_commit" >&2
    cd "$APP_DIR"
    git reset --hard "$previous_commit" >&2 || true
    if [[ -n "$database_path" && -f "$backup_path/$(basename "$database_path")" ]]; then
      cp "$backup_path/$(basename "$database_path")" "$database_path" || true
    fi
    if [[ "$app_was_running" -eq 1 ]]; then
      PORT="$PORT" pm2 restart "$PM2_APP" --update-env >&2 || true
    fi
  fi
  exit "$exit_code"
}
trap on_error ERR

command -v git >/dev/null || fail "git is not installed"
command -v npm >/dev/null || fail "npm is not installed"
command -v pm2 >/dev/null || fail "pm2 is not installed"
command -v curl >/dev/null || fail "curl is not installed"

[[ -d "$APP_DIR/.git" ]] || fail "$APP_DIR is not a Git repository"
cd "$APP_DIR"
[[ -f .env ]] || fail "$APP_DIR/.env is missing"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "Tracked files have local changes. Commit or restore them before deploy."
fi

previous_commit="$(git rev-parse HEAD)"
database_url="$(grep -E '^DATABASE_URL=' .env | tail -n 1 | cut -d= -f2-)"
database_url="${database_url%\"}"
database_url="${database_url#\"}"
database_url="${database_url%\'}"
database_url="${database_url#\'}"
if [[ "$database_url" == file:* ]]; then
  database_path="${database_url#file:}"
  if [[ "$database_path" != /* ]]; then
    database_path="$APP_DIR/${database_path#./}"
  fi
fi

log "Creating backup"
mkdir -p "$backup_path"
cp .env "$backup_path/.env"
if [[ -n "$database_path" && -f "$database_path" ]]; then
  cp "$database_path" "$backup_path/$(basename "$database_path")"
fi
if [[ -d public/uploads ]]; then
  tar -czf "$backup_path/uploads.tar.gz" public/uploads
fi
printf '%s\n' "$previous_commit" > "$backup_path/commit.txt"

log "Fetching ${REMOTE}/${BRANCH}"
git fetch --prune "$REMOTE"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

log "Installing dependencies"
npm ci

log "Generating Prisma client"
npm run db:generate

if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  app_was_running=1
  log "Stopping application to unlock SQLite"
  pm2 stop "$PM2_APP"
fi

log "Applying database migrations"
npm run db:deploy

log "Running typecheck"
npm run typecheck

log "Building production bundle"
npm run build

log "Starting application with PM2"
release_activated=1
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  PORT="$PORT" pm2 restart "$PM2_APP" --update-env
else
  PORT="$PORT" pm2 start npm --name "$PM2_APP" --cwd "$APP_DIR" -- start
fi
pm2 save

log "Waiting for health check"
healthy=0
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
  pm2 logs "$PM2_APP" --lines 60 --nostream || true
  fail "Health check failed: $HEALTH_URL"
fi

log "Removing old backups"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | awk -v keep="$KEEP_BACKUPS" 'NR > keep { sub(/^[^ ]+ /, ""); print }' \
  | xargs -r rm -rf --

new_commit="$(git rev-parse --short HEAD)"
log "Deploy completed successfully"
printf 'Commit: %s\nURL: %s\nBackup: %s\n' "$new_commit" "$HEALTH_URL" "$backup_path"
