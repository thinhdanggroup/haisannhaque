# ShopeeFood Shop Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically clone the store owner's own ShopeeFood shop (menu items + shop info) into this site's product catalog on a daily schedule, auto-publishing changes with a full audit trail.

**Architecture:** A new `src/features/shop-sync/` module drives everything: a Playwright-based adapter captures ShopeeFood's own internal JSON API responses (no DOM scraping, no spoofed anti-bot headers), a sync service upserts that data into `products`/`product_variants`/`product_images` (keyed by a new `external_source`/`external_id` pair so re-runs update the same rows) and a new `shop_profile` table, and an in-process `node-cron` scheduler (registered via `instrumentation.ts`) triggers it daily. An admin page under `/admin/shop-sync` exposes settings, a manual "Run now" action, and a run-history audit trail.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + Storage), Zod v4, Vitest, `playwright-core` (new), `node-cron` (new), Alpine `chromium` package (new Docker dependency).

**Spec:** `docs/superpowers/specs/2026-08-30-shopeefood-shop-sync-design.md`

## Global Constraints

- Route params in this Next.js 16 app are `Promise<{ id: string }>` and must be `await`ed.
- Server actions: call `requireAdminPermission` before parsing `formData`; use `.issues[0]?.message` for Zod v4 errors (not `.errors`); keep `redirect()` outside try/catch; validate IDs with `z.string().uuid().safeParse(id)`; call `revalidatePath()` before any `redirect()`.
- Migrations live in `supabase/migrations/`, filename format `YYYYMMDDNNNN_description.sql`, append-only — never edit a migration once merged.
- Soft-delete convention: `products.status = 'archived'` (never hard-delete a product).
- All new tables get RLS enabled with admin-only policies (no anon/customer access), following the pattern of other operational tables (e.g. `purchase_orders`).
- The confirmed ShopeeFood JSON endpoints require a real browser session (direct `fetch` calls return `403` from anti-bot protection) — the adapter MUST drive a real Playwright browser and read the two endpoints' responses as the page loads. It must never attempt to construct or replay the anti-bot fingerprint headers by hand.
- Production deployment is self-hosted Docker (`node:22-alpine` base) + nginx — there is no Vercel Cron. Scheduling is in-process.
- Package manager is `pnpm`; test runner is `vitest run`; lint is `eslint`.

---

### Task 1: Migration — shop sync schema

**Files:**
- Create: `supabase/migrations/202608300022_shop_sync.sql`

**Interfaces:**
- Produces: tables `shop_profile`, `shop_sync_settings`, `shop_sync_runs`, `shop_sync_run_items`; new columns `products.external_source`, `products.external_id`, `products.external_image_source_url`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Tag products created/owned by an external sync source, and cache the
-- last-synced source image URL so the sync service can skip re-downloading
-- an unchanged image.
alter table products
  add column external_source text,
  add column external_id text,
  add column external_image_source_url text;

create unique index products_external_source_id_key
  on products (external_source, external_id)
  where external_source is not null;

-- Singleton-style shop info owned entirely by the sync job. logo_source_url
-- and cover_image_source_url cache the last-seen ShopeeFood image URLs
-- (for skip-if-unchanged); logo_url/cover_image_url are the re-hosted
-- Supabase Storage URLs actually shown on the site.
create table shop_profile (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  name text not null,
  logo_url text,
  logo_source_url text,
  cover_image_url text,
  cover_image_source_url text,
  description text,
  address text,
  opening_hours text,
  updated_at timestamptz not null default now()
);

create table shop_sync_settings (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text not null,
  enabled boolean not null default false,
  cron_expression text not null default '0 3 * * *',
  target_catalog boolean not null default true,
  target_shop_info boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- One settings row per source; Task 11's admin action upserts onto this.
create unique index shop_sync_settings_source_key on shop_sync_settings (source);

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

alter table shop_profile enable row level security;
alter table shop_sync_settings enable row level security;
alter table shop_sync_runs enable row level security;
alter table shop_sync_run_items enable row level security;

create policy "Admins manage shop_profile" on shop_profile
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_settings" on shop_sync_settings
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_runs" on shop_sync_runs
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_run_items" on shop_sync_run_items
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
```

- [ ] **Step 2: Apply it to the local DB and verify**

Run: `pnpm migrate:local` is not a script; use `bash scripts/migrate.sh --local`
Expected: script prints `Applying 202608300022_shop_sync.sql...` then `Done.` with no SQL errors.

Then verify the tables exist:

Run: `PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "\d shop_sync_settings"`
Expected: prints the column list matching the migration (no "does not exist" error).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/202608300022_shop_sync.sql
git commit -m "feat(shop-sync): add schema for ShopeeFood shop sync"
```

---

### Task 2: Permission — `shop_sync:manage`

**Files:**
- Modify: `src/features/admin/permissions.ts`
- Test: `src/features/admin/permissions.test.ts`

**Interfaces:**
- Consumes: `canAccess(roles: string[], permission: string): boolean` (existing, unchanged signature).
- Produces: `catalog_manager` role now includes `"shop_sync:manage"`; `super_admin` already covers it via `"*"`.

- [ ] **Step 1: Write the failing test**

Add to `src/features/admin/permissions.test.ts`:

```ts
  it("allows catalog manager to manage shop sync", () => {
    expect(canAccess(["catalog_manager"], "shop_sync:manage")).toBe(true);
  });

  it("blocks customer service from shop sync", () => {
    expect(canAccess(["customer_service"], "shop_sync:manage")).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- permissions.test.ts`
Expected: FAIL — `canAccess(["catalog_manager"], "shop_sync:manage")` returns `false`.

- [ ] **Step 3: Add the permission**

In `src/features/admin/permissions.ts`, change:

```ts
  catalog_manager: ["products:read", "products:create", "products:update", "products:delete", "categories:update"],
```

to:

```ts
  catalog_manager: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "categories:update",
    "shop_sync:manage",
  ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- permissions.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/permissions.ts src/features/admin/permissions.test.ts
git commit -m "feat(shop-sync): add shop_sync:manage permission"
```

---

### Task 3: Feature types

**Files:**
- Create: `src/features/shop-sync/types.ts`
- Create: `src/features/shop-sync/adapters/types.ts`

**Interfaces:**
- Produces: `ScrapedShopItem`, `ScrapedShopInfo`, `ScrapedShop`, `ShopSourceAdapter` (adapters/types.ts); `ShopSyncSettings`, `ShopSyncRun`, `ShopSyncRunItem`, `ShopSyncRunAction`, `ShopSyncTrigger` (types.ts). These exact names/shapes are used verbatim by every later task.

This task has no behavior to test (pure type declarations) — write the files directly and verify with the type checker.

- [ ] **Step 1: Write `src/features/shop-sync/adapters/types.ts`**

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

- [ ] **Step 2: Write `src/features/shop-sync/types.ts`**

```ts
export type ShopSyncTrigger = "scheduled" | "manual";
export type ShopSyncRunStatus = "running" | "success" | "failed";
export type ShopSyncRunAction = "created" | "updated" | "archived" | "skipped" | "error";

export type ShopSyncSettings = {
  id: string;
  source: string;
  sourceUrl: string;
  enabled: boolean;
  cronExpression: string;
  targetCatalog: boolean;
  targetShopInfo: boolean;
  updatedAt: string;
};

export type ShopSyncRun = {
  id: string;
  settingsId: string;
  status: ShopSyncRunStatus;
  trigger: ShopSyncTrigger;
  itemsCreated: number;
  itemsUpdated: number;
  itemsArchived: number;
  itemsErrored: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ShopSyncRunItem = {
  id: string;
  runId: string;
  externalId: string;
  productId: string | null;
  action: ShopSyncRunAction;
  message: string | null;
};
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new type errors introduced (existing baseline errors, if any, are unaffected — these files have no imports to break).

- [ ] **Step 4: Commit**

```bash
git add src/features/shop-sync/types.ts src/features/shop-sync/adapters/types.ts
git commit -m "feat(shop-sync): add feature module types"
```

---

### Task 4: Settings form schema

**Files:**
- Create: `src/features/shop-sync/schema.ts`
- Test: `src/features/shop-sync/schema.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `shopSyncSettingsSchema: ZodType`, `parseShopSyncSettingsForm(formData: FormData): { success: true, data: {...} } | { success: false, error: string }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseShopSyncSettingsForm } from "./schema";

function buildForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("sourceUrl", overrides.sourceUrl ?? "https://shopeefood.vn/now-food/shop/1303714");
  fd.set("enabled", overrides.enabled ?? "on");
  fd.set("cronExpression", overrides.cronExpression ?? "0 3 * * *");
  fd.set("targetCatalog", overrides.targetCatalog ?? "on");
  fd.set("targetShopInfo", overrides.targetShopInfo ?? "on");
  return fd;
}

describe("parseShopSyncSettingsForm", () => {
  it("parses a valid form", () => {
    const result = parseShopSyncSettingsForm(buildForm());
    expect(result).toEqual({
      success: true,
      data: {
        sourceUrl: "https://shopeefood.vn/now-food/shop/1303714",
        enabled: true,
        cronExpression: "0 3 * * *",
        targetCatalog: true,
        targetShopInfo: true,
      },
    });
  });

  it("treats missing checkboxes as false", () => {
    const fd = buildForm();
    fd.delete("enabled");
    fd.delete("targetShopInfo");
    const result = parseShopSyncSettingsForm(fd);
    expect(result.success && result.data.enabled).toBe(false);
    expect(result.success && result.data.targetShopInfo).toBe(false);
  });

  it("rejects a non-URL sourceUrl", () => {
    const result = parseShopSyncSettingsForm(buildForm({ sourceUrl: "not-a-url" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("URL") });
  });

  it("rejects an empty cron expression", () => {
    const result = parseShopSyncSettingsForm(buildForm({ cronExpression: "" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("cron") });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- shop-sync/schema.test.ts`
Expected: FAIL — `./schema` module does not exist yet.

- [ ] **Step 3: Write `src/features/shop-sync/schema.ts`**

```ts
import { z } from "zod";

export const shopSyncSettingsSchema = z.object({
  sourceUrl: z.string().url("sourceUrl must be a valid URL"),
  enabled: z.boolean(),
  cronExpression: z.string().min(1, "cronExpression is required"),
  targetCatalog: z.boolean(),
  targetShopInfo: z.boolean(),
});

export type ShopSyncSettingsFormData = z.infer<typeof shopSyncSettingsSchema>;

export type ShopSyncSettingsFormResult =
  | { success: true; data: ShopSyncSettingsFormData }
  | { success: false; error: string };

export function parseShopSyncSettingsForm(formData: FormData): ShopSyncSettingsFormResult {
  const raw = {
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    enabled: formData.get("enabled") === "on",
    cronExpression: String(formData.get("cronExpression") ?? ""),
    targetCatalog: formData.get("targetCatalog") === "on",
    targetShopInfo: formData.get("targetShopInfo") === "on",
  };

  const parsed = shopSyncSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return { success: true, data: parsed.data };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- shop-sync/schema.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/schema.ts src/features/shop-sync/schema.test.ts
git commit -m "feat(shop-sync): add settings form schema"
```

---

### Task 5: ShopeeFood response mapper (pure, fixture-tested)

**Files:**
- Create: `src/features/shop-sync/adapters/shopeefood-mapper.ts`
- Create: `src/features/shop-sync/adapters/fixtures/shop-detail.fixture.json`
- Create: `src/features/shop-sync/adapters/fixtures/dishes.fixture.json`
- Test: `src/features/shop-sync/adapters/shopeefood-mapper.test.ts`

**Interfaces:**
- Consumes: `ScrapedShop`, `ScrapedShopInfo`, `ScrapedShopItem` from `./types`.
- Produces: `mapToScrapedShop(detailJson: unknown, dishesJson: unknown): ScrapedShop` — the only function later tasks (the adapter) call.

These fixtures are trimmed-down but field-shape-accurate captures of ShopeeFood's real `get_detail` and `get_delivery_dishes` responses (verified live during design).

- [ ] **Step 1: Write the fixtures**

`src/features/shop-sync/adapters/fixtures/shop-detail.fixture.json`:

```json
{
  "reply": {
    "delivery_detail": {
      "id": 469472,
      "delivery_id": 469472,
      "name": "Cơm Nhà Vị Quê - The Sun Avenue Novaland",
      "address": "Căn SAV.2-00.04, Tầng Trệt, Tháp 2, Tòa Nhà The Sun Avenue, 28 Mai Chí Thọ, P. An Phú, Thành Phố Thủ Đức, TP. HCM",
      "short_description": null,
      "logo_mms_img_id": "vn-11134259-81ztc-ms3oow7cw9hh99",
      "photos": [
        { "width": 160, "height": 120, "value": "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oowod924kec@resize_ss160x120!@crop_w160_h120_cT" },
        { "width": 1242, "height": 600, "value": "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oowod924kec@resize_ss1242x600!@crop_w1242_h600_cT" }
      ],
      "time": {
        "week_days": [
          { "week_day": 1, "start_time": "07:30", "end_time": "20:00" },
          { "week_day": 7, "start_time": "07:30", "end_time": "19:30" }
        ]
      }
    }
  },
  "result": "success"
}
```

`src/features/shop-sync/adapters/fixtures/dishes.fixture.json`:

```json
{
  "reply": {
    "menu_infos": [
      {
        "dish_type_id": 16909636,
        "dish_type_name": "Món chế biến sẳn (Hấp/Nướng)",
        "dishes": [
          {
            "id": 293255211,
            "name": "Cá Chẽm hấp Hồng kông - Size 1,5kg",
            "description": "Hấp hồng kông bằng nước sốt hải sản dành riêng cho cá",
            "price": { "value": 350000.0 },
            "is_available": true,
            "photos": [
              { "width": 120, "value": "https://mms.img.susercontent.com/vn-11134505-81ztc-ms9cqqltse818c@resize_ss120x120!@crop_w120_h120_cT" },
              { "width": 1242, "value": "https://mms.img.susercontent.com/vn-11134505-81ztc-ms9cqqltse818c@resize_ss1242x1242!@crop_w1242_h1242_cT" }
            ]
          },
          {
            "id": 293255200,
            "name": "Mực Lá hấp gừng - 1kg",
            "description": "Mực lá tươi ngon hấp cùng gừng chẻ sợi",
            "price": { "value": 600000.0 },
            "is_available": false,
            "photos": [
              { "width": 400, "value": "https://mms.img.susercontent.com/vn-11134505-81ztc-ms9cl16qn7k4de@resize_ss400x400!@crop_w400_h400_cT" }
            ]
          }
        ]
      },
      {
        "dish_type_id": 16909655,
        "dish_type_name": "Hải Sản chưa chế biến (CÓ SƠ CHẾ FREE)",
        "dishes": [
          {
            "id": 293154579,
            "name": "Cá Chim Trắng (Đông Lạnh) | 1,4-1,5kg/con",
            "description": "",
            "price": { "value": 600000.0 },
            "is_available": true,
            "photos": []
          }
        ]
      }
    ]
  },
  "result": "success"
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { mapToScrapedShop } from "./shopeefood-mapper";
import shopDetailFixture from "./fixtures/shop-detail.fixture.json";
import dishesFixture from "./fixtures/dishes.fixture.json";

describe("mapToScrapedShop", () => {
  it("maps shop info from the detail response", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.shopInfo).toEqual({
      name: "Cơm Nhà Vị Quê - The Sun Avenue Novaland",
      logoUrl:
        "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oow7cw9hh99@resize_ss240x240!@crop_w240_h240_cT",
      coverImageUrl:
        "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oowod924kec@resize_ss1242x600!@crop_w1242_h600_cT",
      description: null,
      address:
        "Căn SAV.2-00.04, Tầng Trệt, Tháp 2, Tòa Nhà The Sun Avenue, 28 Mai Chí Thọ, P. An Phú, Thành Phố Thủ Đức, TP. HCM",
      openingHours: "Thứ Hai: 07:30–20:00; Chủ Nhật: 07:30–19:30",
    });
  });

  it("flattens all dishes across categories with category name attached", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toEqual({
      externalId: "293255211",
      name: "Cá Chẽm hấp Hồng kông - Size 1,5kg",
      description: "Hấp hồng kông bằng nước sốt hải sản dành riêng cho cá",
      priceVnd: 350000,
      imageUrl:
        "https://mms.img.susercontent.com/vn-11134505-81ztc-ms9cqqltse818c@resize_ss1242x1242!@crop_w1242_h1242_cT",
      categoryName: "Món chế biến sẳn (Hấp/Nướng)",
      isAvailable: true,
    });
  });

  it("treats an unavailable dish as isAvailable: false", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.items[1].isAvailable).toBe(false);
  });

  it("maps an empty description to null and an empty photos array to a null imageUrl", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    const lastItem = result.items[2];
    expect(lastItem.description).toBeNull();
    expect(lastItem.imageUrl).toBeNull();
  });

  it("throws if either response did not report success", () => {
    expect(() => mapToScrapedShop({ result: "fail" }, dishesFixture)).toThrow(
      /ShopeeFood API returned a non-success result/,
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- shopeefood-mapper.test.ts`
Expected: FAIL — `./shopeefood-mapper` module does not exist yet.

- [ ] **Step 4: Write `src/features/shop-sync/adapters/shopeefood-mapper.ts`**

```ts
import type { ScrapedShop, ScrapedShopInfo, ScrapedShopItem } from "./types";

type Photo = { width: number; value: string };

type DishJson = {
  id: number;
  name: string;
  description: string;
  price: { value: number };
  is_available: boolean;
  photos: Photo[];
};

type MenuCategoryJson = {
  dish_type_name: string;
  dishes: DishJson[];
};

type ShopDetailJson = {
  result: string;
  reply: {
    delivery_detail: {
      name: string;
      address: string | null;
      short_description: string | null;
      logo_mms_img_id: string | null;
      photos: Photo[];
      time?: { week_days: Array<{ week_day: number; start_time: string; end_time: string }> };
    };
  };
};

type DishesJson = {
  result: string;
  reply: { menu_infos: MenuCategoryJson[] };
};

const WEEK_DAY_NAMES = ["", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

function mmsImageUrl(mmsId: string, size = 240): string {
  return `https://mms.img.susercontent.com/${mmsId}@resize_ss${size}x${size}!@crop_w${size}_h${size}_cT`;
}

function largestPhoto(photos: Photo[] | undefined): string | null {
  if (!photos || photos.length === 0) return null;
  return photos.reduce((best, p) => (p.width > best.width ? p : best), photos[0]).value;
}

function formatOpeningHours(
  weekDays: Array<{ week_day: number; start_time: string; end_time: string }> | undefined,
): string | null {
  if (!weekDays || weekDays.length === 0) return null;
  return weekDays
    .map((d) => `${WEEK_DAY_NAMES[d.week_day] ?? d.week_day}: ${d.start_time}–${d.end_time}`)
    .join("; ");
}

function mapShopInfo(detail: ShopDetailJson["reply"]["delivery_detail"]): ScrapedShopInfo {
  return {
    name: detail.name,
    logoUrl: detail.logo_mms_img_id ? mmsImageUrl(detail.logo_mms_img_id, 240) : null,
    coverImageUrl: largestPhoto(detail.photos),
    description: detail.short_description || null,
    address: detail.address || null,
    openingHours: formatOpeningHours(detail.time?.week_days),
  };
}

function mapItem(dish: DishJson, categoryName: string): ScrapedShopItem {
  return {
    externalId: String(dish.id),
    name: dish.name,
    description: dish.description || null,
    priceVnd: dish.price?.value ?? 0,
    imageUrl: largestPhoto(dish.photos),
    categoryName,
    isAvailable: dish.is_available !== false,
  };
}

export function mapToScrapedShop(detailJson: unknown, dishesJson: unknown): ScrapedShop {
  const detail = detailJson as ShopDetailJson;
  const dishes = dishesJson as DishesJson;

  if (detail.result !== "success" || dishes.result !== "success") {
    throw new Error("ShopeeFood API returned a non-success result");
  }

  const items: ScrapedShopItem[] = [];
  for (const category of dishes.reply.menu_infos ?? []) {
    for (const dish of category.dishes ?? []) {
      items.push(mapItem(dish, category.dish_type_name));
    }
  }

  return {
    shopInfo: mapShopInfo(detail.reply.delivery_detail),
    items,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- shopeefood-mapper.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/features/shop-sync/adapters/shopeefood-mapper.ts \
  src/features/shop-sync/adapters/shopeefood-mapper.test.ts \
  src/features/shop-sync/adapters/fixtures/
git commit -m "feat(shop-sync): add ShopeeFood response mapper with fixtures"
```

---

### Task 6: ShopeeFood adapter (Playwright orchestration)

**Files:**
- Create: `src/features/shop-sync/adapters/shopeefood-adapter.ts`
- Modify: `package.json` (add `playwright-core` dependency)

**Interfaces:**
- Consumes: `ShopSourceAdapter` (adapters/types.ts), `mapToScrapedShop` (shopeefood-mapper.ts).
- Produces: `class ShopeefoodAdapter implements ShopSourceAdapter` with `fetchShop(sourceUrl: string): Promise<ScrapedShop>` — this is the adapter instance `sync-service.ts` (Task 8) will call. Also exports `resolveChromiumExecutablePath(): string` for reuse/testing.

This orchestration layer only wires a real browser to the already-tested pure mapper — it is deliberately thin and not unit-tested with a fake browser (that would just re-test Playwright itself). Its correctness is verified by the Task 13 Docker smoke check and, if desired, a manual run against the real shop URL.

- [ ] **Step 1: Add the dependency**

```bash
pnpm add playwright-core@^1.60.0
```

- [ ] **Step 2: Write `src/features/shop-sync/adapters/shopeefood-adapter.ts`**

```ts
import { chromium, type Browser } from "playwright-core";
import type { ScrapedShop } from "./types";
import type { ShopSourceAdapter } from "./types";
import { mapToScrapedShop } from "./shopeefood-mapper";

const SHOP_DETAIL_PATTERN = /gappapi\.deliverynow\.vn\/api\/delivery\/get_detail/;
const DISHES_PATTERN = /gappapi\.deliverynow\.vn\/api\/dish\/get_delivery_dishes/;
const NAVIGATION_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export function resolveChromiumExecutablePath(): string {
  return process.env.SHOPEEFOOD_SYNC_CHROMIUM_PATH || "/usr/bin/chromium-browser";
}

export class ShopeefoodAdapter implements ShopSourceAdapter {
  async fetchShop(sourceUrl: string): Promise<ScrapedShop> {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: resolveChromiumExecutablePath(),
      });
      const context = await browser.newContext({ userAgent: USER_AGENT });
      const page = await context.newPage();

      const detailPromise = page.waitForResponse(
        (res) => SHOP_DETAIL_PATTERN.test(res.url()) && res.status() === 200,
        { timeout: NAVIGATION_TIMEOUT_MS },
      );
      const dishesPromise = page.waitForResponse(
        (res) => DISHES_PATTERN.test(res.url()) && res.status() === 200,
        { timeout: NAVIGATION_TIMEOUT_MS },
      );

      await page.goto(sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      const [detailResponse, dishesResponse] = await Promise.all([detailPromise, dishesPromise]);
      const [detailJson, dishesJson] = await Promise.all([
        detailResponse.json(),
        dishesResponse.json(),
      ]);

      return mapToScrapedShop(detailJson, dishesJson);
    } catch (error) {
      throw new Error(
        `ShopeeFood adapter failed to fetch ${sourceUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      await browser?.close();
    }
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/shop-sync/adapters/shopeefood-adapter.ts
git commit -m "feat(shop-sync): add Playwright-backed ShopeeFood adapter"
```

---

### Task 7: Image store helper

**Files:**
- Create: `src/features/shop-sync/image-store.ts`
- Test: `src/features/shop-sync/image-store.test.ts`

**Interfaces:**
- Consumes: a Supabase client shaped like `{ storage: { from(bucket: string): { upload(...), getPublicUrl(...) } } }` (same admin client used elsewhere for Storage).
- Produces: `downloadAndStoreImage(adminClient, sourceUrl: string, pathPrefix: string): Promise<string>` returning the new public URL — used by Task 8 and Task 9.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadAndStoreImage } from "./image-store";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));

const fakeAdminClient = { storage: { from: mockFrom } } as never;

describe("downloadAndStoreImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://project.supabase.co/storage/v1/object/public/media/shop-sync/abc.jpg" },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as never;
  });

  it("downloads the source image and uploads it under the given prefix", async () => {
    const url = await downloadAndStoreImage(
      fakeAdminClient,
      "https://mms.img.susercontent.com/some-id@resize_ss240x240.jpg",
      "shop-sync/products/prod-1",
    );

    expect(mockFrom).toHaveBeenCalledWith("media");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^shop-sync\/products\/prod-1/),
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: "image/jpeg", upsert: true }),
    );
    expect(url).toBe("https://project.supabase.co/storage/v1/object/public/media/shop-sync/abc.jpg");
  });

  it("throws when the source fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as never;
    await expect(
      downloadAndStoreImage(fakeAdminClient, "https://example.com/missing.jpg", "shop-sync/products/prod-1"),
    ).rejects.toThrow(/404/);
  });

  it("throws when the storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "bucket full" } });
    await expect(
      downloadAndStoreImage(fakeAdminClient, "https://example.com/ok.jpg", "shop-sync/products/prod-1"),
    ).rejects.toThrow(/bucket full/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- image-store.test.ts`
Expected: FAIL — `./image-store` module does not exist yet.

- [ ] **Step 3: Write `src/features/shop-sync/image-store.ts`**

```ts
type StorageLikeClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: ArrayBuffer,
        options: { contentType: string; upsert: boolean },
      ): Promise<{ error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
};

const MEDIA_BUCKET = "media";

function extensionFromContentType(contentType: string | null): string {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  return ".jpg";
}

export async function downloadAndStoreImage(
  adminClient: StorageLikeClient,
  sourceUrl: string,
  pathPrefix: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${sourceUrl}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const bytes = await response.arrayBuffer();
  const storagePath = `${pathPrefix}${extensionFromContentType(contentType)}`;

  const { error } = await adminClient.storage.from(MEDIA_BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload image to ${storagePath}: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  return publicUrl;
}
```

Note: `upsert: true` and a deterministic `pathPrefix` (passed by the caller, e.g. including the product id) mean re-running with the same prefix overwrites the same storage object — combined with the "skip if source URL unchanged" check living in the caller (Task 8/9), this avoids both duplicate storage growth and unnecessary re-uploads.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- image-store.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/image-store.ts src/features/shop-sync/image-store.test.ts
git commit -m "feat(shop-sync): add image download/upload helper"
```

---

### Task 8: Sync service — catalog upsert/archive + run bookkeeping

**Files:**
- Create: `src/features/shop-sync/sync-service.ts`
- Test: `src/features/shop-sync/sync-service.test.ts`

**Interfaces:**
- Consumes: `ShopSourceAdapter`, `ScrapedShop` (adapters/types.ts); `ShopSyncSettings`, `ShopSyncRun` (types.ts); `downloadAndStoreImage` (image-store.ts).
- Produces: `runSync(adminClient, adapter: ShopSourceAdapter, settings: ShopSyncSettings, trigger: "scheduled" | "manual"): Promise<ShopSyncRun>` — called by Task 11 (admin action) and Task 12 (scheduler). This task covers the `targetCatalog` half; Task 9 adds the `targetShopInfo` half to the same function.

A fake adapter (not a real `ShopeefoodAdapter`) is used throughout — this task tests the sync logic, not scraping.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { runSync } from "./sync-service";
import type { ShopSourceAdapter, ScrapedShop } from "./adapters/types";
import type { ShopSyncSettings } from "./types";

vi.mock("./image-store", () => ({
  downloadAndStoreImage: vi.fn(async (_client, sourceUrl: string) => `https://media.test/${sourceUrl}`),
}));

function fakeAdapter(shop: ScrapedShop): ShopSourceAdapter {
  return { fetchShop: vi.fn().mockResolvedValue(shop) };
}

function baseSettings(overrides: Partial<ShopSyncSettings> = {}): ShopSyncSettings {
  return {
    id: "settings-1",
    source: "shopeefood",
    sourceUrl: "https://shopeefood.vn/now-food/shop/1303714",
    enabled: true,
    cronExpression: "0 3 * * *",
    targetCatalog: true,
    targetShopInfo: false,
    updatedAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function makeAdminClientMock() {
  const state: { products: Record<string, unknown>[] } = { products: [] };

  const runsInsertSelectSingle = vi.fn().mockResolvedValue({ data: { id: "run-1" }, error: null });
  const runsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const runItemsInsert = vi.fn().mockResolvedValue({ error: null });

  const categoriesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const categoriesInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "category-1" }, error: null });

  const productsSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const productsInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "product-1" }, error: null });
  const productsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const productsArchiveNotInEq = vi.fn().mockResolvedValue({ data: [], error: null });

  const variantsSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const variantsInsert = vi.fn().mockResolvedValue({ error: null });
  const variantsUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const imagesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const imagesInsert = vi.fn().mockResolvedValue({ error: null });
  const imagesUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const productCategoriesUpsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "shop_sync_runs") {
      return {
        insert: () => ({ select: () => ({ single: runsInsertSelectSingle }) }),
        update: () => ({ eq: runsUpdateEq }),
      };
    }
    if (table === "shop_sync_run_items") {
      return { insert: runItemsInsert };
    }
    if (table === "categories") {
      return {
        select: () => ({ ilike: () => ({ maybeSingle: categoriesSelectMaybeSingle }) }),
        insert: () => ({ select: () => ({ single: categoriesInsertSelectSingle }) }),
      };
    }
    if (table === "products") {
      // Two different query shapes land here: the existing-item lookup
      // (`select().eq().eq().maybeSingle()`) and the archive scan
      // (`select().eq().not(...)`, which resolves directly). Both start
      // with `select().eq()`, so the returned object supports both next steps.
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: productsSelectMaybeSingle }),
            not: productsArchiveNotInEq,
          }),
        }),
        insert: () => ({ select: () => ({ single: productsInsertSelectSingle }) }),
        update: () => ({ eq: productsUpdateEq }),
      };
    }
    if (table === "product_variants") {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: variantsSelectMaybeSingle }) }) }),
        insert: variantsInsert,
        update: () => ({ eq: variantsUpdateEq }),
      };
    }
    if (table === "product_images") {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: imagesSelectMaybeSingle }) }) }),
        insert: imagesInsert,
        update: () => ({ eq: imagesUpdateEq }),
      };
    }
    if (table === "product_categories") {
      return { upsert: productCategoriesUpsert };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    client: { from, storage: { from: vi.fn() } } as never,
    spies: {
      productsArchiveNotInEq,
      productsInsertSelectSingle,
      productsUpdateEq,
      variantsInsert,
      runsUpdateEq,
      runItemsInsert,
    },
  };
}

describe("runSync (catalog)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a product for a new ShopeeFood item", async () => {
    const shop: ScrapedShop = {
      shopInfo: {
        name: "Shop",
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        address: null,
        openingHours: null,
      },
      items: [
        {
          externalId: "293255211",
          name: "Cá Chẽm hấp Hồng kông",
          description: "Ngon",
          priceVnd: 350000,
          imageUrl: "https://mms.img.susercontent.com/x.jpg",
          categoryName: "Hải sản hấp",
          isAvailable: true,
        },
      ],
    };

    const { client, spies } = makeAdminClientMock();
    const run = await runSync(client, fakeAdapter(shop), baseSettings(), "manual");

    expect(spies.productsInsertSelectSingle).toHaveBeenCalled();
    expect(spies.variantsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "product-1",
        sku: "shopeefood-293255211",
        list_price: 350000,
        is_active: true,
      }),
    );
    expect(run.itemsCreated).toBe(1);
    expect(run.status).toBe("success");
  });

  it("records a failed run without throwing when the adapter fails", async () => {
    const { client } = makeAdminClientMock();
    const failingAdapter: ShopSourceAdapter = {
      fetchShop: vi.fn().mockRejectedValue(new Error("network down")),
    };

    const run = await runSync(client, failingAdapter, baseSettings(), "scheduled");

    expect(run.status).toBe("failed");
    expect(run.errorMessage).toContain("network down");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- sync-service.test.ts`
Expected: FAIL — `./sync-service` module does not exist yet.

- [ ] **Step 3: Write `src/features/shop-sync/sync-service.ts`**

```ts
import { downloadAndStoreImage } from "./image-store";
import type { ScrapedShopItem } from "./adapters/types";
import type { ShopSourceAdapter } from "./adapters/types";
import type { ShopSyncRun, ShopSyncSettings } from "./types";

// Minimal shape this service needs from the Supabase admin client — kept
// narrow so tests can supply a lightweight fake.
type SyncClient = {
  from: (table: string) => any;
  storage: { from: (bucket: string) => any };
};

const EXTERNAL_SOURCE = "shopeefood";

function makeSlug(name: string, externalId: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${externalId}`;
}

async function recordRunItem(
  client: SyncClient,
  runId: string,
  externalId: string,
  productId: string | null,
  action: "created" | "updated" | "archived" | "skipped" | "error",
  message: string | null,
): Promise<void> {
  await client.from("shop_sync_run_items").insert({
    run_id: runId,
    external_id: externalId,
    product_id: productId,
    action,
    message,
  });
}

async function findOrCreateCategory(client: SyncClient, categoryName: string | null): Promise<string | null> {
  if (!categoryName) return null;

  const { data: existing } = await client
    .from("categories")
    .select("id")
    .ilike("name", categoryName)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await client
    .from("categories")
    .insert({
      name: categoryName,
      slug: makeSlug(categoryName, Math.random().toString(36).slice(2, 8)),
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create category "${categoryName}": ${error.message}`);
  return created.id;
}

async function upsertProductImage(
  client: SyncClient,
  productId: string,
  imageUrl: string | null,
  existingSourceUrl: string | null,
): Promise<void> {
  if (!imageUrl || imageUrl === existingSourceUrl) return;

  const hostedUrl = await downloadAndStoreImage(client, imageUrl, `shop-sync/products/${productId}`);

  const { data: existingImage } = await client
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (existingImage) {
    await client.from("product_images").update({ url: hostedUrl }).eq("id", existingImage.id);
  } else {
    await client.from("product_images").insert({ product_id: productId, url: hostedUrl, sort_order: 0 });
  }
}

async function upsertVariant(client: SyncClient, productId: string, item: ScrapedShopItem): Promise<void> {
  const { data: existingVariant } = await client
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  const variantFields = {
    list_price: item.priceVnd,
    is_active: item.isAvailable,
  };

  if (existingVariant) {
    await client.from("product_variants").update(variantFields).eq("id", existingVariant.id);
  } else {
    await client.from("product_variants").insert({
      product_id: productId,
      sku: `${EXTERNAL_SOURCE}-${item.externalId}`,
      unit: "phần",
      is_weighable: false,
      ...variantFields,
    });
  }
}

async function syncItem(
  client: SyncClient,
  runId: string,
  item: ScrapedShopItem,
): Promise<"created" | "updated" | "error"> {
  try {
    const categoryId = await findOrCreateCategory(client, item.categoryName);

    const { data: existingProduct } = await client
      .from("products")
      .select("id, external_image_source_url")
      .eq("external_source", EXTERNAL_SOURCE)
      .eq("external_id", item.externalId)
      .maybeSingle();

    const status = item.isAvailable ? "published" : "draft";
    let productId: string;
    let action: "created" | "updated";

    if (existingProduct) {
      productId = existingProduct.id;
      action = "updated";
      await client
        .from("products")
        .update({
          name: item.name,
          short_description: item.description,
          description: item.description,
          status,
          external_image_source_url: item.imageUrl,
        })
        .eq("id", productId);
    } else {
      action = "created";
      const { data: created, error } = await client
        .from("products")
        .insert({
          slug: makeSlug(item.name, item.externalId),
          name: item.name,
          short_description: item.description,
          description: item.description,
          status,
          temperature_class: "ready",
          external_source: EXTERNAL_SOURCE,
          external_id: item.externalId,
          external_image_source_url: item.imageUrl,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create product: ${error.message}`);
      productId = created.id;
    }

    await upsertVariant(client, productId, item);
    await upsertProductImage(client, productId, item.imageUrl, existingProduct?.external_image_source_url ?? null);

    if (categoryId) {
      await client
        .from("product_categories")
        .upsert({ product_id: productId, category_id: categoryId }, { onConflict: "product_id,category_id", ignoreDuplicates: true });
    }

    await recordRunItem(client, runId, item.externalId, productId, action, null);
    return action;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRunItem(client, runId, item.externalId, null, "error", message);
    return "error";
  }
}

async function archiveMissingProducts(
  client: SyncClient,
  runId: string,
  seenExternalIds: string[],
): Promise<number> {
  const { data: toArchive } = await client
    .from("products")
    .select("id, external_id")
    .eq("external_source", EXTERNAL_SOURCE)
    .not("status", "eq", "archived");

  const rows = ((toArchive ?? []) as Array<{ id: string; external_id: string }>).filter(
    (row) => !seenExternalIds.includes(row.external_id),
  );

  for (const row of rows) {
    await client.from("products").update({ status: "archived" }).eq("id", row.id);
    await recordRunItem(client, runId, row.external_id, row.id, "archived", null);
  }

  return rows.length;
}

export async function runSync(
  adminClient: SyncClient,
  adapter: ShopSourceAdapter,
  settings: ShopSyncSettings,
  trigger: "scheduled" | "manual",
): Promise<ShopSyncRun> {
  const { data: runRow } = await adminClient
    .from("shop_sync_runs")
    .insert({ settings_id: settings.id, status: "running", trigger })
    .select("id")
    .single();
  const runId = runRow.id as string;

  try {
    const scraped = await adapter.fetchShop(settings.sourceUrl);

    let created = 0;
    let updated = 0;
    let errored = 0;
    let archived = 0;

    if (settings.targetCatalog) {
      const seenExternalIds: string[] = [];
      for (const item of scraped.items) {
        seenExternalIds.push(item.externalId);
        const outcome = await syncItem(adminClient, runId, item);
        if (outcome === "created") created++;
        else if (outcome === "updated") updated++;
        else errored++;
      }
      archived = await archiveMissingProducts(adminClient, runId, seenExternalIds);
    }

    await adminClient
      .from("shop_sync_runs")
      .update({
        status: "success",
        items_created: created,
        items_updated: updated,
        items_archived: archived,
        items_errored: errored,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      id: runId,
      settingsId: settings.id,
      status: "success",
      trigger,
      itemsCreated: created,
      itemsUpdated: updated,
      itemsArchived: archived,
      itemsErrored: errored,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await adminClient
      .from("shop_sync_runs")
      .update({ status: "failed", error_message: message, finished_at: new Date().toISOString() })
      .eq("id", runId);

    return {
      id: runId,
      settingsId: settings.id,
      status: "failed",
      trigger,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsArchived: 0,
      itemsErrored: 0,
      errorMessage: message,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- sync-service.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/sync-service.ts src/features/shop-sync/sync-service.test.ts
git commit -m "feat(shop-sync): add catalog sync service with run bookkeeping"
```

---

### Task 9: Sync service — shop info sync

**Files:**
- Modify: `src/features/shop-sync/sync-service.ts`
- Modify: `src/features/shop-sync/sync-service.test.ts`

**Interfaces:**
- Consumes: same as Task 8, plus writes to the `shop_profile` table.
- Produces: `runSync` now also honors `settings.targetShopInfo` (no new exported symbols).

- [ ] **Step 1: Write the failing test**

Add to `sync-service.test.ts` (extend `makeAdminClientMock` first):

```ts
  const shopProfileSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const shopProfileInsert = vi.fn().mockResolvedValue({ error: null });
  const shopProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });
```

and inside the `from` mock, add:

```ts
    if (table === "shop_profile") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: shopProfileSelectMaybeSingle }) }),
        insert: shopProfileInsert,
        update: () => ({ eq: shopProfileUpdateEq }),
      };
    }
```

then export the new spies from `spies` and add the test:

```ts
  it("creates a shop_profile row when targetShopInfo is enabled", async () => {
    const shop: ScrapedShop = {
      shopInfo: {
        name: "Cơm Nhà Vị Quê",
        logoUrl: "https://mms.img.susercontent.com/logo.jpg",
        coverImageUrl: "https://mms.img.susercontent.com/cover.jpg",
        description: null,
        address: "123 Đường ABC",
        openingHours: "Thứ Hai: 07:30–20:00",
      },
      items: [],
    };

    const { client, spies } = makeAdminClientMock();
    const settings = baseSettings({ targetCatalog: false, targetShopInfo: true });
    const run = await runSync(client, fakeAdapter(shop), settings, "manual");

    expect(spies.shopProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "shopeefood",
        name: "Cơm Nhà Vị Quê",
        address: "123 Đường ABC",
      }),
    );
    expect(run.status).toBe("success");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- sync-service.test.ts`
Expected: FAIL — no `shop_profile` write happens yet.

- [ ] **Step 3: Add shop-info sync to `sync-service.ts`**

Add this function and call it from `runSync`:

```ts
async function syncShopProfile(client: SyncClient, shopInfo: import("./adapters/types").ScrapedShopInfo): Promise<void> {
  const { data: existing } = await client
    .from("shop_profile")
    .select("id, logo_source_url, cover_image_source_url")
    .eq("source", EXTERNAL_SOURCE)
    .maybeSingle();

  const logoUrl =
    shopInfo.logoUrl && shopInfo.logoUrl !== existing?.logo_source_url
      ? await downloadAndStoreImage(client, shopInfo.logoUrl, "shop-sync/shop-profile/logo")
      : undefined;
  const coverImageUrl =
    shopInfo.coverImageUrl && shopInfo.coverImageUrl !== existing?.cover_image_source_url
      ? await downloadAndStoreImage(client, shopInfo.coverImageUrl, "shop-sync/shop-profile/cover")
      : undefined;

  const fields = {
    source: EXTERNAL_SOURCE,
    name: shopInfo.name,
    description: shopInfo.description,
    address: shopInfo.address,
    opening_hours: shopInfo.openingHours,
    updated_at: new Date().toISOString(),
    ...(logoUrl ? { logo_url: logoUrl, logo_source_url: shopInfo.logoUrl } : {}),
    ...(coverImageUrl ? { cover_image_url: coverImageUrl, cover_image_source_url: shopInfo.coverImageUrl } : {}),
  };

  if (existing) {
    await client.from("shop_profile").update(fields).eq("id", existing.id);
  } else {
    await client.from("shop_profile").insert(fields);
  }
}
```

In `runSync`, inside the `try` block, right after computing `scraped`, add:

```ts
    if (settings.targetShopInfo) {
      await syncShopProfile(adminClient, scraped.shopInfo);
    }
```

(placed before the `if (settings.targetCatalog)` block).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- sync-service.test.ts`
Expected: PASS, all tests green (catalog tests from Task 8 must still pass).

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/sync-service.ts src/features/shop-sync/sync-service.test.ts
git commit -m "feat(shop-sync): sync shop info (name/logo/cover/address/hours)"
```

---

### Task 10: Queries

**Files:**
- Create: `src/features/shop-sync/queries.ts`
- Test: `src/features/shop-sync/queries.test.ts`

**Interfaces:**
- Consumes: a Supabase client (same shape as elsewhere in the codebase — `SupabaseClient` from `@supabase/supabase-js`).
- Produces: `getShopSyncSettings(client): Promise<ShopSyncSettings | null>`, `listShopSyncRuns(client, limit = 20): Promise<ShopSyncRun[]>`, `getShopSyncRunWithItems(client, runId: string): Promise<{ run: ShopSyncRun; items: ShopSyncRunItem[] } | null>` — consumed by Task 14 (admin pages).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { getShopSyncSettings, listShopSyncRuns, getShopSyncRunWithItems } from "./queries";

function clientReturning(row: unknown, table: string) {
  return {
    from: vi.fn((t: string) => {
      if (t !== table) throw new Error(`unexpected table ${t}`);
      return {
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
          order: () => ({ limit: () => Promise.resolve({ data: row, error: null }) }),
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
        }),
      };
    }),
  } as never;
}

describe("getShopSyncSettings", () => {
  it("maps a settings row to camelCase", async () => {
    const client = clientReturning(
      {
        id: "s1",
        source: "shopeefood",
        source_url: "https://shopeefood.vn/x",
        enabled: true,
        cron_expression: "0 3 * * *",
        target_catalog: true,
        target_shop_info: false,
        updated_at: "2026-08-30T00:00:00Z",
      },
      "shop_sync_settings",
    );

    const result = await getShopSyncSettings(client);
    expect(result).toEqual({
      id: "s1",
      source: "shopeefood",
      sourceUrl: "https://shopeefood.vn/x",
      enabled: true,
      cronExpression: "0 3 * * *",
      targetCatalog: true,
      targetShopInfo: false,
      updatedAt: "2026-08-30T00:00:00Z",
    });
  });

  it("returns null when no settings row exists", async () => {
    const client = clientReturning(null, "shop_sync_settings");
    expect(await getShopSyncSettings(client)).toBeNull();
  });
});

describe("listShopSyncRuns", () => {
  it("maps run rows to camelCase", async () => {
    const client = clientReturning(
      [
        {
          id: "r1",
          settings_id: "s1",
          status: "success",
          trigger: "manual",
          items_created: 2,
          items_updated: 1,
          items_archived: 0,
          items_errored: 0,
          error_message: null,
          started_at: "2026-08-30T00:00:00Z",
          finished_at: "2026-08-30T00:01:00Z",
        },
      ],
      "shop_sync_runs",
    );

    const result = await listShopSyncRuns(client);
    expect(result).toEqual([
      {
        id: "r1",
        settingsId: "s1",
        status: "success",
        trigger: "manual",
        itemsCreated: 2,
        itemsUpdated: 1,
        itemsArchived: 0,
        itemsErrored: 0,
        errorMessage: null,
        startedAt: "2026-08-30T00:00:00Z",
        finishedAt: "2026-08-30T00:01:00Z",
      },
    ]);
  });
});

describe("getShopSyncRunWithItems", () => {
  it("returns null when the run does not exist", async () => {
    const client = {
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      })),
    } as never;
    expect(await getShopSyncRunWithItems(client, "missing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- shop-sync/queries.test.ts`
Expected: FAIL — `./queries` module does not exist yet.

- [ ] **Step 3: Write `src/features/shop-sync/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShopSyncRun, ShopSyncRunItem, ShopSyncSettings } from "./types";

type SettingsRow = {
  id: string;
  source: string;
  source_url: string;
  enabled: boolean;
  cron_expression: string;
  target_catalog: boolean;
  target_shop_info: boolean;
  updated_at: string;
};

type RunRow = {
  id: string;
  settings_id: string;
  status: "running" | "success" | "failed";
  trigger: "scheduled" | "manual";
  items_created: number;
  items_updated: number;
  items_archived: number;
  items_errored: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

type RunItemRow = {
  id: string;
  run_id: string;
  external_id: string;
  product_id: string | null;
  action: ShopSyncRunItem["action"];
  message: string | null;
};

function mapSettings(row: SettingsRow): ShopSyncSettings {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    enabled: row.enabled,
    cronExpression: row.cron_expression,
    targetCatalog: row.target_catalog,
    targetShopInfo: row.target_shop_info,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow): ShopSyncRun {
  return {
    id: row.id,
    settingsId: row.settings_id,
    status: row.status,
    trigger: row.trigger,
    itemsCreated: row.items_created,
    itemsUpdated: row.items_updated,
    itemsArchived: row.items_archived,
    itemsErrored: row.items_errored,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function mapRunItem(row: RunItemRow): ShopSyncRunItem {
  return {
    id: row.id,
    runId: row.run_id,
    externalId: row.external_id,
    productId: row.product_id,
    action: row.action,
    message: row.message,
  };
}

export async function getShopSyncSettings(
  client: Pick<SupabaseClient, "from">,
): Promise<ShopSyncSettings | null> {
  const { data, error } = await client
    .from("shop_sync_settings")
    .select("id, source, source_url, enabled, cron_expression, target_catalog, target_shop_info, updated_at")
    .maybeSingle();

  if (error) throw error;
  return data ? mapSettings(data as SettingsRow) : null;
}

export async function listShopSyncRuns(
  client: Pick<SupabaseClient, "from">,
  limit = 20,
): Promise<ShopSyncRun[]> {
  const { data, error } = await client
    .from("shop_sync_runs")
    .select(
      "id, settings_id, status, trigger, items_created, items_updated, items_archived, items_errored, error_message, started_at, finished_at",
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as RunRow[]).map(mapRun);
}

export async function getShopSyncRunWithItems(
  client: Pick<SupabaseClient, "from">,
  runId: string,
): Promise<{ run: ShopSyncRun; items: ShopSyncRunItem[] } | null> {
  const { data: runRow, error: runError } = await client
    .from("shop_sync_runs")
    .select(
      "id, settings_id, status, trigger, items_created, items_updated, items_archived, items_errored, error_message, started_at, finished_at",
    )
    .eq("id", runId)
    .maybeSingle();

  if (runError) throw runError;
  if (!runRow) return null;

  const { data: itemRows, error: itemsError } = await client
    .from("shop_sync_run_items")
    .select("id, run_id, external_id, product_id, action, message")
    .eq("run_id", runId);

  if (itemsError) throw itemsError;

  return {
    run: mapRun(runRow as RunRow),
    items: ((itemRows ?? []) as RunItemRow[]).map(mapRunItem),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- shop-sync/queries.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/queries.ts src/features/shop-sync/queries.test.ts
git commit -m "feat(shop-sync): add read queries for settings and run history"
```

---

### Task 11: Admin actions

**Files:**
- Create: `src/features/shop-sync/admin-actions.ts`
- Test: `src/features/shop-sync/admin-actions.test.ts`

**Interfaces:**
- Consumes: `requireAdminPermission` (`@/src/features/admin/auth`), `parseShopSyncSettingsForm` (schema.ts), `runSync` (sync-service.ts), `ShopeefoodAdapter` (adapters/shopeefood-adapter.ts).
- Produces: `type ShopSyncSettingsState = { error: string } | null`, `updateShopSyncSettings(prev, formData): Promise<ShopSyncSettingsState>`, `triggerShopSyncNow(): Promise<{ error: string } | { runId: string }>` — consumed by Task 14 (admin UI).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRunSync = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}));
vi.mock("@/src/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, storage: { from: vi.fn() } })),
}));
vi.mock("./sync-service", () => ({ runSync: mockRunSync }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateShopSyncSettings, triggerShopSyncNow } from "./admin-actions";

function grantSuperAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "user_admin_roles") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
        }),
      };
    }
    if (table === "shop_sync_settings") {
      return {
        select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "settings-1" }, error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

describe("updateShopSyncSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid sourceUrl before touching the database", async () => {
    grantSuperAdmin();
    const fd = new FormData();
    fd.set("sourceUrl", "not-a-url");
    fd.set("cronExpression", "0 3 * * *");
    const result = await updateShopSyncSettings(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("URL") });
  });

  it("saves valid settings", async () => {
    grantSuperAdmin();
    const fd = new FormData();
    fd.set("sourceUrl", "https://shopeefood.vn/now-food/shop/1303714");
    fd.set("cronExpression", "0 3 * * *");
    fd.set("enabled", "on");
    fd.set("targetCatalog", "on");
    fd.set("targetShopInfo", "on");
    const result = await updateShopSyncSettings(null, fd);
    expect(result).toBeNull();
  });
});

describe("triggerShopSyncNow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an error when no settings exist yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
          }),
        };
      }
      if (table === "shop_sync_settings") {
        return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await triggerShopSyncNow();
    expect(result).toEqual({ error: expect.stringContaining("not configured") });
  });

  it("runs the sync and returns the run id when settings exist", async () => {
    grantSuperAdmin();
    mockRunSync.mockResolvedValue({ id: "run-1" });
    const result = await triggerShopSyncNow();
    expect(mockRunSync).toHaveBeenCalled();
    expect(result).toEqual({ runId: "run-1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- shop-sync/admin-actions.test.ts`
Expected: FAIL — `./admin-actions` module does not exist yet.

- [ ] **Step 3: Write `src/features/shop-sync/admin-actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { parseShopSyncSettingsForm } from "./schema";
import { getShopSyncSettings } from "./queries";
import { runSync } from "./sync-service";
import { ShopeefoodAdapter } from "./adapters/shopeefood-adapter";

export type ShopSyncSettingsState = { error: string } | null;
export type ShopSyncTriggerResult = { error: string } | { runId: string };

const SOURCE = "shopeefood";

export async function updateShopSyncSettings(
  _prev: ShopSyncSettingsState,
  formData: FormData,
): Promise<ShopSyncSettingsState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const parsed = parseShopSyncSettingsForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await client.from("shop_sync_settings").upsert(
    {
      source: SOURCE,
      source_url: parsed.data.sourceUrl,
      enabled: parsed.data.enabled,
      cron_expression: parsed.data.cronExpression,
      target_catalog: parsed.data.targetCatalog,
      target_shop_info: parsed.data.targetShopInfo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source" },
  );

  if (error) return { error: error.message };

  revalidatePath("/admin/shop-sync");
  return null;
}

export async function triggerShopSyncNow(): Promise<ShopSyncTriggerResult> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const settings = await getShopSyncSettings(client);
  if (!settings) {
    return { error: "Shop sync is not configured yet — save settings first." };
  }

  const adminClient = createAdminClient();
  const run = await runSync(adminClient, new ShopeefoodAdapter(), settings, "manual");

  revalidatePath("/admin/shop-sync");
  return { runId: run.id };
}
```

This relies on the `shop_sync_settings_source_key` unique index from Task 1, which makes `upsert(..., { onConflict: "source" })` behave as a true singleton-per-source upsert.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- shop-sync/admin-actions.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/shop-sync/admin-actions.ts src/features/shop-sync/admin-actions.test.ts
git commit -m "feat(shop-sync): add settings + run-now admin actions"
```

---

### Task 12: Scheduler + instrumentation wiring

**Files:**
- Create: `src/features/shop-sync/scheduler.ts`
- Create: `instrumentation.ts`
- Test: `src/features/shop-sync/scheduler.test.ts`

**Interfaces:**
- Consumes: `getShopSyncSettings` (queries.ts), `runSync` (sync-service.ts), `ShopeefoodAdapter` (adapters/shopeefood-adapter.ts), `createAdminClient` (`@/src/lib/supabase/admin`).
- Produces: `startShopSyncScheduler(): void` — called once from `instrumentation.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSchedule = vi.fn();
vi.mock("node-cron", () => ({ default: { schedule: mockSchedule }, schedule: mockSchedule }));

const mockGetShopSyncSettings = vi.fn();
vi.mock("./queries", () => ({ getShopSyncSettings: mockGetShopSyncSettings }));

const mockRunSync = vi.fn();
vi.mock("./sync-service", () => ({ runSync: mockRunSync }));

vi.mock("@/src/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));

import { startShopSyncScheduler } from "./scheduler";

describe("startShopSyncScheduler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not schedule anything when no settings exist", async () => {
    mockGetShopSyncSettings.mockResolvedValue(null);
    await startShopSyncScheduler();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("does not schedule anything when sync is disabled", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: false, cronExpression: "0 3 * * *" });
    await startShopSyncScheduler();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("schedules the job on the configured cron expression when enabled", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "0 3 * * *" });
    await startShopSyncScheduler();
    expect(mockSchedule).toHaveBeenCalledWith("0 3 * * *", expect.any(Function));
  });

  it("skips a run if the previous scheduled run is still in flight", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "* * * * *" });
    let resolveFirstRun: () => void = () => {};
    mockRunSync.mockImplementation(
      () => new Promise((resolve) => (resolveFirstRun = () => resolve({ id: "run-1" }))),
    );

    await startShopSyncScheduler();
    const scheduledFn = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    const firstCall = scheduledFn();
    const secondCall = scheduledFn(); // fires while first is still running
    resolveFirstRun();
    await Promise.all([firstCall, secondCall]);

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- scheduler.test.ts`
Expected: FAIL — neither `node-cron` nor `./scheduler` exist yet.

- [ ] **Step 3: Add the dependency and write `scheduler.ts`**

```bash
pnpm add node-cron
pnpm add -D @types/node-cron
```

`src/features/shop-sync/scheduler.ts`:

```ts
import cron from "node-cron";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { getShopSyncSettings } from "./queries";
import { runSync } from "./sync-service";
import { ShopeefoodAdapter } from "./adapters/shopeefood-adapter";

export async function startShopSyncScheduler(): Promise<void> {
  const adminClient = createAdminClient();
  const settings = await getShopSyncSettings(adminClient);

  if (!settings || !settings.enabled) return;

  let runInFlight = false;

  cron.schedule(settings.cronExpression, async () => {
    if (runInFlight) return;
    runInFlight = true;
    try {
      const latestSettings = await getShopSyncSettings(adminClient);
      if (!latestSettings || !latestSettings.enabled) return;
      await runSync(adminClient, new ShopeefoodAdapter(), latestSettings, "scheduled");
    } finally {
      runInFlight = false;
    }
  });
}
```

`instrumentation.ts` (project root, alongside `next.config.ts`):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startShopSyncScheduler } = await import("./src/features/shop-sync/scheduler");
    await startShopSyncScheduler();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- scheduler.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml instrumentation.ts \
  src/features/shop-sync/scheduler.ts src/features/shop-sync/scheduler.test.ts
git commit -m "feat(shop-sync): add in-process scheduler wired via instrumentation.ts"
```

---

### Task 13: Docker/Playwright production wiring

**Files:**
- Modify: `Dockerfile`

**Interfaces:** none (infra only).

Alpine's bundled `chromium` package is required because Playwright's own downloaded Chromium build targets glibc and does not run reliably on Alpine's musl libc — this is why Task 6 used `playwright-core` (no bundled browser download) plus `executablePath` instead of the full `playwright` package.

- [ ] **Step 1: Add Chromium to the runner stage**

In `Dockerfile`, in the `FROM node:22-alpine AS runner` stage, add this line right after `WORKDIR /app`:

```dockerfile
RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont
```

And add this env var alongside the existing `ENV` lines in that stage:

```dockerfile
ENV SHOPEEFOOD_SYNC_CHROMIUM_PATH=/usr/bin/chromium-browser
```

- [ ] **Step 2: Build the image and smoke-test Chromium launches**

Run: `docker build -t web-store-shop-sync-check .`
Expected: build succeeds (no missing-package errors during `apk add`).

Run: `docker run --rm web-store-shop-sync-check node -e "require('playwright-core').chromium.launch({executablePath: process.env.SHOPEEFOOD_SYNC_CHROMIUM_PATH, headless: true}).then(b => b.close()).then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"`
Expected: prints `OK` with no error.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat(shop-sync): install Chromium in the production image for the ShopeeFood adapter"
```

---

### Task 14: Admin UI + nav link + e2e smoke test

**Files:**
- Create: `app/admin/shop-sync/page.tsx`
- Create: `app/admin/shop-sync/runs/[id]/page.tsx`
- Create: `components/admin/shop-sync-settings-form.tsx`
- Modify: `components/admin/admin-nav.tsx`
- Test: `tests/e2e/admin-shop-sync.spec.ts`

**Interfaces:**
- Consumes: `getShopSyncSettings`, `listShopSyncRuns`, `getShopSyncRunWithItems` (queries.ts); `updateShopSyncSettings`, `triggerShopSyncNow` (admin-actions.ts); `shouldUseAdminPlaywrightFixture` (`@/src/features/admin/dashboard`); `AdminPageHeader`, `AdminDataTable`, `StatusChip` (existing `components/admin/*`).

- [ ] **Step 1: Add the nav link**

In `components/admin/admin-nav.tsx`, add to `adminLinks` (right after `/admin/content`):

```ts
  { href: "/admin/shop-sync", label: "Đồng bộ ShopeeFood" },
```

- [ ] **Step 2: Write `components/admin/shop-sync-settings-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import type { ShopSyncSettingsState } from "@/src/features/shop-sync/admin-actions";

type InitialValues = {
  sourceUrl: string;
  enabled: boolean;
  cronExpression: string;
  targetCatalog: boolean;
  targetShopInfo: boolean;
};

type ShopSyncSettingsFormProps = {
  action: (prev: ShopSyncSettingsState, formData: FormData) => Promise<ShopSyncSettingsState>;
  initialValues: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function ShopSyncSettingsForm({ action, initialValues }: ShopSyncSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ShopSyncSettingsState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="sourceUrl">
        <span className="font-medium text-slate-700">URL shop ShopeeFood</span>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          required
          defaultValue={initialValues.sourceUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="cronExpression">
        <span className="font-medium text-slate-700">Lịch chạy (cron)</span>
        <input
          id="cronExpression"
          name="cronExpression"
          type="text"
          required
          defaultValue={initialValues.cronExpression}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={initialValues.enabled} />
        <span className="font-medium text-slate-700">Bật đồng bộ tự động</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="targetCatalog" defaultChecked={initialValues.targetCatalog} />
        <span className="font-medium text-slate-700">Đồng bộ sản phẩm (menu)</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="targetShopInfo" defaultChecked={initialValues.targetShopInfo} />
        <span className="font-medium text-slate-700">Đồng bộ thông tin shop</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Đang lưu…" : "Lưu cài đặt"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Write `app/admin/shop-sync/page.tsx`**

```tsx
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { ShopSyncSettingsForm } from "@/components/admin/shop-sync-settings-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getShopSyncSettings, listShopSyncRuns } from "@/src/features/shop-sync/queries";
import { updateShopSyncSettings, triggerShopSyncNow } from "@/src/features/shop-sync/admin-actions";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  status: string;
  trigger: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsArchived: number;
  startedAt: string;
};

function runStatusTone(status: string): StatusChipTone {
  if (status === "success") return "success";
  if (status === "failed") return "error" as StatusChipTone;
  return "warning";
}

async function getPageData() {
  if (shouldUseAdminPlaywrightFixture()) {
    return {
      access: "allowed" as const,
      settings: null,
      runs: [] as RunRow[],
    };
  }

  const client = await createServerClient();
  try {
    await requireAdminPermission(client, "shop_sync:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const [settings, runs] = await Promise.all([getShopSyncSettings(client), listShopSyncRuns(client)]);

  return {
    access: "allowed" as const,
    settings,
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      itemsCreated: r.itemsCreated,
      itemsUpdated: r.itemsUpdated,
      itemsArchived: r.itemsArchived,
      startedAt: r.startedAt.slice(0, 16).replace("T", " "),
    })),
  };
}

export default async function ShopSyncPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Đồng bộ ShopeeFood" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý đồng bộ ShopeeFood.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Đồng bộ ShopeeFood"
        description="Tự động đồng bộ sản phẩm và thông tin shop từ ShopeeFood theo lịch."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Cài đặt</h2>
        <ShopSyncSettingsForm
          action={updateShopSyncSettings}
          initialValues={{
            sourceUrl: data.settings?.sourceUrl ?? "https://shopeefood.vn/now-food/shop/1303714",
            enabled: data.settings?.enabled ?? false,
            cronExpression: data.settings?.cronExpression ?? "0 3 * * *",
            targetCatalog: data.settings?.targetCatalog ?? true,
            targetShopInfo: data.settings?.targetShopInfo ?? true,
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Lịch sử chạy</h2>
          <form action={triggerShopSyncNow}>
            <button
              type="submit"
              className="inline-flex min-h-9 items-center rounded-lg border border-teal-700 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Chạy ngay
            </button>
          </form>
        </div>
        <AdminDataTable<RunRow>
          columns={[
            { key: "startedAt", label: "Thời gian" },
            { key: "trigger", label: "Loại" },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => <StatusChip value={row.status} tone={runStatusTone(row.status)} />,
            },
            { key: "itemsCreated", label: "Đã tạo" },
            { key: "itemsUpdated", label: "Đã cập nhật" },
            { key: "itemsArchived", label: "Đã lưu trữ" },
          ]}
          rows={data.runs}
          emptyMessage="Chưa có lượt đồng bộ nào."
          actionsSlot={(row) => (
            <Link href={`/admin/shop-sync/runs/${row.id}`} className="text-sm font-medium text-teal-700">
              Xem chi tiết
            </Link>
          )}
        />
      </section>
    </div>
  );
}
```

Check `components/admin/status-chip.tsx` for the exact `StatusChipTone` union before writing `runStatusTone` — if `"error"` is not one of its members, use the closest existing tone (e.g. `"danger"` or `"warning"`) instead of adding a new one.

- [ ] **Step 4: Write `app/admin/shop-sync/runs/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { getShopSyncRunWithItems } from "@/src/features/shop-sync/queries";

export const dynamic = "force-dynamic";

type RunItemRow = {
  externalId: string;
  action: string;
  message: string;
};

type RunDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopSyncRunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const client = await createServerClient();
  try {
    await requireAdminPermission(client, "shop_sync:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Chi tiết lượt đồng bộ" />
          <p className="text-sm text-slate-600">Bạn không có quyền xem chi tiết đồng bộ.</p>
        </div>
      );
    }
    throw error;
  }

  const result = await getShopSyncRunWithItems(client, id);
  if (!result) notFound();

  const rows: RunItemRow[] = result.items.map((item) => ({
    externalId: item.externalId,
    action: item.action,
    message: item.message ?? "",
  }));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Chi tiết lượt đồng bộ"
        description={`Trạng thái: ${result.run.status} · ${result.run.itemsCreated} tạo mới, ${result.run.itemsUpdated} cập nhật, ${result.run.itemsArchived} lưu trữ, ${result.run.itemsErrored} lỗi.`}
      />
      <AdminDataTable<RunItemRow>
        columns={[
          { key: "externalId", label: "Mã ShopeeFood" },
          { key: "action", label: "Hành động" },
          { key: "message", label: "Ghi chú" },
        ]}
        rows={rows}
        emptyMessage="Không có mục nào trong lượt đồng bộ này."
      />
    </div>
  );
}
```

- [ ] **Step 5: Write the e2e smoke test**

`tests/e2e/admin-shop-sync.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("admin shop sync", () => {
  test("renders the shop sync settings page", async ({ page }) => {
    await page.goto("/admin/shop-sync");
    await expect(page.getByRole("heading", { name: "Đồng bộ ShopeeFood" })).toBeVisible();
    await expect(page.getByLabel("URL shop ShopeeFood")).toBeVisible();
    await expect(page.getByText("Chưa có lượt đồng bộ nào.")).toBeVisible();
  });

  test("shop sync link appears in the admin nav", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Đồng bộ ShopeeFood" })).toBeVisible();
  });
});
```

- [ ] **Step 6: Run the e2e test**

Run: `pnpm exec playwright test admin-shop-sync.spec.ts`
Expected: PASS, both tests green (relies on the same `shouldUseAdminPlaywrightFixture()` bypass the existing admin e2e suite already uses — confirm `.env.test`/Playwright config sets `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key` the same way the passing `admin-order-flow.spec.ts` suite does; if not already the case, check `playwright.config.ts` `webServer.env` before debugging further).

- [ ] **Step 7: Run the full test suite and lint**

Run: `pnpm test && pnpm lint`
Expected: all unit tests pass, no lint errors.

- [ ] **Step 8: Commit**

```bash
git add app/admin/shop-sync components/admin/shop-sync-settings-form.tsx \
  components/admin/admin-nav.tsx tests/e2e/admin-shop-sync.spec.ts
git commit -m "feat(shop-sync): add admin settings/run-history UI and nav link"
```

---

## Post-plan manual verification (not a task — do after Task 14)

1. Run `bash scripts/migrate.sh --local`, then `pnpm dev`.
2. Visit `/admin/shop-sync`, save real settings with `sourceUrl = https://shopeefood.vn/now-food/shop/1303714`, `enabled` on.
3. Click "Chạy ngay" and confirm a run appears with `success` status and non-zero `itemsCreated`.
4. Check `/admin/products` for the newly created products, and check that a second manual run updates the same rows (`itemsUpdated` > 0, `itemsCreated` = 0) rather than duplicating them.
5. Confirm `Dockerfile` changes with a real `docker-compose.prod.yml` build before shipping to the production host (Task 13's smoke test covers the Chromium launch in isolation, not the full compose stack).
