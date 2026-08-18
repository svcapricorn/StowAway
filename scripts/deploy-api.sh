#!/usr/bin/env bash
# Build and restart the Express API on this Lightsail instance (pm2).
#
# Usage: ./scripts/deploy-api.sh

set -euo pipefail

cd "$(dirname "$0")/../server"

ENV_FILE="${STOWAWAY_ENV_FILE:-/etc/stowaway.env}"
PM2_APP="${PM2_APP_NAME:-stowaway-api}"

echo "==> Installing server dependencies"
npm install --include=dev

echo "==> Building server"
npm run build

if [[ -f "$ENV_FILE" ]]; then
  echo "==> Loading runtime env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "!! $ENV_FILE not found - restarting with existing pm2 env" >&2
fi

echo "==> Restarting $PM2_APP"
pm2 restart "$PM2_APP" --update-env
pm2 save

echo "==> Health check"
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:${PORT:-3001}/health" >/dev/null; then
    echo "    API healthy"
    exit 0
  fi
  sleep 1
done

echo "!! API did not answer /health - check: pm2 logs $PM2_APP --lines 50" >&2
exit 1
