#!/usr/bin/env bash
# Build and (re)start the production stack on the server.
#
#   ssh thinhda@110.172.28.198
#   cd ~/haisannhaque && ./scripts/deploy.sh
#
# Reads configuration from ./.env (never committed). Safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "error: .env is missing. Copy .env.example and fill in the Supabase keys." >&2
  exit 1
fi

# Bind-mount sources must exist first, or Docker creates them root-owned and
# certbot (running as a different uid) cannot write its challenge files.
mkdir -p certbot/conf certbot/www

COMPOSE=(docker compose -f docker-compose.prod.yml)

echo "==> Pulling latest source"
git pull --ff-only

echo "==> Building web image"
"${COMPOSE[@]}" build web

echo "==> Starting stack"
"${COMPOSE[@]}" up -d

echo "==> Waiting for the app to answer"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1/ ; then
    echo "==> Up: $("${COMPOSE[@]}" ps --services | tr '\n' ' ')"
    exit 0
  fi
  sleep 2
done

echo "error: the app did not respond on port 80 within 60s. Recent logs:" >&2
"${COMPOSE[@]}" logs --tail 50 >&2
exit 1
