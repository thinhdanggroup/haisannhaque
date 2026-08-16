# Deployment

Production runs on a single VPS (`110.172.28.198`) as a three-container Docker
Compose stack. Supabase is the hosted cloud project — nothing stateful runs on
the server, so the box is disposable.

| Service   | Image                       | Role                                                  |
| --------- | --------------------------- | ----------------------------------------------------- |
| `web`     | built from `Dockerfile`     | Next.js on `:3000`, reachable only on the Docker network |
| `nginx`   | `nginx:1.27-alpine`         | Terminates `:80`/`:443`, proxies to `web`, serves ACME |
| `certbot` | `certbot/certbot`           | Issues and renews the Let's Encrypt certificate        |

`web` is never published to the host, so the app cannot be reached except
through nginx.

## Layout on the server

```
~/haisannhaque/          # git clone of this repo
  .env                   # secrets, mode 600, never committed
  certbot/conf/          # Let's Encrypt state (certificates, account key)
  certbot/www/           # ACME http-01 challenge webroot
~/.docker/cli-plugins/docker-compose   # compose v2, installed per-user
```

Everything runs as the `thinhda` user via its `docker` group membership — no
`sudo` is required for any part of the deploy.

## Redeploying

```sh
ssh thinhda@110.172.28.198
cd ~/haisannhaque && ./scripts/deploy.sh
```

`deploy.sh` pulls, rebuilds `web`, restarts the stack, and polls port 80 until
the app answers. It fails loudly with recent logs if it doesn't.

## TLS

`NGINX_MODE` in `.env` selects which nginx config gets mounted:

- `http` — port 80 only, plus the ACME challenge path. The state before a
  certificate exists.
- `ssl` — port 80 redirects to HTTPS, `www` redirects to the apex, HSTS on.

`scripts/init-letsencrypt.sh` moves you from the first to the second. It
refuses to spend a Let's Encrypt attempt unless DNS already points here and the
challenge path is provably reachable, because failed attempts are rate-limited.

```sh
cd ~/haisannhaque && ./scripts/init-letsencrypt.sh
# --staging to rehearse against the Let's Encrypt staging CA
# --force    to reissue before expiry
```

Renewal is automatic: the `certbot` container retries twice a day and nginx
reloads every six hours to pick up a new certificate.

## Environment

`.env` on the server is the only place production secrets live. Required:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LETSENCRYPT_EMAIL=
NGINX_MODE=http
```

`NEXT_PUBLIC_*` values are baked into the client bundle at build time, so
changing them requires a rebuild, not just a restart.

## Constraints worth remembering

The VPS has **2 GB RAM and no swap**, and `next build` is the peak-memory step.
If a build gets OOM-killed, either add a swapfile (needs root) or build the
image locally and ship it:

```sh
docker build -t web-store:latest . \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=...
docker save web-store:latest | gzip | ssh thinhda@110.172.28.198 'gunzip | docker load'
```
