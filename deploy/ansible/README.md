# Ansible deployment

Equivalent to `deploy/provision.sh`, for people who would rather express the
server state declaratively. Both paths produce the same result; pick one.

## Version constraint — read this first

The production server runs **Ubuntu 18.04 with Python 3.6.5**. `ansible-core`
2.17 and newer require Python ≥3.7 on the *target*, so a stock
`pip install ansible` will fail against this host with a cryptic interpreter
error. Pin the control-node version:

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install 'ansible-core>=2.16,<2.17'
```

If that pin ever becomes untenable, use `deploy/provision.sh` instead — it has
no Python dependency on either side. The long-term fix is rebuilding the server
on a supported Ubuntu LTS.

## Secrets

The playbook refuses to run without the Supabase credentials. Keep them in an
encrypted vars file, never in the inventory:

```sh
ansible-vault create group_vars/web/vault.yml
```

```yaml
supabase_url: https://xxxxxxxx.supabase.co
supabase_anon_key: eyJ...
supabase_service_role_key: eyJ...
```

`group_vars/` is gitignored alongside the other secret paths.

## Running it

```sh
# Provision + deploy over HTTP. Safe to re-run; it is the redeploy path too.
ansible-playbook -i inventory.ini site.yml --ask-vault-pass

# Issue the Let's Encrypt certificate. Only after DNS points at the server.
ansible-playbook -i inventory.ini site.yml --ask-vault-pass --tags tls
```

The TLS task carries the `never` tag, so an ordinary run cannot accidentally
spend one of Let's Encrypt's rate-limited issuance attempts. You have to ask
for it.

## What it does

1. Asserts the deploy user can reach the Docker daemon (`docker info` — the
   socket permission is what matters, not whether the binary exists).
2. Warns if the host has <3 GB RAM and no swap, the condition under which
   `next build` gets OOM-killed.
3. Installs compose v2 into `~/.docker/cli-plugins/` — user-local, no `become`.
4. Checks out the repo to `~/haisannhaque`.
5. Creates the `certbot/` bind-mount directories *before* the stack starts, so
   Docker doesn't create them root-owned.
6. Templates `.env` at mode 0600, preserving `NGINX_MODE=ssl` if TLS is already
   live so a re-run never downgrades the site to plain HTTP.
7. Builds and starts the stack, then polls port 80 until the app answers.

`become` is never used. Docker runs as root, which is what lets the nginx
container bind :80 and :443 without the deploy user holding any privileges.
