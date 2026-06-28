#!/usr/bin/env bash

set -u
set -o pipefail

SEPARATOR="======================================"
PM2_APP_NAME="${PM2_APP_NAME:-the-business-circle-network}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-${APP_URL:-${NEXTAUTH_URL:-https://thebusinesscircle.net}}}"
START_TIME=$SECONDS
DEPLOYMENT_WARNING=false

print_step() {
  printf '\nSTEP %s — %s\n' "$1" "$2"
  printf '%s\n' "--------------------------------------"
}

abort() {
  printf '\n%s\n' "$1" >&2
  exit "${2:-1}"
}

ask_yes_no() {
  local prompt="$1"
  local reply

  while true; do
    if ! read -r -p "$prompt (y/n) " reply; then
      printf '\nNo response received. Deployment cancelled.\n' >&2
      return 1
    fi

    case "$reply" in
      [Yy]|[Yy][Ee][Ss]) return 0 ;;
      [Nn]|[Nn][Oo]) return 1 ;;
      *) printf 'Please answer y or n.\n' ;;
    esac
  done
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    abort "Required command not found: $1"
  fi
}

for command_name in git npm npx node pm2 curl; do
  require_command "$command_name"
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  abort "Run this deployment assistant from inside the project Git repository."
fi

INITIAL_BRANCH="$(git branch --show-current)"
if [[ -z "$INITIAL_BRANCH" ]]; then
  INITIAL_BRANCH="DETACHED HEAD"
fi
INITIAL_COMMIT="$(git rev-parse --short HEAD)"

printf '%s\n' "$SEPARATOR"
printf '%s\n' "Circle Card Deployment Assistant"
printf '%s\n' "$SEPARATOR"
printf 'Date:   %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
printf 'Branch: %s\n' "$INITIAL_BRANCH"
printf 'Commit: %s\n' "$INITIAL_COMMIT"

print_step 1 "Check Git status"

GIT_STATUS="$(git status --short)"
if [[ -n "$GIT_STATUS" ]]; then
  printf 'WARNING: Local changes exist:\n%s\n' "$GIT_STATUS"
  if ! ask_yes_no "Continue deployment?"; then
    abort "Deployment cancelled. No changes were made."
  fi
else
  printf '%s\n' "Git working tree is clean."
fi

PRE_PULL_COMMIT="$(git rev-parse HEAD)"

print_step 2 "Pull latest code"

if ! PULL_OUTPUT="$(git pull --ff-only 2>&1)"; then
  printf '%s\n' "$PULL_OUTPUT" >&2
  abort "GIT PULL FAILED"
fi

POST_PULL_COMMIT="$(git rev-parse HEAD)"
if [[ "$PRE_PULL_COMMIT" == "$POST_PULL_COMMIT" ]]; then
  printf '%s\n' "Already up to date"
else
  printf '%s\n' "✓ Git updated"
fi

print_step 3 "Install packages"

DEPENDENCIES_CHANGED=false
if ! git diff --quiet "$PRE_PULL_COMMIT" "$POST_PULL_COMMIT" -- package.json package-lock.json; then
  DEPENDENCIES_CHANGED=true
fi
if [[ -n "$(git status --porcelain -- package.json package-lock.json)" ]]; then
  DEPENDENCIES_CHANGED=true
fi

if [[ "$DEPENDENCIES_CHANGED" == true ]]; then
  printf '%s\n' "Dependency files changed. Running npm install..."
  if ! npm install; then
    abort "PACKAGE INSTALL FAILED"
  fi
  printf '%s\n' "✓ Packages installed"
else
  printf '%s\n' "No dependency changes detected."
fi

print_step 4 "Generate Prisma client and inspect migrations"

if ! npx prisma generate; then
  abort "PRISMA GENERATE FAILED"
fi
printf '%s\n' "✓ Prisma client generated"

MIGRATION_FILES_CHANGED=false
MIGRATIONS_REQUIRED=false
MIGRATION_STATUS_KNOWN=false
MIGRATION_RESULT="Not required"
MIGRATION_PATHSPEC=':(glob)prisma/migrations/*/migration.sql'

if ! git diff --quiet "$PRE_PULL_COMMIT" "$POST_PULL_COMMIT" -- "$MIGRATION_PATHSPEC"; then
  MIGRATION_FILES_CHANGED=true
fi
if [[ -n "$(git status --porcelain -- "$MIGRATION_PATHSPEC")" ]]; then
  MIGRATION_FILES_CHANGED=true
fi

MIGRATION_STATUS_OUTPUT="$(npx prisma migrate status 2>&1)"
MIGRATION_STATUS_CODE=$?

if grep -Eiq 'database schema is up to date|no pending migrations' <<<"$MIGRATION_STATUS_OUTPUT"; then
  MIGRATION_STATUS_KNOWN=true
elif grep -Eiq 'not yet been applied|pending migration|have not been applied' <<<"$MIGRATION_STATUS_OUTPUT"; then
  MIGRATION_STATUS_KNOWN=true
  MIGRATIONS_REQUIRED=true
elif [[ $MIGRATION_STATUS_CODE -eq 0 ]]; then
  MIGRATION_STATUS_KNOWN=true
fi

if [[ "$MIGRATION_FILES_CHANGED" == true ]]; then
  MIGRATIONS_REQUIRED=true
fi

if [[ "$MIGRATION_STATUS_KNOWN" == false ]]; then
  DEPLOYMENT_WARNING=true
  printf 'WARNING: Prisma could not determine migration status.\n%s\n' "$MIGRATION_STATUS_OUTPUT" >&2
fi

if [[ "$MIGRATIONS_REQUIRED" == true ]]; then
  if ask_yes_no "Apply database migrations?"; then
    if ! npx prisma migrate deploy; then
      abort "DATABASE MIGRATION FAILED"
    fi
    MIGRATION_RESULT="Applied"
    printf '%s\n' "✓ Database migrations applied"
  else
    MIGRATION_RESULT="Skipped by operator"
    DEPLOYMENT_WARNING=true
    printf '%s\n' "WARNING: Database migrations were not applied."
  fi
elif [[ "$MIGRATION_STATUS_KNOWN" == true ]]; then
  printf '%s\n' "No database migrations required."
else
  MIGRATION_RESULT="Status unavailable"
  printf '%s\n' "Database migration requirement could not be confirmed."
fi

print_step 5 "Build"

if ! npm run build; then
  printf '\n%s\n' "BUILD FAILED" >&2
  printf '%s\n' "PM2 was not restarted." >&2
  exit 1
fi
BUILD_RESULT="Success"
printf '%s\n' "✓ Build Successful"

print_step 6 "Restart"

if ! pm2 restart "$PM2_APP_NAME"; then
  abort "PM2 RESTART FAILED"
fi
if ! pm2 save; then
  abort "PM2 SAVE FAILED"
fi
printf '%s\n' "✓ PM2 restarted and saved"

print_step 7 "Health checks"

PM2_RESULT="Not running"
WEBSITE_RESULT="Offline"
DATABASE_RESULT="Unavailable"

if pm2 jlist 2>/dev/null | node -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    try {
      const processes = JSON.parse(input);
      const name = process.argv[1];
      const matching = processes.filter(process => process.name === name);
      const online = matching.length > 0 && matching.every(process =>
        process.pm2_env && process.pm2_env.status === "online"
      );
      process.exit(online ? 0 : 1);
    } catch {
      process.exit(1);
    }
  });
' "$PM2_APP_NAME"; then
  PM2_RESULT="Running"
  printf '%s\n' "✓ PM2 Running"
else
  DEPLOYMENT_WARNING=true
  printf '%s\n' "WARNING: PM2 process '$PM2_APP_NAME' is not online." >&2
fi

for attempt in {1..10}; do
  if curl --fail --silent --location --max-time 10 --output /dev/null "$HEALTHCHECK_URL"; then
    WEBSITE_RESULT="Online"
    break
  fi
  if [[ $attempt -lt 10 ]]; then
    sleep 3
  fi
done

if [[ "$WEBSITE_RESULT" == "Online" ]]; then
  printf '%s\n' "✓ Website Online"
else
  DEPLOYMENT_WARNING=true
  printf '%s\n' "WARNING: Website health check failed: $HEALTHCHECK_URL" >&2
fi

if printf 'SELECT 1;\n' | npx prisma db execute --stdin >/dev/null 2>&1; then
  DATABASE_RESULT="Connected"
  printf '%s\n' "✓ Database Connected"
else
  DEPLOYMENT_WARNING=true
  printf '%s\n' "WARNING: Database connection health check failed." >&2
fi

printf '%s\n' "✓ Build Successful"

FINAL_BRANCH="$(git branch --show-current)"
if [[ -z "$FINAL_BRANCH" ]]; then
  FINAL_BRANCH="DETACHED HEAD"
fi
FINAL_COMMIT="$(git rev-parse --short HEAD)"
ELAPSED_TIME=$((SECONDS - START_TIME))

print_step 8 "Summary"

printf '%s\n\n' "$SEPARATOR"
if [[ "$DEPLOYMENT_WARNING" == true ]]; then
  printf '%s\n\n' "Deployment Completed with Warnings"
else
  printf '%s\n\n' "Deployment Successful"
fi
printf 'Branch:\n%s\n\n' "$FINAL_BRANCH"
printf 'Commit:\n%s\n\n' "$FINAL_COMMIT"
printf 'Build:\n%s\n\n' "$BUILD_RESULT"
printf 'Migrations:\n%s\n\n' "$MIGRATION_RESULT"
printf 'PM2:\n%s\n\n' "$PM2_RESULT"
printf 'Website:\n%s\n\n' "$WEBSITE_RESULT"
printf 'Database:\n%s\n\n' "$DATABASE_RESULT"
printf 'Time:\n%s seconds\n\n' "$ELAPSED_TIME"
printf '%s\n' "$SEPARATOR"

if [[ "$DEPLOYMENT_WARNING" == true ]]; then
  exit 1
fi
