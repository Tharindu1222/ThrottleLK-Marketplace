#!/usr/bin/env bash
# Production deploy from CI. Requires DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY.
# Remote layout: $DEPLOY_PATH (default /var/www/throttlelk) is a git checkout.
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY is required}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/throttlelk}"
DEPLOY_REF="${DEPLOY_REF:-main}"

KEY_FILE="$(mktemp)"
trap 'rm -f "$KEY_FILE"' EXIT
printf '%s\n' "$DEPLOY_SSH_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

SSH=(ssh -i "$KEY_FILE" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes)

"${SSH[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE
set -euo pipefail
cd "$DEPLOY_PATH"
if command -v pg_dump >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  mkdir -p backups
  pg_dump "$DATABASE_URL" | gzip > "backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
fi
git fetch origin
git checkout "$DEPLOY_REF"
git pull --ff-only origin "$DEPLOY_REF"
npm ci
npm run build
sudo systemctl reload nginx
sudo systemctl restart throttlelk-api
sudo systemctl restart throttlelk-web
REMOTE
