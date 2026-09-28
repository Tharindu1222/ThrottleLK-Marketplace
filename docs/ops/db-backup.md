# Postgres backup and restore

ThrottleLK stores listings, users, and sessions in Postgres. Take backups
**before** every production deploy and on a daily schedule.

## What to back up

- Primary database (`POSTGRES_DB`, default `throttlelk`)
- Do not back up Redis (cache only)

## Manual dump (from a host that can reach Postgres)

```bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="throttlelk-${STAMP}.dump"
pg_dump --format=custom --no-owner --file "$FILE" "$DATABASE_URL"
sha256sum "$FILE" > "$FILE.sha256"
```

Copy `$FILE` and `$FILE.sha256` off the box (object storage or another region).
Keep at least 14 daily dumps plus one dump from before the last schema migration.

## Restore (staging first)

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" throttlelk-YYYYMMDDTHHMMSSZ.dump
```

Confirm `users`, `listings`, and `refresh_sessions` row counts before pointing
production DNS at a restored instance.

## Cron (example)

```
15 2 * * * /usr/local/bin/throttlelk-pg-dump.sh
```

The dump script should fail the job (non-zero exit) if `pg_dump` or the upload
step fails. Do not treat a missing dump as success.

## After a restore

1. Rotate JWT secrets if the dump may have left the box.
2. Ask users with active sessions to sign in again if refresh sessions were truncated.
3. Smoke-check login, sell draft, and image upload.
