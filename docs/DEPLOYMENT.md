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

The box is small: **2 GB of RAM and 2 cores**, with a **2 GB swapfile** added
because `next build` runs on the server and does not fit in physical memory
alongside the running container. See [Swap](#2-add-swap-needs-root) — it is a
provisioning step, not an optimisation.

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

### 2. Add swap (needs root)

Skip this and every deploy takes the site down. `next build` peaks at roughly
1.2 GB resident while the running `web` container is already holding ~400 MB of
the 2 GB total, so without swap the kernel OOM-kills the build's TypeScript
worker, and while it thrashes towards that the box stops answering on `:443`
entirely. With swap in place the same build completes with **zero dropped
requests**.

```sh
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab   # survive reboot
```

Verify:

```sh
free -h        # Swap: total must be non-zero
swapon --show
```

### 3. Install docker compose v2 (on the server, no sudo)

Ubuntu 18.04 ships neither the compose plugin nor `docker-compose`. Install it
into the user's own plugin directory:

```sh
mkdir -p ~/.docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/download/v5.4.0/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

### 4. Check out the source (on the server)

```sh
git clone https://github.com/thinhdanggroup/haisannhaque.git ~/haisannhaque
cd ~/haisannhaque
mkdir -p certbot/conf certbot/www
```

Create the `certbot/` directories **before** starting the stack. If Docker
creates them as bind-mount targets it makes them root-owned, and certbot then
cannot write its challenge files.

### 5. Write the secrets (on the server)

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

### 6. Build and start

```sh
cd ~/haisannhaque && ./scripts/deploy.sh
```

This pulls, rebuilds `web`, starts the stack, and polls port 80 until the app
answers — failing loudly with recent logs if it doesn't. Expect the first run
to take several minutes; the base image pull and `next build` dominate. Later
builds are faster because Docker caches every layer up to `COPY . .`.

Verify before touching DNS or TLS:

```sh
curl -H "Host: haisannhaque.com" http://110.172.28.198/
curl -o /dev/null -w '%{http_code}\n' http://110.172.28.198:3000/   # must fail — not public
```

### 7. Issue the certificate

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

### 8. Point Supabase at the domain

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

The server pulls from `origin/main`, so **push first** — an unpushed local
commit will not ship. The build runs in place while the old container keeps
serving, so a redeploy is normally invisible to customers: expect a single
transient `502` in the script's own poll while the new container boots, and
nothing more. A redeploy verified with a 5-second uptime probe dropped **zero
requests** end to end. If the site actually goes unreachable for the length of
the build, that is the no-swap failure in [Troubleshooting](#troubleshooting),
not normal behaviour.

### Database migrations

`deploy.sh` does **not** run migrations. Apply them yourself, before the deploy
that depends on them, or the new code will error against an old schema:

```sh
pnpm migrate:list   # what is pending
pnpm migrate        # apply
```

There is one Supabase project shared by local development and production, so
this writes to live data.

## TLS modes

`NGINX_MODE` in `.env` selects which config directory gets mounted:

- `http` — port 80 only, plus the ACME challenge path. The state before a
  certificate exists.
- `ssl` — port 80 redirects to HTTPS, `www` redirects to the apex, HSTS on.

Renewal is automatic: the `certbot` container retries twice a day, and nginx
reloads every six hours to pick up a renewed certificate.

## Troubleshooting

**`next build` gets OOM-killed, or the site goes down mid-deploy.** Check swap
first — this is what its absence looks like:

```sh
ssh thinhda@110.172.28.198 'free -h'    # Swap: 0B means step 2 was skipped
```

The build runs on the server and peaks around 1.2 GB resident while the live
container already holds ~400 MB of the 2 GB total. With no swap the kernel
kills the build's TypeScript worker, and on the way there the box thrashes hard
enough to stop answering on `:443` for as long as the build runs. Restore swap
per [step 2](#2-add-swap-needs-root) and redeploy.

Two traps when diagnosing this:

- **`deploy.sh` can report success after the build failed.** The old container
  keeps serving, so `curl` returns 200 and nothing looks wrong. Confirm what is
  actually running rather than trusting the exit code:

  ```sh
  ssh thinhda@110.172.28.198 'cd ~/haisannhaque && git log --oneline -1 && \
    docker compose -f docker-compose.prod.yml images web'
  ```

  If the image `CREATED` column predates the deploy, the new code is not live.

- **Capping the build heap is not a fix.** `NODE_OPTIONS=--max-old-space-size`
  lets the build finish, but it does nothing about the build and the live site
  competing for the same memory, so the outage still happens. Swap addresses
  the actual constraint.

If you cannot get root on the host, build the image elsewhere and ship it. Note
this needs a machine whose Docker containers can reach `registry.npmjs.org`,
which a sandboxed environment often cannot:

```sh
set -a; . ./.env.local; set +a          # keeps the keys off the command line
docker build -t haisannhaque-web:latest . \
  --build-arg NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg SUPABASE_SERVICE_ROLE_KEY
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
