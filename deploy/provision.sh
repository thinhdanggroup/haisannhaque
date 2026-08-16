#!/usr/bin/env bash
# Provision a bare server into a running haisannhaque deployment.
#
# Run from your workstation, not the server. Idempotent: safe to re-run on an
# already-provisioned host, in which case it behaves like a redeploy.
#
#   ./deploy/provision.sh                          # provision + deploy over HTTP
#   ./deploy/provision.sh --tls                    # ...then issue the LE certificate
#   ./deploy/provision.sh --host user@1.2.3.4      # target a different server
#   ./deploy/provision.sh --env-file .env.production
#
# Requires only ssh and a local env file. Nothing is installed with sudo: the
# target user's docker group membership is enough to bind :80 and :443, and
# compose v2 goes into the user's own ~/.docker/cli-plugins.
set -euo pipefail

HOST="${DEPLOY_HOST:-thinhda@110.172.28.198}"
REPO="${DEPLOY_REPO:-https://github.com/thinhdanggroup/haisannhaque.git}"
APP_DIR="${DEPLOY_APP_DIR:-haisannhaque}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_VERSION="${COMPOSE_VERSION:-v5.4.0}"
ENV_FILE="${DEPLOY_ENV_FILE:-.env.local}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-thinh.dang2@trustingsocial.com}"
WITH_TLS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tls)      WITH_TLS=1; shift ;;
    --host)     HOST="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --branch)   BRANCH="$2"; shift 2 ;;
    -h|--help)  sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."

SSH=(ssh -o BatchMode=yes -o ServerAliveInterval=30 "$HOST")

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# --- 1. Preflight -----------------------------------------------------------
step "Preflight: checking $HOST"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. It must define the Supabase keys." >&2
  exit 1
fi

for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if ! grep -qE "^${key}=.+" "$ENV_FILE"; then
    echo "error: $key is missing or empty in $ENV_FILE" >&2
    exit 1
  fi
done

"${SSH[@]}" 'true' || { echo "error: cannot ssh to the host (key auth required)" >&2; exit 1; }

"${SSH[@]}" 'set -e
  command -v docker >/dev/null || { echo "error: docker is not installed on the server" >&2; exit 1; }
  id -nG | tr " " "\n" | grep -qx docker || {
    echo "error: $USER is not in the docker group. Run: sudo usermod -aG docker $USER (then re-login)" >&2
    exit 1
  }
  command -v git >/dev/null || { echo "error: git is not installed on the server" >&2; exit 1; }
  echo "  docker: $(docker --version)"
  echo "  free disk: $(df -h / | awk "NR==2 {print \$4}")"
  echo "  free ram:  $(free -m | awk "NR==2 {print \$7\"MB available\"}")"
'

# next build is the peak-memory step and this class of VPS is often 2GB with no
# swap. Warn loudly rather than discovering it as an opaque OOM kill mid-build.
if ! "${SSH[@]}" '[ "$(free -m | awk "NR==2 {print \$2}")" -ge 3000 ] || [ "$(free -m | awk "NR==3 {print \$2}")" -gt 0 ]'; then
  echo "  warning: <3GB RAM and no swap. If 'next build' is OOM-killed, either add a"
  echo "           swapfile (needs root) or build locally — see docs/DEPLOYMENT.md."
fi

# --- 2. Compose v2 as a user CLI plugin ------------------------------------
step "Installing docker compose $COMPOSE_VERSION (no sudo)"

"${SSH[@]}" "set -e
  mkdir -p ~/.docker/cli-plugins
  if docker compose version >/dev/null 2>&1; then
    echo \"  already present: \$(docker compose version --short)\"
  else
    curl -fsSL 'https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64' \
      -o ~/.docker/cli-plugins/docker-compose
    chmod +x ~/.docker/cli-plugins/docker-compose
    echo \"  installed: \$(docker compose version --short)\"
  fi
"

# --- 3. Source checkout -----------------------------------------------------
step "Syncing $REPO ($BRANCH) to ~/$APP_DIR"

"${SSH[@]}" "set -e
  if [ -d ~/$APP_DIR/.git ]; then
    cd ~/$APP_DIR
    git fetch --quiet origin
    git checkout --quiet $BRANCH
    git reset --hard --quiet origin/$BRANCH
  else
    git clone --quiet --branch $BRANCH '$REPO' ~/$APP_DIR
    cd ~/$APP_DIR
  fi
  mkdir -p certbot/conf certbot/www
  echo \"  at \$(git log --oneline -1)\"
"

# --- 4. Secrets -------------------------------------------------------------
# Written over the ssh pipe so the values never land in a local temp file, an
# argv the process table can see, or the shell history.
step "Writing ~/$APP_DIR/.env (mode 600)"

{
  grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_INTERNAL_URL|MOMO_WEBHOOK_SECRET|VNPAY_WEBHOOK_SECRET)=' "$ENV_FILE" || true
  printf 'LETSENCRYPT_EMAIL=%s\n' "$LETSENCRYPT_EMAIL"
  # Preserve an existing ssl mode so re-provisioning never downgrades a live
  # site back to plain HTTP.
  if "${SSH[@]}" "grep -qx 'NGINX_MODE=ssl' ~/$APP_DIR/.env 2>/dev/null"; then
    printf 'NGINX_MODE=ssl\n'
  else
    printf 'NGINX_MODE=http\n'
  fi
} | "${SSH[@]}" "umask 077 && cat > ~/$APP_DIR/.env"

"${SSH[@]}" "sed -E 's/=.{8,}/=<set>/' ~/$APP_DIR/.env | sed 's/^/  /'"

# --- 5. Build and start -----------------------------------------------------
step "Building and starting the stack (this is the slow part)"

"${SSH[@]}" "cd ~/$APP_DIR && ./scripts/deploy.sh"

# --- 6. TLS -----------------------------------------------------------------
if [[ "$WITH_TLS" == "1" ]]; then
  step "Issuing the Let's Encrypt certificate"
  "${SSH[@]}" "cd ~/$APP_DIR && ./scripts/init-letsencrypt.sh"
else
  step "Skipping TLS"
  echo "  Once DNS points here, run: ./deploy/provision.sh --tls"
fi

step "Done"
echo "  http://${HOST#*@}/  is serving the app"
