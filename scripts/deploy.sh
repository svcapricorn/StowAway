#!/usr/bin/env bash
# Full production deploy: pull latest code, redeploy API (pm2) and frontend (S3 + CloudFront).
#
# Usage: ./scripts/deploy.sh [--api-only|--frontend-only|--no-pull]

set -euo pipefail

cd "$(dirname "$0")/.."

MODE="all"
PULL=1
for arg in "$@"; do
  case "$arg" in
    --api-only) MODE="api" ;;
    --frontend-only) MODE="frontend" ;;
    --no-pull) PULL=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ $PULL -eq 1 ]]; then
  echo "==> Pulling latest code"
  git pull --ff-only
fi

if [[ "$MODE" == "all" || "$MODE" == "api" ]]; then
  ./scripts/deploy-api.sh
fi

if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
  ./scripts/deploy-frontend.sh
fi

echo "==> Deploy complete"
