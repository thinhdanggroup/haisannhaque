#!/usr/bin/env bash
# Issue the first Let's Encrypt certificate and switch nginx into TLS mode.
#
# Prerequisites:
#   - the stack is already running in http mode (./scripts/deploy.sh)
#   - A records for haisannhaque.com AND www point at this server's public IP
#
# Re-running is harmless: certbot skips issuance if a live cert already exists
# unless you pass --force.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DOMAIN="${LETSENCRYPT_DOMAIN:-haisannhaque.com}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
STAGING="${LETSENCRYPT_STAGING:-0}"
FORCE=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE="--force-renewal" ;;
    --staging) STAGING=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "$EMAIL" ]]; then
  echo "error: set LETSENCRYPT_EMAIL in .env (used for expiry notices)." >&2
  exit 1
fi

COMPOSE=(docker compose -f docker-compose.prod.yml)

# Fail fast on the most common cause of a failed http-01 challenge: DNS that
# still points somewhere else. Let's Encrypt rate-limits failures, so it is
# worth checking before spending an attempt.
SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org)"
echo "==> This server is $SERVER_IP"
for host in "$DOMAIN" "www.$DOMAIN"; do
  resolved="$(getent ahostsv4 "$host" | awk '{print $1}' | sort -u | tr '\n' ' ')"
  echo "==> $host resolves to: ${resolved:-<nothing>}"
  if [[ " $resolved " != *" $SERVER_IP "* ]]; then
    echo "error: $host does not resolve to $SERVER_IP yet. Update the A record and wait for propagation." >&2
    exit 1
  fi
done

# Prove the challenge path is actually reachable through nginx before asking
# Let's Encrypt to try it.
echo "==> Verifying the ACME challenge path is served"
mkdir -p certbot/www/.well-known/acme-challenge
token="preflight-$$"
echo "$token" > "certbot/www/.well-known/acme-challenge/$token"
if [[ "$(curl -fsS --max-time 10 "http://$DOMAIN/.well-known/acme-challenge/$token" || true)" != "$token" ]]; then
  rm -f "certbot/www/.well-known/acme-challenge/$token"
  echo "error: http://$DOMAIN/.well-known/acme-challenge/ is not reachable. Is port 80 open and nginx running in http mode?" >&2
  exit 1
fi
rm -f "certbot/www/.well-known/acme-challenge/$token"

staging_flag=""
[[ "$STAGING" == "1" ]] && staging_flag="--staging"

echo "==> Requesting certificate for $DOMAIN and www.$DOMAIN"
"${COMPOSE[@]}" run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --non-interactive $staging_flag $FORCE

echo "==> Switching nginx to TLS mode"
if grep -q '^NGINX_MODE=' .env; then
  sed -i 's|^NGINX_MODE=.*|NGINX_MODE=ssl|' .env
else
  echo 'NGINX_MODE=ssl' >> .env
fi

"${COMPOSE[@]}" up -d --force-recreate nginx

echo "==> Verifying HTTPS"
sleep 3
curl -fsS -o /dev/null -w '%{http_code} via %{scheme}\n' "https://$DOMAIN/"
echo "==> Done. Renewal runs automatically in the certbot container."
