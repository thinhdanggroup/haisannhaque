# AGENTS.md — web-store

Vietnamese e-commerce storefront built on Next.js 16 App Router, Supabase, and Tailwind CSS.
Full developer reference: `docs/developer-guide.md`.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth (SSR cookie-based) |
| Styling | Tailwind CSS |
| Validation | Zod v4 |
| Testing | Vitest (unit) · Playwright (e2e) |
| Package manager | pnpm |

> Next.js 16: route params are `Promise<{ id: string }>` and **must be `await`ed**.

---

## Common Commands

```bash
pnpm dev          # dev server (Turbopack, http://localhost:3000)
pnpm build        # production build
pnpm test         # vitest unit tests
pnpm lint         # eslint
pnpm migrate      # run pending DB migrations
pnpm migrate:new  # scaffold a new migration file

# First-time admin user
node scripts/create-user.mjs    # admin@haisannhaque.vn / Admin@123456
node scripts/assign-admin.mjs   # grants super_admin role
```

---

## Architecture

Three route groups share a single Supabase backend:

```
app/(storefront)/   Public shop — products, cart, search, checkout
app/account/        Customer account — orders, addresses, wishlist, loyalty
app/admin/          Operations dashboard — products, orders, inventory, reports
app/api/            Route handlers — image upload, order creation, payments/webhooks
```

All domain logic lives in `src/features/<domain>/`. All UI components live in `components/`.

---

## Feature Module Pattern

Each `src/features/<domain>/` contains:

| File | Purpose |
|---|---|
| `types.ts` | Pure TS types — zero Supabase or Next.js imports |
| `schema.ts` | Zod input schemas |
| `queries.ts` | Read functions — accept a `SupabaseClient` arg, return domain types |
| `actions.ts` | `"use server"` mutations (storefront) |
| `admin-actions.ts` | `"use server"` mutations (admin-only, includes permission check) |
| `*.test.ts` | Co-located Vitest tests |

---

## Supabase Clients

| Client | File | When to use |
|---|---|---|
| `createServerClient()` | `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Bypass RLS (cart creation, scripts) — **server-only** |
| `createBrowserClient()` | `src/lib/supabase/browser.ts` | Client Components |

Never import `createAdminClient` in a Client Component or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## Server Action Rules

1. **Auth before validation** — call `requireAdminPermission` before parsing `formData`.
2. **Zod v4 errors** — use `.issues[0]?.message`, not `.errors` (removed in v4).
3. **`redirect()` outside try/catch** — it throws internally; only wrap the Supabase call.
4. **Validate IDs as UUIDs** — `z.string().uuid().safeParse(id)` before any DB call.
5. **Revalidate before redirect** — always call `revalidatePath()` first.

---

## Database Conventions

- Migrations in `supabase/migrations/` — format `YYYYMMDDNNNN_description.sql`, **append-only**.
- Soft-delete: `products.status = 'archived'`, `variants/categories/warehouses.is_active = false`.
- All tables have RLS. Three tiers: public (anon read), customer (own data via `auth.uid()`), admin (via `user_admin_roles`).
- RBAC permissions defined in `src/features/admin/permissions.ts`; enforced via `requireAdminPermission(client, "resource:action")`.

---

## Environment

Copy `.env.example` → `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Production

Production is a **self-hosted Docker stack on `110.172.28.198`**, not Vercel. A
`.vercel/` directory exists in the repo but is stale — do not deploy with
`vercel --prod`.

| | |
|---|---|
| Host | `thinhda@110.172.28.198` |
| Path | `~/haisannhaque` |
| Stack | `docker compose -f docker-compose.prod.yml` — services `web`, `nginx`, `certbot` |
| Live URL | https://haisannhaque.com |
| Secrets | `.env` on the server (gitignored); `.env.local` is local only |

**Auto-deploy:** once a storefront or admin change is finished and verified
(typecheck, lint, tests pass), commit, push to `main`, and run the deploy below
without waiting to be asked. Afterwards, confirm the server is on the new commit
and that https://haisannhaque.com returns `200`.

Deploy = push to `main` first, then:

```bash
ssh thinhda@110.172.28.198 'cd ~/haisannhaque && ./scripts/deploy.sh'
```

`scripts/deploy.sh` does `git pull --ff-only`, rebuilds the `web` image, restarts
the stack, and polls port 80 until the app answers — so **the server pulls from
`origin/main`**; an unpushed commit will not ship. Expect a few minutes for
`next build`. A transient `502` during the poll is normal while the container
boots; the script only succeeds once a real `200` comes back.

`NEXT_PUBLIC_*` values are baked into the client bundle at build time, so
changing one needs a rebuild, not just a restart.

Full runbook, TLS modes, and image-transfer fallback: `docs/DEPLOYMENT.md`.

> **Local dev points at the production Supabase project.** `pnpm dev` reads and
> writes real shop data. Navigating and reading is fine; submitting admin forms
> is a production write.
