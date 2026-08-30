# ShopeeFood Shop Sync — Design

Status: approved by user 2026-08-30. Next step: implementation plan (writing-plans skill).

## Goal

Automatically and periodically clone the store owner's own ShopeeFood shop
listing (`https://shopeefood.vn/now-food/shop/1303714`) — menu items (name,
description, price, photo) and shop info (name, logo, cover image,
description, address, hours) — into this site's product catalog and a new
shop-profile record, so the website stays in sync with the ShopeeFood
listing without manual re-entry.

## Confirmed decisions

- The ShopeeFood shop is the store owner's own listing (not scraping a
  competitor).
- Sync target: **both** product catalog and shop info.
- Publish mode: **auto-publish** — no admin approval step before a run's
  changes go live. Compensated by a full run/item audit trail (see below)
  so an admin can see what changed after the fact.
- Trigger: **in-process scheduler** inside the Next.js server container
  (matches the self-hosted Docker/nginx deployment — no Vercel Cron
  available).
- Default frequency: **daily**, off-peak hours. Configurable in the admin
  settings screen.
- Matching/removal semantics: **upsert-sync keyed by ShopeeFood item ID**.
  The same ShopeeFood item always updates the same `products` row across
  runs (never a fresh row per run). An item that disappears from the
  ShopeeFood shop causes its product to be **auto-archived**
  (`products.status = 'archived'`), matching the repo's existing
  soft-delete convention. Products not created by this sync
  (`external_source IS NULL`) are never touched by the archiving step.

## Non-goals

- Two-way sync (nothing is ever written back to ShopeeFood).
- Syncing inventory/stock levels — only catalog content (name, description,
  price, photos) and shop info.
- Supporting delivery platforms other than ShopeeFood in this iteration
  (the adapter interface leaves room for it later, but only one adapter
  ships now).
- Replacing or writing into the hand-curated CMS homepage sections
  (`src/features/cms`) — see the CMS boundary note below.

## CMS boundary note

Shop info (banner/logo/description/hours) must **not** write into the
existing `cms_sections` / `cms_banners` tables that admins curate manually
for the homepage. Doing so would let a daily automated job silently
overwrite hand-tuned homepage content. Instead, shop info lands in a new,
sync-owned `shop_profile` table. Surfacing it on a page (e.g. an
About/Store-info block) is a separate, later admin decision and out of
scope for this feature — this feature only keeps `shop_profile` current.

## Data model

New migration `supabase/migrations/<next-seq>_shop_sync.sql` (append-only,
following the existing `YYYYMMDDNNNN_description.sql` convention):

```sql
-- Tag products created/owned by an external sync source.
alter table products
  add column external_source text,
  add column external_id text;

create unique index products_external_source_id_key
  on products (external_source, external_id)
  where external_source is not null;

-- Singleton-style shop info owned entirely by the sync job.
create table shop_profile (
  id uuid primary key default gen_random_uuid(),
  source text not null,               -- e.g. 'shopeefood'
  name text not null,
  logo_url text,
  cover_image_url text,
  description text,
  address text,
  opening_hours text,
  updated_at timestamptz not null default now()
);

create table shop_sync_settings (
  id uuid primary key default gen_random_uuid(),
  source text not null,               -- e.g. 'shopeefood'
  source_url text not null,
  enabled boolean not null default false,
  cron_expression text not null default '0 3 * * *', -- daily 03:00
  target_catalog boolean not null default true,
  target_shop_info boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create table shop_sync_runs (
  id uuid primary key default gen_random_uuid(),
  settings_id uuid not null references shop_sync_settings(id) on delete cascade,
  status text not null default 'running' check (status in ('running','success','failed')),
  trigger text not null default 'scheduled' check (trigger in ('scheduled','manual')),
  items_created integer not null default 0,
  items_updated integer not null default 0,
  items_archived integer not null default 0,
  items_errored integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table shop_sync_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references shop_sync_runs(id) on delete cascade,
  external_id text not null,
  product_id uuid references products(id) on delete set null,
  action text not null check (action in ('created','updated','archived','skipped','error')),
  message text
);
```

RLS: all four new tables are admin-only (no public/customer policies),
following the three-tier convention — admin read/write via
`user_admin_roles`, consistent with other operational tables like
`purchase_orders`.

Why upsert-in-place is required, not delete+recreate: `order_items.variant_id`
references `product_variants(id)` with no cascade, so deleting a variant/
product referenced by a past order would either fail outright or (if forced)
destroy order history and change public product URLs (slugs) on every run.
Keying updates by `(external_source, external_id)` avoids both problems.

## Feature module: `src/features/shop-sync/`

Follows the existing feature module pattern:

| File | Purpose |
|---|---|
| `types.ts` | `ScrapedShopInfo`, `ScrapedShopItem`, `ShopSyncSettings`, `ShopSyncRun`, `ShopSyncRunItem` — pure types |
| `schema.ts` | Zod schema for the settings form (source URL, enabled, frequency preset, target scope) |
| `queries.ts` | Read settings, list runs (paginated), get run detail with items |
| `admin-actions.ts` | `updateShopSyncSettings`, `triggerShopSyncNow` — `"use server"`, permission-gated |
| `sync-service.ts` | Pure-ish orchestration: adapter → diff/upsert against catalog + `shop_profile`. Not a server action; called by both the scheduler and `triggerShopSyncNow` |
| `adapters/types.ts` | `ShopSourceAdapter` interface |
| `adapters/shopeefood-adapter.ts` | ShopeeFood-specific implementation |
| `scheduler.ts` | Registers the cron job in-process |
| `*.test.ts` | Co-located Vitest tests |

### Source adapter interface

```ts
export type ScrapedShopItem = {
  externalId: string;
  name: string;
  description: string | null;
  priceVnd: number;
  imageUrl: string | null;
  categoryName: string | null;
  isAvailable: boolean;
};

export type ScrapedShopInfo = {
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  address: string | null;
  openingHours: string | null;
};

export type ScrapedShop = {
  shopInfo: ScrapedShopInfo;
  items: ScrapedShopItem[];
};

export interface ShopSourceAdapter {
  fetchShop(sourceUrl: string): Promise<ScrapedShop>;
}
```

### ShopeeFood adapter — implementation approach

ShopeeFood's shop page is client-rendered (confirmed: a plain HTTP fetch
returns no usable content), so a first implementation task is a short
technical spike:

1. Inspect the page's network requests (via Playwright's network
   interception) for an internal JSON API the SPA calls to load shop/menu
   data. If found, call that endpoint directly with a normal browser
   User-Agent — cheaper and more reliable for a daily job than rendering a
   full page.
2. If no usable API is found, fall back to full Playwright rendering: load
   the page headlessly, wait for the menu list to render, extract shop
   info and items from the DOM.

Either path is implemented behind `ShopSourceAdapter`, so the sync service
and scheduler are unaffected by which one wins. `playwright` is already a
devDependency (used for e2e tests) — for production use it must move to
`dependencies`, and the Dockerfile needs the Chromium browser binary
installed (`npx playwright install --with-deps chromium`), which increases
image size — called out explicitly since this is a self-hosted build.

Robustness requirements for the adapter:
- Normal browser User-Agent, reasonable request pacing (single run/day,
  no burst requests).
- Any failure (network error, page structure changed, selector not found)
  throws a typed error that `sync-service.ts` catches and records as a
  failed run — it must never crash the server process.

## Sync algorithm (`sync-service.ts`)

```
runSync(settings, trigger):
  create shop_sync_runs row (status='running', trigger)
  try:
    scraped = adapter.fetchShop(settings.source_url)

    if settings.target_shop_info:
      upsert shop_profile (source='shopeefood') with scraped.shopInfo
      for logo/cover image: download bytes, re-upload to Supabase
        Storage 'media' bucket (same pattern as
        app/api/admin/images/route.ts), store the resulting public URL
        — never store the ShopeeFood CDN URL directly (it can be
        hotlink-protected or expire)
        skip re-download if the source image URL is unchanged since last run

    if settings.target_catalog:
      seenExternalIds = []
      for item in scraped.items:
        seenExternalIds.push(item.externalId)
        try:
          category = find or create categories row by name (item.categoryName)
          product = find products row where external_source='shopeefood'
                    and external_id=item.externalId
          if product exists:
            update name/description/status from item
            record run_item action='updated'
          else:
            insert products row (external_source='shopeefood',
                                  external_id=item.externalId, slug=makeSlug(item.name), ...)
            insert product_variants row (sku=`shopeefood-${item.externalId}`,
                                          list_price=item.priceVnd, ...)
            record run_item action='created'
          upsert product_images: download item.imageUrl, re-upload to
            Storage, replace existing image row(s) for this product
            (skip re-download if source URL unchanged)
        catch itemError:
          record run_item action='error', message=itemError.message
          continue to next item  // one bad item never aborts the run

      archive products where external_source='shopeefood'
        and external_id not in seenExternalIds
        and status != 'archived'
      record run_item action='archived' for each

    update shop_sync_runs: status='success', counts, finished_at
  catch runError:
    update shop_sync_runs: status='failed', error_message, finished_at
  revalidatePath('/admin/shop-sync')
  revalidatePath('/admin/products')
  revalidatePath('/') // storefront reflects new/changed/archived products
```

Category matching mirrors the same "match by name, create if missing"
approach already visible in `import-actions.ts` — acceptable here because
categories are low-cardinality and low-risk to merge, unlike products.

## Scheduler (`scheduler.ts`)

- New dependency: `node-cron`.
- Registered once at server startup via Next.js `instrumentation.ts`
  (`register()` hook, `NEXT_RUNTIME === 'nodejs'` guard) — this repo has no
  `instrumentation.ts` yet, so this feature adds it.
- Reads the single enabled `shop_sync_settings` row's `cron_expression` and
  schedules `runSync(settings, 'scheduled')`.
- Concurrency guard: before starting, check for an existing
  `shop_sync_runs` row with `status='running'` for the same
  `settings_id`; if found, skip this trigger (log it) rather than run
  concurrently. This also protects the manual "Run now" button from
  racing a scheduled run.
- Known limitation, accepted for this iteration: this guard is
  per-process. If the deployment ever moves to multiple app replicas, two
  processes could still race; a DB advisory lock would be needed then.
  Out of scope while running as a single `next start` container.

## Admin UI (`app/admin/shop-sync/`)

- Settings form: source URL, enabled toggle, frequency preset
  (daily/hourly/weekly → cron expression), target scope checkboxes
  (catalog / shop info).
- "Run now" button → `triggerShopSyncNow` server action.
- Run history table (paginated): status, trigger, counts, started/finished
  times, error message.
- Run detail view: per-item outcomes from `shop_sync_run_items`.
- Added to the admin nav alongside existing operational sections
  (Products, Categories, Content).

## Permissions

New permission `shop_sync:manage` added to
`src/features/admin/permissions.ts`, granted to `super_admin` (via `*`) and
`catalog_manager`. All admin actions call
`requireAdminPermission(client, "shop_sync:manage")` before doing anything,
per the repo's server action rules.

## Testing

- `sync-service.test.ts`: unit tests against a fake `ShopSourceAdapter`
  returning fixture `ScrapedShop` data — covers create, update, archive,
  and per-item error paths, with no real network or Playwright involved.
- `shopeefood-adapter.test.ts`: tests the parsing/extraction logic against
  saved fixture HTML/JSON, not live network calls (keeps CI fast and
  deterministic, avoids depending on ShopeeFood's availability).
- `admin-actions.test.ts`: permission-gating and validation, following the
  pattern in `catalog/admin-actions.test.ts`.

## Operational risks (accepted, not blocking)

- ShopeeFood may rate-limit or bot-detect automated requests even against
  the owner's own shop; mitigated by a normal UA, single daily run, and
  failures degrading to a logged failed run rather than crashing anything.
- Playwright + Chromium adds meaningful size to the production Docker
  image; acceptable trade-off for reliability, revisit if the JSON-API
  spike (above) succeeds and Playwright can be dropped entirely.
- If ShopeeFood changes its page/markup, the adapter breaks silently until
  a scheduled run fails — the admin run-history view is the detection
  mechanism (no separate alerting in this iteration).
