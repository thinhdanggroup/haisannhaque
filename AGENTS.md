# AGENTS.md

This file provides guidance for AI agents working with the web-store codebase.
It is the primary entry point for understanding conventions, architecture, and how to build features.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses `next@16.2.7`. APIs, conventions, and file structure can differ from older Next.js versions. Read the relevant guide in [`node_modules/next/dist/docs/`](node_modules/next/dist/docs/) before writing or modifying Next.js code. For App Router work, start with [`node_modules/next/dist/docs/01-app/index.md`](node_modules/next/dist/docs/01-app/index.md). Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Snapshot

This repository implements a daohaisan.vn-style Vietnamese seafood commerce platform with a Next.js App Router frontend and synchronous backend flows powered by Supabase PostgreSQL.

| Area | Current Source Of Truth |
|------|-------------------------|
| Product requirements | [`docs/dao-hai-san-requirements.md`](docs/dao-hai-san-requirements.md) |
| Product/design research | [`docs/dao-hai-san.md`](docs/dao-hai-san.md) |
| Implementation plan | [`docs/superpowers/plans/2026-06-07-dao-hai-san-commerce-platform.md`](docs/superpowers/plans/2026-06-07-dao-hai-san-commerce-platform.md) |
| Runtime scripts and dependencies | [`package.json`](package.json) |
| Environment contract | [`src/lib/env.ts`](src/lib/env.ts) and [`.env.example`](.env.example) |
| Database schema and RPCs | [`supabase/migrations/`](supabase/migrations/) |

## Commands

Use `pnpm`; the lockfile is [`pnpm-lock.yaml`](pnpm-lock.yaml).

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Build the production Next.js app. |
| `pnpm start` | Run the built app. |
| `pnpm lint` | Run ESLint with Next core-web-vitals and TypeScript rules. |
| `pnpm test` | Run the Vitest suite once. |
| `pnpm test src/features/catalog` | Run tests matching a path or name filter. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm exec playwright test` | Run Playwright tests from [`tests/e2e/`](tests/e2e/). |
| `docker compose up --build` | Start the web app plus local Postgres/PostgREST/Auth gateway and apply migrations once. |

## Environment

Required variables are validated in [`src/lib/env.ts`](src/lib/env.ts).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase API URL used by browser/server clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for public/authenticated client access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server-only admin access. |
| `SUPABASE_INTERNAL_URL` | Optional internal Supabase URL for server-side Docker traffic. |

Never expose `SUPABASE_SERVICE_ROLE_KEY` from client components or browser code. Use [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts) only from server-only paths.

## Application Architecture

The app is a modular monolith:

1. App Router pages and route handlers live in [`app/`](app/).
2. Shared UI lives in [`components/`](components/).
3. Domain logic, schemas, Supabase clients, and tests live under [`src/`](src/).
4. Database tables, RLS policies, and business RPCs live in [`supabase/migrations/`](supabase/migrations/).
5. Local container orchestration lives in [`docker-compose.yml`](docker-compose.yml) and [`docker/supabase/`](docker/supabase/).

Standard request flow:

1. A page, server action, or route handler receives input.
2. Validate payloads with Zod schemas from the relevant `src/features/*/schema.ts` file.
3. Create a Supabase client with [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts) or [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts).
4. Execute typed domain helpers or Supabase RPCs.
5. Let RLS and server-side permission checks enforce data access.
6. Revalidate affected routes when server actions mutate data.

## App Router Structure

| Path | Purpose |
|------|---------|
| [`app/(storefront)/`](<app/(storefront)/>) | Public storefront routes for home, category, search, product detail, cart, and checkout. |
| [`app/account/`](app/account/) | Authenticated account shell for orders, addresses, wishlist, and loyalty. |
| [`app/admin/`](app/admin/) | Admin dashboard and operations pages for products, orders, inventory, procurement, refunds, complaints, content, and reports. |
| [`app/api/orders/route.ts`](app/api/orders/route.ts) | Checkout order creation endpoint. |
| [`app/api/payments/intents/route.ts`](app/api/payments/intents/route.ts) | Payment intent creation endpoint. |
| [`app/api/webhooks/payments/momo/route.ts`](app/api/webhooks/payments/momo/route.ts) | MoMo webhook handler. |
| [`app/api/webhooks/payments/vnpay/route.ts`](app/api/webhooks/payments/vnpay/route.ts) | VNPAY webhook handler. |
| [`app/api/admin/`](app/api/admin/) | Admin APIs for purchase orders, refunds, complaints, and order transitions. |

## Feature Modules

| Module | Purpose |
|--------|---------|
| [`src/features/catalog/`](src/features/catalog/) | Product cards, product detail mapping, category browse, and search RPC wrappers. |
| [`src/features/cart/`](src/features/cart/) | Cart actions, Zod payloads, pricing calculations, and cart types. |
| [`src/features/checkout/`](src/features/checkout/) | Checkout schema and `create_order_from_checkout` RPC wrapper. |
| [`src/features/orders/`](src/features/orders/) | Order status model and transition guard. |
| [`src/features/payments/`](src/features/payments/) | Payment status normalization, webhook signature checks, and webhook updates. |
| [`src/features/account/`](src/features/account/) | Account session state helpers. |
| [`src/features/wishlist/`](src/features/wishlist/) | Wishlist server actions. |
| [`src/features/loyalty/`](src/features/loyalty/) | Loyalty point calculations. |
| [`src/features/inventory/`](src/features/inventory/) | Stock adjustment server action. |
| [`src/features/procurement/`](src/features/procurement/) | Purchase order and receiving schemas. |
| [`src/features/refunds/`](src/features/refunds/) | Refund request schema. |
| [`src/features/complaints/`](src/features/complaints/) | Complaint case schema. |
| [`src/features/reports/`](src/features/reports/) | Admin report RPC wrappers. |
| [`src/features/admin/`](src/features/admin/) | Admin role permissions and permission enforcement. |
| [`src/lib/supabase/`](src/lib/supabase/) | Browser, server, admin, and URL helpers for Supabase clients. |
| [`src/lib/seo/`](src/lib/seo/) | Product JSON-LD generation. |

## Database And Supabase

Migrations are ordered and should remain append-only after they are shared. Add new schema changes as new files in [`supabase/migrations/`](supabase/migrations/).

| Migration | Purpose |
|-----------|---------|
| [`202606070001_extensions_and_enums.sql`](supabase/migrations/202606070001_extensions_and_enums.sql) | Enables `pgcrypto` and `pg_trgm`; defines product, order, payment, fulfillment, inventory, and reservation enums. |
| [`202606070002_core_schema.sql`](supabase/migrations/202606070002_core_schema.sql) | Creates profiles, admin roles, customers, catalog, cart, inventory, order, payment, reservation, and audit tables. |
| [`202606070003_rls_policies.sql`](supabase/migrations/202606070003_rls_policies.sql) | Enables RLS and defines public, customer, and admin policies. |
| [`202606070004_inventory_functions.sql`](supabase/migrations/202606070004_inventory_functions.sql) | Adds available-stock, expired-reservation release, and stock reservation RPCs. |
| [`202606070005_catalog_read_functions.sql`](supabase/migrations/202606070005_catalog_read_functions.sql) | Adds category browse and search RPCs. |
| [`202606070006_checkout_functions.sql`](supabase/migrations/202606070006_checkout_functions.sql) | Adds idempotent checkout-to-order creation. |
| [`202606070007_account_loyalty_wishlist.sql`](supabase/migrations/202606070007_account_loyalty_wishlist.sql) | Adds wishlist, loyalty tiers, loyalty ledger, RLS, and point awarding. |
| [`202606070008_order_transition_functions.sql`](supabase/migrations/202606070008_order_transition_functions.sql) | Adds controlled order status transitions. |
| [`202606070009_procurement_refunds_reports.sql`](supabase/migrations/202606070009_procurement_refunds_reports.sql) | Adds suppliers, purchase orders, receiving, refunds, complaints, admin permissions, and report RPCs. |

Seed data lives in [`supabase/seed.sql`](supabase/seed.sql) and currently creates default admin roles plus the `HCM-01` branch warehouse.

## Business Rules

Keep v1 synchronous. Do not introduce Redis, background workers, queue consumers, or CDN-specific logic unless the requirements change.

Use these constraints consistently:

- Model inventory by product variant, warehouse/branch, lot, quality status, immutable stock ledger, and reservation.
- Create checkout orders through the `create_order_from_checkout` RPC so cart conversion, order creation, line snapshots, and stock reservations stay transactional and idempotent.
- Handle payments through synchronous route handlers and idempotent webhooks.
- Protect admin operations with both Supabase RLS and `requireAdminPermission`.
- Keep customer-visible text Vietnamese-ready. The root layout uses `lang="vi"`.
- Do not copy proprietary daohaisan.vn assets, branding, logos, or text unless the project owner has permission.

## Coding Guidelines

| Guideline | Details |
|-----------|---------|
| TypeScript | Keep `strict` mode clean. Add explicit types for exported functions, complex objects, and boundary payloads. |
| Validation | Use Zod for server action and route handler inputs. Reuse schemas from the owning feature module. |
| Supabase | Prefer structured Supabase APIs and RPC wrappers over ad hoc SQL from app code. |
| Server/client split | Keep service-role and privileged data access in server-only modules. Add `"use server"` only to server action files. |
| UI | Reuse components from [`components/`](components/) and keep App Router pages thin. |
| Imports | Use the configured `@/*` alias from [`tsconfig.json`](tsconfig.json). |
| Python | If Python code is added, include type hints. |

## Testing

| Test Type | Location | Command |
|-----------|----------|---------|
| Unit/component/domain tests | Colocated `*.test.ts` files in [`src/`](src/) plus [`tests/unit/`](tests/unit/) | `pnpm test` |
| SQL integration tests | [`tests/integration/`](tests/integration/) | Run against a migrated Supabase/Postgres database with `psql -v ON_ERROR_STOP=1 -f <file>`. |
| E2E smoke tests | [`tests/e2e/`](tests/e2e/) | `pnpm exec playwright test` |
| Lint | Whole repo | `pnpm lint` |

Vitest uses [`vitest.config.ts`](vitest.config.ts), `jsdom`, globals, and the `@` alias. Playwright uses [`playwright.config.ts`](playwright.config.ts) and starts `pnpm dev` with test Supabase environment values.

For Python tests, use the environment from `environments/.env.development` when that file exists.

## External API References

| Service | API Docs |
|---------|----------|
| Next.js | [Docs](https://nextjs.org/docs) plus bundled local docs in [`node_modules/next/dist/docs/`](node_modules/next/dist/docs/). |
| Supabase | [Docs](https://supabase.com/docs) for PostgreSQL, Auth, RLS, Storage, and JS clients. |
| MoMo | [Developers](https://developers.momo.vn/) for payment initiation and webhook behavior. |
| VNPAY | [API docs](https://sandbox.vnpayment.vn/apis/docs/) for payment initiation and return/webhook behavior. |

## Diagrams And Documentation

Use Mermaid for diagrams in project docs. Prefer `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, and `erDiagram`.

Feature documentation belongs under [`docs/`](docs/). Implementation plans that follow the superpowers format belong under [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Codebase Index

> Note: `RESEARCH.md` does not exist yet. When it is added, use it as the codebase index before building or modifying features. To create it, run the generate-research-md workflow.

## Git Workflow

Commit code directly to the `main` branch for this repository. Do not create or use a separate worktree for routine implementation work unless the user explicitly requests one.

## Subagents

When spawning a new subagent, always use model `gpt-5.5` with reasoning effort `xhigh`.
