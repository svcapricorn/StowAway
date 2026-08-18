#!/usr/bin/env bash
# Build the SPA and deploy it to S3 + CloudFront.
#
# Config (put these in ./deploy.env on the server, or export them):
#   S3_BUCKET                 e.g. stowaway-app-prod
#   CLOUDFRONT_DISTRIBUTION_ID e.g. E1ABCDEF23GHIJ
#   AWS_PROFILE / AWS_REGION  optional
#
# Usage: ./scripts/deploy-frontend.sh [--skip-build]

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f deploy.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source deploy.env
  set +a
fi

: "${S3_BUCKET:?S3_BUCKET is not set (add it to deploy.env)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID is not set (add it to deploy.env)}"

command -v aws >/dev/null || {
  echo "aws CLI not found. Install with: sudo snap install aws-cli --classic" >&2
  exit 1
}

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Installing dependencies"
  if command -v bun >/dev/null; then
    bun install
  else
    # npm ci is intentionally avoided: package-lock.json lags behind bun.lock.
    npm install
  fi

  echo "==> Building frontend"
  npm run build
fi

[[ -f dist/index.html ]] || { echo "dist/index.html missing - build failed?" >&2; exit 1; }

echo "==> Uploading hashed assets (immutable, 1 year cache)"
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --delete \
  --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"

echo "==> Uploading index.html (never cached)"
aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "==> Invalidating CloudFront"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' --output text)
echo "    invalidation: $INVALIDATION_ID"

echo "==> Waiting for invalidation to complete"
aws cloudfront wait invalidation-completed \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "==> Frontend deployed"
