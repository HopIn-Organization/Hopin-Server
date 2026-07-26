#!/usr/bin/env bash
# Run this directly on the production machine (over SSH, or from a cron/systemd
# timer) to deploy the latest main. Requires a production .env already sitting
# in the repo root (see DEPLOYMENT.md) — this script never writes secrets, it
# only reads that file.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env in $(pwd) — create it from .env.example with production values first (see DEPLOYMENT.md)." >&2
  exit 1
fi

echo "==> Pulling latest "
git fetch origin prepare-prod
git checkout prepare-prod
git pull --ff-only origin prepare-prod

echo "==> Installing dependencies"
npm ci

echo "==> Lint"
npm run lint

echo "==> Build TypeScript (fail fast before touching prod)"
npm run build

echo "==> Running database migrations"
npm run migration:run

echo "==> Preserving previous image for rollback"
docker tag hopin-server:latest hopin-server:previous 2>/dev/null || true

SHA="$(git rev-parse --short HEAD)"
echo "==> Building Docker image ($SHA)"
docker build -t "hopin-server:$SHA" -t hopin-server:latest .

echo "==> Stopping previous container"
docker stop hopin-server 2>/dev/null || true
docker rm hopin-server 2>/dev/null || true

echo "==> Starting new container"
docker run -d \
  --name hopin-server \
  --network host \
  --env-file .env \
  --restart unless-stopped \
  "hopin-server:$SHA"

echo "==> Waiting for health check"
PORT_TO_CHECK="$(grep -E '^PORT=' .env | cut -d= -f2)"
PORT_TO_CHECK="${PORT_TO_CHECK:-3000}"
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:${PORT_TO_CHECK}/health" >/dev/null; then
    echo "Server is healthy"
    exit 0
  fi
  echo "Waiting for server to become healthy... ($i/15)"
  sleep 2
done

echo "Server failed health check after deploy — rolling back" >&2
docker logs --tail 100 hopin-server || true
docker stop hopin-server 2>/dev/null || true
docker rm hopin-server 2>/dev/null || true
docker run -d \
  --name hopin-server \
  --network host \
  --env-file .env \
  --restart unless-stopped \
  hopin-server:previous || true
exit 1
