# Deployment

Production runs on a single VPS (`110.172.28.198`) as a three-container Docker
Compose stack behind nginx. Supabase is the hosted cloud project — nothing
stateful lives on the server, so the box is disposable and can be rebuilt from
this document in about fifteen minutes.

| Service   | Image                   | Role                                                     |
| --------- | ----------------------- | -------------------------------------------------------- |
| `web`     | built from `Dockerfile` | Next.js on `:3000`, reachable only on the Docker network |
| `nginx`   | `nginx:1.27-alpine`     | Terminates `:80`/`:443`, proxies to `web`, serves ACME   |
| `certbot` | `certbot/certbot`       | Issues and renews the Let's Encrypt certificate           |

`web` is deliberately never published to the host, so nginx is the only ingress.

## Choose a path

| Path                       | Use when                                           |
| -------------------------- | -------------------------------------------------- |
| `deploy/provision.sh`      | Default. No dependencies beyond `ssh`.             |
| `deploy/ansible/`          | You want declarative state. Needs `ansible-core<2.17` — see its README. |
| Manual steps below         | Debugging, or provisioning a host by hand.         |

All three do the same work. Start here:

```sh
./deploy/provision.sh              # provision + deploy over HTTP
./deploy/provision.sh --tls        # ...and issue the certificate (DNS must be pointed first)
```

---

## Step by step

What `provision.sh` automates, written out. Run these from your workstation
unless a step says otherwise.

### 0. Prerequisites

On the **server**, one time only, as a user with root:

```sh
sudo usermod -aG docker "$USER"   # then log out and back in
```

That group membership is what makes the rest of this sudo-free. Verify with
`docker info` — if it prints a server version, you're set.

Also confirm `docker` and `git` are installed. Everything else is installed
per-user by the steps below.

### 1. Point DNS at the server

Set **A records** for both the apex and `www` to the server's public IP:

```
haisannhaque.com.       A   110.172.28.198
www.haisannhaque.com.   A   110.172.28.198
```

Do this first — propagation takes time, and Let's Encrypt cannot issue a
certificate until the http-01 challenge reaches this server. Verify:

```sh
dig +short haisannhaque.com A
```

Deploying before DNS is ready is fine; the site simply serves on the raw IP
until you come back and run the TLS step.

### 2. Install docker compose v2 (on the server, no sudo)

Ubuntu 18.04 ships neither the compose plugin nor `docker-compose`. Install it
into the user's own plugin directory:

```sh
mkdir -p ~/.docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/download/v5.4.0/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

### 3. Check out the source (on the server)

```sh
git clone https://github.com/thinhdanggroup/haisannhaque.git ~/haisannhaque
cd ~/haisannhaque
mkdir -p certbot/conf certbot/www
```

Create the `certbot/` directories **before** starting the stack. If Docker
creates them as bind-mount targets it makes them root-owned, and certbot then
cannot write its challenge files.

### 4. Write the secrets (on the server)

```sh
umask 077
cat > ~/haisannhaque/.env <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_INTERNAL_URL=https://xxxxxxxx.supabase.co
NGINX_MODE=http
LETSENCRYPT_EMAIL=you@example.com
EOF
chmod 600 ~/haisannhaque/.env
```

`.env` is gitignored and is the only place production secrets live.

`NEXT_PUBLIC_*` values are baked into the client bundle **at build time**, so
changing one requires a rebuild, not just a restart.

### 5. Build and start

```sh
cd ~/haisannhaque && ./scripts/deploy.sh
```

This pulls, rebuilds `web`, starts the stack, and polls port 80 until the app
answers — failing loudly with recent logs if it doesn't. Expect the first run
to take several minutes; the base image pull and `next build` dominate.

Verify before touching DNS or TLS:

```sh
curl -H "Host: haisannhaque.com" http://110.172.28.198/
curl -o /dev/null -w '%{http_code}\n' http://110.172.28.198:3000/   # must fail — not public
```

### 6. Issue the certificate

Only once `dig` shows the domain resolving to this server:

```sh
cd ~/haisannhaque && ./scripts/init-letsencrypt.sh
```

The script refuses to spend an attempt unless DNS already resolves here *and*
it can fetch a token it just wrote through `http://haisannhaque.com/.well-known/`.
Failed Let's Encrypt attempts are rate-limited, so it checks rather than hopes.

On success it flips `NGINX_MODE` to `ssl` in `.env` and recreates nginx.

```sh
./scripts/init-letsencrypt.sh --staging   # rehearse against the staging CA
./scripts/init-letsencrypt.sh --force     # reissue before expiry
```

### 7. Point Supabase at the domain

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://haisannhaque.com`
- **Redirect URLs**: add `https://haisannhaque.com/**`

Auth callbacks and password-reset links otherwise keep pointing at localhost.
This is not automated — it's dashboard state, not repo state.

---

## Redeploying

```sh
ssh thinhda@110.172.28.198 'cd ~/haisannhaque && ./scripts/deploy.sh'
```

or `./deploy/provision.sh`, which is idempotent and does the same thing plus
re-verifies the prerequisites.

## TLS modes

`NGINX_MODE` in `.env` selects which config directory gets mounted:

- `http` — port 80 only, plus the ACME challenge path. The state before a
  certificate exists.
- `ssl` — port 80 redirects to HTTPS, `www` redirects to the apex, HSTS on.

Renewal is automatic: the `certbot` container retries twice a day, and nginx
reloads every six hours to pick up a renewed certificate.

## Troubleshooting

**`next build` gets OOM-killed.** The VPS has 2 GB RAM and no swap, and the
build is the peak-memory step. Either add a swapfile (needs root) or build the
image locally and ship it:

```sh
docker build -t haisannhaque-web:latest . \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg SUPABASE_SERVICE_ROLE_KEY=...
docker save haisannhaque-web:latest | gzip | \
  ssh thinhda@110.172.28.198 'gunzip | docker load'
ssh thinhda@110.172.28.198 'cd ~/haisannhaque && docker compose -f docker-compose.prod.yml up -d --no-build'
```

**nginx won't start after enabling TLS.** It refuses to load an
`ssl_certificate` path that doesn't exist. Set `NGINX_MODE=http` in `.env`,
`docker compose -f docker-compose.prod.yml up -d --force-recreate nginx`, then
work out why issuance failed.

**Certificate issuance fails.** Almost always DNS, or port 80 blocked upstream.
Rehearse with `--staging` — the staging CA has far looser rate limits.

**Images 500 or fail to optimize.** `pnpm-workspace.yaml` must be copied into
the Dockerfile's `deps` and `runner` stages; without it pnpm 10 skips `sharp`'s
build script and `next/image` breaks at runtime.

## Logs

```sh
cd ~/haisannhaque
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs --tail 100 nginx certbot
docker compose -f docker-compose.prod.yml ps
```
