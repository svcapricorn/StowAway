#!/usr/bin/env bash
# Full production deploy: pull latest code, then redeploy the API (pm2) and the
# frontend (S3 + CloudFront) SIMULTANEOUSLY.
#
# Usage:
#   ./scripts/deploy.sh                  # pull, then API + frontend in parallel
#   ./scripts/deploy.sh --api-only
#   ./scripts/deploy.sh --frontend-only
#   ./scripts/deploy.sh --no-pull
#   ./scripts/deploy.sh --skip-build     # upload existing dist/ (built elsewhere)
#   ./scripts/deploy.sh --sequential     # run API then frontend one at a time
#
# Logs from each half are streamed with an [api] / [web] prefix and also saved to
# /tmp/stowaway-deploy-{api,web}.log.

set -euo pipefail

cd "$(dirname "$0")/.."

MODE="all"
PULL=1
PARALLEL=1
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --api-only) MODE="api" ;;
    --frontend-only) MODE="frontend" ;;
    --no-pull) PULL=0 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --sequential|--serial) PARALLEL=0 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

API_LOG=/tmp/stowaway-deploy-api.log
WEB_LOG=/tmp/stowaway-deploy-web.log

if [[ $PULL -eq 1 ]]; then
  echo "==> Pulling latest code"
  git pull --ff-only
fi

run_api() {
  ./scripts/deploy-api.sh
}

run_web() {
  if [[ $SKIP_BUILD -eq 1 ]]; then
    ./scripts/deploy-frontend.sh --skip-build
  else
    ./scripts/deploy-frontend.sh
  fi
}

if [[ "$MODE" == "api" ]]; then
  run_api
  echo "==> Deploy complete (api only)"
  exit 0
fi

if [[ "$MODE" == "frontend" ]]; then
  run_web
  echo "==> Deploy complete (frontend only)"
  exit 0
fi

if [[ $PARALLEL -eq 0 ]]; then
  run_api
  run_web
  echo "==> Deploy complete"
  exit 0
fi

echo "==> Deploying API and frontend in parallel"

run_api >"$API_LOG" 2>&1 &
API_PID=$!
run_web >"$WEB_LOG" 2>&1 &
WEB_PID=$!

# Stream both logs live with prefixes.
tail -n +1 -f "$API_LOG" | sed -u 's/^/[api] /' &
TAIL_API=$!
tail -n +1 -f "$WEB_LOG" | sed -u 's/^/[web] /' &
TAIL_WEB=$!

API_STATUS=0
WEB_STATUS=0
wait "$API_PID" || API_STATUS=$?
wait "$WEB_PID" || WEB_STATUS=$?

sleep 1
kill "$TAIL_API" "$TAIL_WEB" 2>/dev/null || true

echo
if [[ $API_STATUS -ne 0 ]]; then
  echo "!! API deploy failed (exit $API_STATUS) - full log: $API_LOG" >&2
else
  echo "   API deployed"
fi
if [[ $WEB_STATUS -ne 0 ]]; then
  echo "!! Frontend deploy failed (exit $WEB_STATUS) - full log: $WEB_LOG" >&2
else
  echo "   Frontend deployed"
fi

if [[ $API_STATUS -ne 0 || $WEB_STATUS -ne 0 ]]; then
  exit 1
fi

echo "==> Deploy complete"
