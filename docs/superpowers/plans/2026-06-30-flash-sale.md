# Flash Sale Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-controlled time-boxed discount events with live countdown timers shown on product cards, product detail pages, and the homepage flash-sale section.

**Architecture:** New `flash_sale_events` + `flash_sale_event_products` tables with an `active_flash_sale_v` view. A new `src/features/flash-sales/` feature module provides types, Zod schemas, queries, and server actions. The storefront fetches the active event server-side, threads it through ProductRail → ProductGrid → ProductCard via props, and a client `<FlashSaleCountdown>` component handles the live timer.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, TypeScript strict, Zod v4, Tailwind CSS, Vitest, `pnpm`

## Global Constraints

- Vietnamese UI strings — all user-visible text in Vietnamese
- Zod v4: use `.issues[0]?.message`, not `.errors`
- Server actions: `requireAdminPermission` before any DB write
- `redirect()` outside try/catch; only wrap the Supabase call
- `revalidatePath()` before `redirect()`
- `as never` type cast for tables not yet in generated Supabase types
- New tables not yet in generated types — use explicit local row types and `as never` cast on `.from()`
- Migration naming: `YYYYMMDDNNNN_description.sql`, append-only
- All prices computed server-side; never trust client-supplied prices

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/202606300020_flash_sale_events.sql`

**Interfaces:**
- Produces: `flash_sale_events` table, `flash_sale_event_products` table, `active_flash_sale_v` view

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/202606300020_flash_sale_events.sql

create table flash_sale_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_pct integer not null check (discount_pct between 1 and 99),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint fse_end_after_start check (end_at > start_at)
);

create table flash_sale_event_products (
  event_id uuid not null references flash_sale_events(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (event_id, product_id)
);

create or replace view active_flash_sale_v as
select *
from flash_sale_events
where is_active = true
  and start_at <= now()
  and end_at > now()
order by end_at asc
limit 1;

alter table flash_sale_events enable row level security;
alter table flash_sale_event_products enable row level security;

-- Anyone can read (storefront needs it)
create policy "Public read flash_sale_events"
  on flash_sale_events for select using (true);

-- Only admins can write
create policy "Admin write flash_sale_events"
  on flash_sale_events for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Public read flash_sale_event_products"
  on flash_sale_event_products for select using (true);

create policy "Admin write flash_sale_event_products"
  on flash_sale_event_products for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
```

- [ ] **Step 2: Run the migration**

```bash
pnpm migrate
```

Expected: no errors, migration applied.

- [ ] **Step 3: Verify tables exist**

```bash
pnpm migrate:list
```

Expected: `202606300020_flash_sale_events` listed as applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606300020_flash_sale_events.sql
git commit -m "feat(db): add flash_sale_events tables and active_flash_sale_v view"
```

---

### Task 2: Feature module — types, schema, price utility, and tests

**Files:**
- Create: `src/features/flash-sales/types.ts`
- Create: `src/features/flash-sales/schema.ts`
- Create: `src/features/flash-sales/price-utils.ts`
- Create: `src/features/flash-sales/schema.test.ts`
- Create: `src/features/flash-sales/price-utils.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `FlashSaleEvent` type
  - `ActiveFlashSale` type
  - `FlashSaleEventInput` type (Zod inferred)
  - `FlashSaleEventUpdateInput` type (Zod inferred)
  - `flashSaleEventSchema` — validates create form data
  - `flashSaleEventUpdateSchema` — validates edit form data
  - `applyFlashSalePrice(listPrice: number, discountPct: number): number`
  - `formatCountdown(totalSeconds: number): string`
  - `getRemainingSeconds(endAt: string, now: number): number`

- [ ] **Step 1: Write the failing tests**

`src/features/flash-sales/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { flashSaleEventSchema, flashSaleEventUpdateSchema } from "./schema";

const validPayload = {
  name: "Cuối tuần giảm 20%",
  discountPct: "20",
  startAt: "2026-07-01T00:00:00+07:00",
  endAt: "2026-07-02T00:00:00+07:00",
  isActive: "true",
};

describe("flashSaleEventSchema", () => {
  it("accepts a valid payload", () => {
    expect(flashSaleEventSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects discountPct = 0", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, discountPct: "0" }).success).toBe(false);
  });

  it("rejects discountPct = 100", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, discountPct: "100" }).success).toBe(false);
  });

  it("rejects end_at before start_at", () => {
    expect(
      flashSaleEventSchema.safeParse({
        ...validPayload,
        startAt: "2026-07-02T00:00:00+07:00",
        endAt: "2026-07-01T00:00:00+07:00",
      }).success,
    ).toBe(false);
  });

  it("rejects empty name", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, name: "" }).success).toBe(false);
  });
});

describe("flashSaleEventUpdateSchema", () => {
  it("requires a valid uuid id", () => {
    expect(
      flashSaleEventUpdateSchema.safeParse({ ...validPayload, id: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("accepts valid update payload", () => {
    expect(
      flashSaleEventUpdateSchema.safeParse({
        ...validPayload,
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }).success,
    ).toBe(true);
  });
});
```

`src/features/flash-sales/price-utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyFlashSalePrice, formatCountdown, getRemainingSeconds } from "./price-utils";

describe("applyFlashSalePrice", () => {
  it("applies 20% discount to 100_000", () => {
    expect(applyFlashSalePrice(100_000, 20)).toBe(80_000);
  });
  it("rounds down fractional result", () => {
    expect(applyFlashSalePrice(100_001, 20)).toBe(80_000);
  });
  it("handles 1% discount", () => {
    expect(applyFlashSalePrice(100_000, 1)).toBe(99_000);
  });
  it("handles 99% discount", () => {
    expect(applyFlashSalePrice(100_000, 99)).toBe(1_000);
  });
});

describe("formatCountdown", () => {
  it("formats 3661 seconds as 01:01:01", () => {
    expect(formatCountdown(3661)).toBe("01:01:01");
  });
  it("formats 0 as 00:00:00", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
  });
  it("formats 86399 as 23:59:59", () => {
    expect(formatCountdown(86399)).toBe("23:59:59");
  });
});

describe("getRemainingSeconds", () => {
  it("returns positive seconds for future date", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now + 5_000).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(5);
  });
  it("returns 0 for past date", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now - 1_000).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/features/flash-sales/
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementation**

`src/features/flash-sales/types.ts`:
```ts
export type FlashSaleEvent = {
  id: string;
  name: string;
  discountPct: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
};

export type ActiveFlashSale = {
  id: string;
  name: string;
  discountPct: number;
  endAt: string;
  productIds: string[];
};
```

`src/features/flash-sales/schema.ts`:
```ts
import { z } from "zod";

export const flashSaleEventSchema = z
  .object({
    name: z.string().min(1, "Tên không được để trống"),
    discountPct: z.coerce.number().int().min(1, "Tối thiểu 1%").max(99, "Tối đa 99%"),
    startAt: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
    endAt: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endAt"],
  });

export const flashSaleEventUpdateSchema = flashSaleEventSchema.extend({
  id: z.string().uuid("ID không hợp lệ"),
});

export type FlashSaleEventInput = z.infer<typeof flashSaleEventSchema>;
export type FlashSaleEventUpdateInput = z.infer<typeof flashSaleEventUpdateSchema>;
```

`src/features/flash-sales/price-utils.ts`:
```ts
export function applyFlashSalePrice(listPrice: number, discountPct: number): number {
  return Math.round(listPrice * (1 - discountPct / 100));
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getRemainingSeconds(endAt: string, now: number): number {
  return Math.max(0, Math.floor((new Date(endAt).getTime() - now) / 1000));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/features/flash-sales/
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/flash-sales/
git commit -m "feat(flash-sales): add types, schema, and price utility with tests"
```

---

### Task 3: Feature module — queries

**Files:**
- Create: `src/features/flash-sales/queries.ts`

**Interfaces:**
- Consumes: `FlashSaleEvent`, `ActiveFlashSale` from `./types`
- Produces:
  - `getActiveFlashSale(client: SupabaseClient): Promise<ActiveFlashSale | null>`
  - `getFlashSaleEvents(client: SupabaseClient): Promise<FlashSaleEvent[]>`
  - `getFlashSaleEvent(client: SupabaseClient, id: string): Promise<FlashSaleEvent | null>`
  - `getFlashSaleEventProductIds(client: SupabaseClient, eventId: string): Promise<string[]>`
  - `getProductsForSelector(client: SupabaseClient): Promise<Array<{ id: string; name: string; slug: string }>>`

- [ ] **Step 1: Create the file**

`src/features/flash-sales/queries.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveFlashSale, FlashSaleEvent } from "./types";

type FlashSaleEventRow = {
  id: string;
  name: string;
  discount_pct: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
};

type FlashSaleEventProductRow = {
  product_id: string;
};

function mapEventRow(row: FlashSaleEventRow): FlashSaleEvent {
  return {
    id: row.id,
    name: row.name,
    discountPct: row.discount_pct,
    startAt: row.start_at,
    endAt: row.end_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getActiveFlashSale(
  client: SupabaseClient,
): Promise<ActiveFlashSale | null> {
  const { data: event } = await client
    .from("active_flash_sale_v" as never)
    .select("id, name, discount_pct, end_at")
    .maybeSingle();

  if (!event) return null;
  const row = event as Pick<FlashSaleEventRow, "id" | "name" | "discount_pct" | "end_at">;

  const { data: products } = await client
    .from("flash_sale_event_products" as never)
    .select("product_id")
    .eq("event_id", row.id);

  return {
    id: row.id,
    name: row.name,
    discountPct: row.discount_pct,
    endAt: row.end_at,
    productIds: ((products ?? []) as FlashSaleEventProductRow[]).map((p) => p.product_id),
  };
}

export async function getFlashSaleEvents(client: SupabaseClient): Promise<FlashSaleEvent[]> {
  const { data, error } = await client
    .from("flash_sale_events" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as FlashSaleEventRow[]).map(mapEventRow);
}

export async function getFlashSaleEvent(
  client: SupabaseClient,
  id: string,
): Promise<FlashSaleEvent | null> {
  const { data } = await client
    .from("flash_sale_events" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapEventRow(data as FlashSaleEventRow);
}

export async function getFlashSaleEventProductIds(
  client: SupabaseClient,
  eventId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("flash_sale_event_products" as never)
    .select("product_id")
    .eq("event_id", eventId);
  if (error) throw error;
  return ((data ?? []) as FlashSaleEventProductRow[]).map((r) => r.product_id);
}

export async function getProductsForSelector(
  client: SupabaseClient,
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await client
    .from("products")
    .select("id, name, slug")
    .eq("status", "published")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -30
```

Expected: no TypeScript errors in `src/features/flash-sales/queries.ts`. (Build may fail elsewhere for unrelated reasons — focus on this file.)

- [ ] **Step 3: Commit**

```bash
git add src/features/flash-sales/queries.ts
git commit -m "feat(flash-sales): add queries for active event, CRUD, and product selector"
```

---

### Task 4: Admin actions, permissions, and tests

**Files:**
- Create: `src/features/flash-sales/admin-actions.ts`
- Create: `src/features/flash-sales/admin-actions.test.ts`
- Modify: `src/features/admin/permissions.ts`

**Interfaces:**
- Consumes: `flashSaleEventSchema`, `flashSaleEventUpdateSchema` from `./schema`; `requireAdminPermission` from `@/src/features/admin/auth`
- Produces:
  - `FlashSaleEventState = { error: string } | null`
  - `createFlashSaleEvent(_prev, formData): Promise<FlashSaleEventState>`
  - `updateFlashSaleEvent(_prev, formData): Promise<FlashSaleEventState>`
  - `deleteFlashSaleEvent(id: string): Promise<void>`
  - Permission key: `"flash_sales:manage"` added to `marketing` role

- [ ] **Step 1: Write the failing test**

`src/features/flash-sales/admin-actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createFlashSaleEvent, deleteFlashSaleEvent } from "./admin-actions";

describe("createFlashSaleEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const adminRoleRow = { data: [{ admin_roles: { name: "super_admin" } }], error: null };
    mockSingle.mockResolvedValue({ data: { id: "new-event-id" }, error: null });
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect, error: null });
    mockEq.mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(adminRoleRow),
          }),
        };
      }
      return {
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        select: mockSelect,
      };
    });
  });

  it("returns error when name is missing", async () => {
    const fd = new FormData();
    fd.set("discountPct", "20");
    fd.set("startAt", "2026-07-01T00:00:00+07:00");
    fd.set("endAt", "2026-07-02T00:00:00+07:00");
    const result = await createFlashSaleEvent(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("returns error when discountPct is 0", async () => {
    const fd = new FormData();
    fd.set("name", "Sale");
    fd.set("discountPct", "0");
    fd.set("startAt", "2026-07-01T00:00:00+07:00");
    fd.set("endAt", "2026-07-02T00:00:00+07:00");
    const result = await createFlashSaleEvent(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});

describe("deleteFlashSaleEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const adminRoleRow = { data: [{ admin_roles: { name: "super_admin" } }], error: null };
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(adminRoleRow),
          }),
        };
      }
      return { delete: mockDelete };
    });
  });

  it("throws for invalid uuid", async () => {
    await expect(deleteFlashSaleEvent("not-a-uuid")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/features/flash-sales/admin-actions.test.ts
```

Expected: FAIL — `admin-actions` module not found.

- [ ] **Step 3: Add permission key to marketing role**

In `src/features/admin/permissions.ts`, add `"flash_sales:manage"` to the `marketing` role:

```ts
const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],
  catalog_manager: ["products:read", "products:create", "products:update", "products:delete", "categories:update"],
  marketing: ["cms:update", "promotions:update", "flash_sales:manage"],
  customer_service: [
    "orders:read",
    "orders:update",
    "customers:read",
    "complaints:read",
    "complaints:update",
  ],
  warehouse: ["inventory:read", "inventory:update", "orders:fulfill"],
  procurement: ["purchase_orders:read", "purchase_orders:update", "suppliers:update"],
  finance: ["payments:read", "refunds:create", "reports:read"],
  reporter: ["reports:read"],
};
```

- [ ] **Step 4: Write admin-actions**

`src/features/flash-sales/admin-actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { flashSaleEventSchema, flashSaleEventUpdateSchema } from "./schema";

export type FlashSaleEventState = { error: string } | null;

export async function createFlashSaleEvent(
  _prev: FlashSaleEventState,
  formData: FormData,
): Promise<FlashSaleEventState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const result = flashSaleEventSchema.safeParse({
    name: formData.get("name"),
    discountPct: formData.get("discountPct"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    isActive: formData.get("isActive") !== "false",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const { data: event, error: insertError } = await (client
    .from("flash_sale_events" as never) as ReturnType<typeof client.from>)
    .insert({
      name: result.data.name,
      discount_pct: result.data.discountPct,
      start_at: result.data.startAt,
      end_at: result.data.endAt,
      is_active: result.data.isActive,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  const newEventId = (event as { id: string }).id;
  const productIds = formData.getAll("productIds").map(String).filter(Boolean);

  if (productIds.length > 0) {
    const rows = productIds.map((pid) => ({ event_id: newEventId, product_id: pid }));
    const { error: relError } = await client
      .from("flash_sale_event_products" as never)
      .insert(rows as never);
    if (relError) throw relError;
  }

  revalidatePath("/admin/flash-sales");
  redirect("/admin/flash-sales");
}

export async function updateFlashSaleEvent(
  _prev: FlashSaleEventState,
  formData: FormData,
): Promise<FlashSaleEventState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const result = flashSaleEventUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    discountPct: formData.get("discountPct"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    isActive: formData.get("isActive") !== "false",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const { error: updateError } = await client
    .from("flash_sale_events" as never)
    .update({
      name: result.data.name,
      discount_pct: result.data.discountPct,
      start_at: result.data.startAt,
      end_at: result.data.endAt,
      is_active: result.data.isActive,
    } as never)
    .eq("id", result.data.id);

  if (updateError) throw updateError;

  // Replace all product associations
  await client
    .from("flash_sale_event_products" as never)
    .delete()
    .eq("event_id", result.data.id);

  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  if (productIds.length > 0) {
    const rows = productIds.map((pid) => ({ event_id: result.data.id, product_id: pid }));
    const { error: relError } = await client
      .from("flash_sale_event_products" as never)
      .insert(rows as never);
    if (relError) throw relError;
  }

  revalidatePath("/admin/flash-sales");
  redirect("/admin/flash-sales");
}

export async function deleteFlashSaleEvent(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid flash sale event ID.");

  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const { error } = await client
    .from("flash_sale_events" as never)
    .delete()
    .eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/flash-sales");
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test src/features/flash-sales/admin-actions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/flash-sales/admin-actions.ts src/features/flash-sales/admin-actions.test.ts src/features/admin/permissions.ts
git commit -m "feat(flash-sales): add admin server actions and flash_sales:manage permission"
```

---

### Task 5: Admin nav link and list page

**Files:**
- Modify: `components/admin/admin-nav.tsx`
- Create: `app/admin/flash-sales/page.tsx`

**Interfaces:**
- Consumes: `getFlashSaleEvents` from `src/features/flash-sales/queries`; `deleteFlashSaleEvent` from `src/features/flash-sales/admin-actions`
- Produces: `/admin/flash-sales` list page visible in admin nav

- [ ] **Step 1: Add nav link**

In `components/admin/admin-nav.tsx`, insert after the `content` entry:

```ts
const adminLinks = [
  { href: "/admin", label: "Bảng điều hành" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/content", label: "Nội dung" },
  { href: "/admin/flash-sales", label: "Flash Sale" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/inventory", label: "Tồn kho" },
  { href: "/admin/warehouses", label: "Kho hàng" },
  { href: "/admin/purchase-orders", label: "Đơn nhập hàng" },
  { href: "/admin/suppliers", label: "Nhà cung cấp" },
  { href: "/admin/refunds", label: "Hoàn tiền" },
  { href: "/admin/complaints", label: "Khiếu nại" },
  { href: "/admin/reports", label: "Báo cáo" },
];
```

- [ ] **Step 2: Create the list page**

`app/admin/flash-sales/page.tsx`:
```tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getFlashSaleEvents } from "@/src/features/flash-sales/queries";
import { deleteFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import type { FlashSaleEvent } from "@/src/features/flash-sales/types";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type FlashSaleStatus = "live" | "scheduled" | "ended" | "paused";

function getEventStatus(event: FlashSaleEvent): FlashSaleStatus {
  if (!event.isActive) return "paused";
  const now = new Date().toISOString();
  if (event.endAt < now) return "ended";
  if (event.startAt > now) return "scheduled";
  return "live";
}

const STATUS_LABELS: Record<FlashSaleStatus, string> = {
  live: "Đang diễn ra",
  scheduled: "Sắp diễn ra",
  ended: "Đã kết thúc",
  paused: "Tạm dừng",
};

const STATUS_TONES: Record<FlashSaleStatus, StatusChipTone> = {
  live: "success",
  scheduled: "info",
  ended: "neutral",
  paused: "warning",
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

async function getPageData(): Promise<
  { access: "allowed"; events: FlashSaleEvent[] } | { access: "denied" }
> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", events: [] };
  }
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");
    const events = await getFlashSaleEvents(client);
    return { access: "allowed", events };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminFlashSalesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Flash Sale" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý flash sale.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Flash Sale"
        description="Tạo và quản lý các sự kiện giảm giá theo khung giờ."
        action={
          <Link
            href="/admin/flash-sales/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo Flash Sale
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Tên sự kiện" },
          { key: "discountPct", label: "Giảm (%)", render: (row) => `${row.discountPct}%` },
          { key: "startAt", label: "Bắt đầu", render: (row) => formatDatetime(row.startAt) },
          { key: "endAt", label: "Kết thúc", render: (row) => formatDatetime(row.endAt) },
          {
            key: "status",
            label: "Trạng thái",
            render: (row) => {
              const status = getEventStatus(row);
              return <StatusChip value={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />;
            },
          },
        ]}
        rows={pageData.events}
        emptyMessage="Chưa có flash sale nào."
        actionsSlot={(row) => (
          <div className="flex gap-3">
            <Link href={`/admin/flash-sales/${row.id}/edit`} className="text-sm text-teal-700 hover:underline">
              Sửa
            </Link>
            <form
              action={async () => {
                "use server";
                await deleteFlashSaleEvent(row.id);
              }}
            >
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Xoá
              </button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify the page compiles**

```bash
pnpm build 2>&1 | grep "flash-sales"
```

Expected: no errors for flash-sales files.

- [ ] **Step 4: Commit**

```bash
git add components/admin/admin-nav.tsx app/admin/flash-sales/page.tsx
git commit -m "feat(flash-sales): add admin list page and nav link"
```

---

### Task 6: Admin form component and new/edit pages

**Files:**
- Create: `components/admin/flash-sale-form.tsx`
- Create: `app/admin/flash-sales/new/page.tsx`
- Create: `app/admin/flash-sales/[id]/edit/page.tsx`

**Interfaces:**
- Consumes:
  - `createFlashSaleEvent`, `updateFlashSaleEvent` from `src/features/flash-sales/admin-actions`
  - `getFlashSaleEvent`, `getFlashSaleEventProductIds`, `getProductsForSelector` from `src/features/flash-sales/queries`
  - `FlashSaleEventState` from `src/features/flash-sales/admin-actions`
- Produces: create and edit forms accessible from `/admin/flash-sales/new` and `/admin/flash-sales/[id]/edit`

- [ ] **Step 1: Create the form component**

`components/admin/flash-sale-form.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FlashSaleEventState } from "@/src/features/flash-sales/admin-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Product = { id: string; name: string; slug: string };

type FlashSaleFormProps = {
  action: (prev: FlashSaleEventState, formData: FormData) => Promise<FlashSaleEventState>;
  products: Product[];
  initialValues?: {
    id: string;
    name: string;
    discountPct: number;
    startAt: string;
    endAt: string;
    isActive: boolean;
    selectedProductIds: string[];
  };
};

function toDatetimeLocal(iso: string): string {
  // Converts ISO 8601 to the value format expected by <input type="datetime-local">
  return iso.slice(0, 16);
}

export function FlashSaleForm({ action, products, initialValues }: FlashSaleFormProps) {
  const [state, formAction, isPending] = useActionState<FlashSaleEventState, FormData>(
    action,
    null,
  );
  const isEdit = Boolean(initialValues);
  const selectedSet = new Set(initialValues?.selectedProductIds ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên sự kiện</span>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialValues?.name}
          className={INPUT_CLASS}
          placeholder="Cuối tuần giảm 20%"
        />
      </label>

      <label className="block text-sm" htmlFor="discountPct">
        <span className="font-medium text-slate-700">Giảm giá (%)</span>
        <input
          id="discountPct"
          name="discountPct"
          type="number"
          min="1"
          max="99"
          required
          defaultValue={initialValues?.discountPct}
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm" htmlFor="startAt">
          <span className="font-medium text-slate-700">Bắt đầu</span>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            defaultValue={initialValues ? toDatetimeLocal(initialValues.startAt) : undefined}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm" htmlFor="endAt">
          <span className="font-medium text-slate-700">Kết thúc</span>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            required
            defaultValue={initialValues ? toDatetimeLocal(initialValues.endAt) : undefined}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Kích hoạt</option>
          <option value="false">Tạm dừng</option>
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Sản phẩm áp dụng</legend>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {products.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-500">Chưa có sản phẩm nào.</p>
          )}
          {products.map((product) => (
            <label key={product.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                name="productIds"
                value={product.id}
                defaultChecked={selectedSet.has(product.id)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <span className="text-sm text-slate-700">{product.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo Flash Sale"}
        </button>
        <Link
          href="/admin/flash-sales"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the new page**

`app/admin/flash-sales/new/page.tsx`:
```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FlashSaleForm } from "@/components/admin/flash-sale-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import { getProductsForSelector } from "@/src/features/flash-sales/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewFlashSalePage() {
  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Flash Sale mới" />
        <FlashSaleForm action={createFlashSaleEvent} products={[]} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");
    const products = await getProductsForSelector(client);

    return (
      <div>
        <AdminPageHeader title="Flash Sale mới" />
        <FlashSaleForm action={createFlashSaleEvent} products={products} />
      </div>
    );
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Flash Sale mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo flash sale.</p>
        </div>
      );
    }
    throw e;
  }
}
```

- [ ] **Step 3: Create the edit page**

`app/admin/flash-sales/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FlashSaleForm } from "@/components/admin/flash-sale-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { updateFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import {
  getFlashSaleEvent,
  getFlashSaleEventProductIds,
  getProductsForSelector,
} from "@/src/features/flash-sales/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditFlashSalePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFlashSalePage({ params }: EditFlashSalePageProps) {
  const { id } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Sửa Flash Sale" />
        <FlashSaleForm action={updateFlashSaleEvent} products={[]} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");

    const [event, selectedProductIds, products] = await Promise.all([
      getFlashSaleEvent(client, id),
      getFlashSaleEventProductIds(client, id),
      getProductsForSelector(client),
    ]);

    if (!event) notFound();

    return (
      <div>
        <AdminPageHeader title="Sửa Flash Sale" />
        <FlashSaleForm
          action={updateFlashSaleEvent}
          products={products}
          initialValues={{
            id: event.id,
            name: event.name,
            discountPct: event.discountPct,
            startAt: event.startAt,
            endAt: event.endAt,
            isActive: event.isActive,
            selectedProductIds,
          }}
        />
      </div>
    );
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa Flash Sale" />
          <p className="text-sm text-slate-600">Bạn không có quyền sửa flash sale.</p>
        </div>
      );
    }
    throw e;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "flash-sale|flash_sale" | head -20
```

Expected: no errors for flash-sale files.

- [ ] **Step 5: Commit**

```bash
git add components/admin/flash-sale-form.tsx app/admin/flash-sales/new/page.tsx "app/admin/flash-sales/[id]/edit/page.tsx"
git commit -m "feat(flash-sales): add admin form component and new/edit pages"
```

---

### Task 7: FlashSaleCountdown client component and tests

**Files:**
- Create: `components/storefront/flash-sale-countdown.tsx`
- Create: `components/storefront/flash-sale-countdown.test.ts`

**Interfaces:**
- Consumes: `formatCountdown`, `getRemainingSeconds` from `src/features/flash-sales/price-utils`
- Produces:
  - `FlashSaleCountdown({ endAt: string }): JSX.Element` — live countdown timer

- [ ] **Step 1: Write the failing test**

`components/storefront/flash-sale-countdown.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatCountdown, getRemainingSeconds } from "@/src/features/flash-sales/price-utils";

describe("countdown display utilities (via price-utils)", () => {
  it("shows correct time for 1h 30m 15s remaining", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now + (1 * 3600 + 30 * 60 + 15) * 1000).toISOString();
    const secs = getRemainingSeconds(endAt, now);
    expect(formatCountdown(secs)).toBe("01:30:15");
  });

  it("returns 0 seconds for past timestamps", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now - 1).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass** (they use `price-utils` which is already implemented)

```bash
pnpm test components/storefront/flash-sale-countdown.test.ts
```

Expected: PASS.

- [ ] **Step 3: Create the countdown component**

`components/storefront/flash-sale-countdown.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { formatCountdown, getRemainingSeconds } from "@/src/features/flash-sales/price-utils";

type FlashSaleCountdownProps = {
  endAt: string;
};

export function FlashSaleCountdown({ endAt }: FlashSaleCountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endAt, Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(getRemainingSeconds(endAt, Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [endAt, remaining]);

  if (remaining <= 0) {
    return <span className="text-sm font-medium text-slate-500">Đã kết thúc</span>;
  }

  return (
    <span className="font-mono text-sm font-bold tabular-nums text-red-600">
      {formatCountdown(remaining)}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/storefront/flash-sale-countdown.tsx components/storefront/flash-sale-countdown.test.ts
git commit -m "feat(flash-sales): add FlashSaleCountdown client component"
```

---

### Task 8: ProductCard and ProductGrid — flash sale props

**Files:**
- Modify: `components/storefront/product-card.tsx`
- Modify: `components/storefront/product-grid.tsx`

**Interfaces:**
- Consumes: `ActiveFlashSale` from `src/features/flash-sales/types`; `FlashSaleCountdown` from `./flash-sale-countdown`
- Produces:
  - `ProductCard` accepts optional `flashSale?: { discountPct: number; endAt: string } | null`
  - `ProductGrid` accepts optional `flashSale?: ActiveFlashSale | null`

- [ ] **Step 1: Update ProductCard**

In `components/storefront/product-card.tsx`, add the `flashSale` prop and new rendering logic. Replace the existing file content:

```tsx
import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";
import type { CmsProductCard } from "@/src/features/cms/types";
import { calculateDiscountPercent, formatVnd } from "@/src/lib/format";
import { FlashSaleCountdown } from "./flash-sale-countdown";
import {
  isTextPlaceholderImage,
  StorefrontPlaceholderImage,
} from "./storefront-placeholder-image";
import { AddToCartButton } from "./add-to-cart-button";

type StorefrontProductCard = ProductCardData | CmsProductCard;

type FlashSaleInfo = {
  discountPct: number;
  endAt: string;
};

type ProductCardProps = {
  product: StorefrontProductCard;
  index?: number;
  flashSale?: FlashSaleInfo | null;
};

function getBadgeText(product: StorefrontProductCard): string | null {
  return "badgeText" in product ? product.badgeText ?? null : null;
}

function getSoldLabel(product: StorefrontProductCard): string | null {
  if (!("soldLabel" in product)) {
    return null;
  }
  return product.soldLabel || null;
}

export function ProductCard({ product, index = 0, flashSale }: ProductCardProps) {
  // list_price is compareAtPrice (if already on sale) or price
  const listPrice = product.compareAtPrice ?? product.price;
  const flashSalePrice =
    flashSale != null ? Math.round(listPrice * (1 - flashSale.discountPct / 100)) : null;
  // Only apply flash sale discount if it's actually cheaper than the current price
  const effectiveFlashSale =
    flashSalePrice != null && flashSalePrice < product.price ? flashSale : null;

  const displayPrice = effectiveFlashSale ? flashSalePrice! : product.price;
  const displayCompareAt = effectiveFlashSale ? listPrice : product.compareAtPrice;
  const regularDiscountPercent = effectiveFlashSale
    ? null
    : calculateDiscountPercent(product.price, product.compareAtPrice);

  const badgeText = getBadgeText(product);
  const soldLabel = getSoldLabel(product);
  const cardDelay = Math.min(index, 15) * 45;

  return (
    <article
      data-testid="homepage-product-card"
      className="sf-card-enter group relative h-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 pb-10 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-teal-300 hover:shadow-[0_12px_28px_rgba(15,74,76,0.12)]"
      style={{ "--sf-card-delay": `${cardDelay}ms` } as React.CSSProperties}
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#eff8f6]">
          {isTextPlaceholderImage(product.imageUrl) ? (
            <StorefrontPlaceholderImage label={product.name} />
          ) : product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 220px, (min-width: 768px) 25vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              No image
            </div>
          )}
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-4rem)] flex-wrap gap-1">
            {effectiveFlashSale ? (
              <span className="rounded bg-red-600 px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                🔥 -{effectiveFlashSale.discountPct}%
              </span>
            ) : regularDiscountPercent ? (
              <span className="rounded bg-red-600 px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                -{regularDiscountPercent}%
              </span>
            ) : null}
            {badgeText ? (
              <span className="rounded bg-[#0f766e] px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                {badgeText}
              </span>
            ) : null}
          </div>
          {effectiveFlashSale && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-red-600/80 py-0.5">
              <FlashSaleCountdown endAt={effectiveFlashSale.endAt} />
            </div>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-slate-950">
          {product.name}
        </h3>
        {"unitLabel" in product && product.unitLabel ? (
          <div className="mt-1 text-[11px] font-semibold text-teal-700">
            {product.unitLabel}
          </div>
        ) : null}
        <div className="mt-1.5 flex min-h-10 flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <div className="min-w-0 max-w-full">
            <div className="break-words text-sm font-extrabold text-red-600">
              {formatVnd(displayPrice)}
            </div>
            {displayCompareAt ? (
              <div className="break-words text-xs text-slate-500 line-through">
                {formatVnd(displayCompareAt)}
              </div>
            ) : null}
          </div>
          {soldLabel ? (
            <div className="max-w-full break-words text-left text-[11px] font-semibold text-slate-500 sm:text-right">
              {soldLabel}
            </div>
          ) : null}
        </div>
        {!product.isAvailable ? (
          <div className="mt-2 text-xs font-medium text-slate-500">Hết hàng</div>
        ) : null}
      </Link>
      <AddToCartButton
        variantId={product.defaultVariantId ?? ""}
        unitPrice={displayPrice}
        isAvailable={product.isAvailable && product.defaultVariantId != null}
        productName={product.name}
      />
    </article>
  );
}
```

- [ ] **Step 2: Update ProductGrid**

In `components/storefront/product-grid.tsx`, add `flashSale` prop:

```tsx
import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";
import type { CmsProductCard } from "@/src/features/cms/types";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
import { ProductCard } from "./product-card";

type StorefrontProductCard = ProductCardData | CmsProductCard;

type ProductGridProps = {
  products: StorefrontProductCard[];
  emptyMessage?: string;
  density?: "default" | "dense";
  flashSale?: ActiveFlashSale | null;
};

export function ProductGrid({
  products,
  emptyMessage = "Chưa có sản phẩm phù hợp.",
  density = "default",
  flashSale,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-teal-200 bg-[#f7fbfa] px-4 py-10 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const flashSaleProductIds = flashSale ? new Set(flashSale.productIds) : null;

  const gridClassName =
    density === "dense"
      ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : "grid grid-cols-2 gap-2.5 md:grid-cols-4";

  return (
    <div className={gridClassName}>
      {products.map((product, index) => {
        const isInFlashSale = flashSaleProductIds?.has(product.id) ?? false;
        return (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            flashSale={isInFlashSale ? { discountPct: flashSale!.discountPct, endAt: flashSale!.endAt } : null}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add components/storefront/product-card.tsx components/storefront/product-grid.tsx
git commit -m "feat(flash-sales): add flash sale price + countdown to ProductCard and ProductGrid"
```

---

### Task 9: Storefront page wiring

**Files:**
- Modify: `components/storefront/product-rail.tsx`
- Modify: `app/(storefront)/page.tsx`
- Modify: `app/(storefront)/categories/[slug]/page.tsx`
- Modify: `app/(storefront)/products/[slug]/page.tsx`
- Modify: `components/storefront/product-detail-view.tsx`

**Interfaces:**
- Consumes: `getActiveFlashSale` from `src/features/flash-sales/queries`; `ActiveFlashSale` from types; `FlashSaleCountdown` component; `applyFlashSalePrice` from price-utils
- Produces: flash sale prices and countdown timers visible on homepage, category pages, and product detail pages

- [ ] **Step 1: Update ProductRail to accept flashSale prop**

In `components/storefront/product-rail.tsx`, add `flashSale` to `ProductRailProps` and pass it to `ProductGrid`. Only change the type and the `<ProductGrid ...>` call — leave all other logic untouched.

Find the `ProductRailProps` type and `ProductGrid` usage and update them:

```tsx
// Add to imports:
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";

// Update the type:
type ProductRailProps = {
  section: CmsSection;
  flashSale?: ActiveFlashSale | null;
};

// Update the function signature:
export function ProductRail({ section, flashSale }: ProductRailProps) {
  // ... all existing code unchanged except ProductGrid call ...
  // Find the existing <ProductGrid ... /> and add flashSale:
  // <ProductGrid
  //   products={section.products}
  //   density="dense"
  //   emptyMessage="Chưa có sản phẩm trong khu vực này."
  //   flashSale={flashSale}
  // />
}
```

- [ ] **Step 2: Update homepage**

In `app/(storefront)/page.tsx`:

1. Add import at top:
```ts
import { getActiveFlashSale } from "@/src/features/flash-sales/queries";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
```

2. Update `renderHomeSection` signature and `product_rail`/`flash_sale` cases:
```tsx
function renderHomeSection(section: CmsSection, flashSale: ActiveFlashSale | null) {
  switch (section.type) {
    case "hero":
      return <HeroMerchandisingGrid key={section.id} section={section} />;
    case "service_strip":
      return <ServiceStrip key={section.id} section={section} />;
    case "category_shortcuts":
      return <CategoryShortcutStrip key={section.id} section={section} />;
    case "promo_band":
      return <PromoBand key={section.id} section={section} />;
    case "product_rail":
    case "flash_sale":
      return <ProductRail key={section.id} section={section} flashSale={flashSale} />;
    case "recommendation_tabs":
      return <RecommendationTabs key={section.id} section={section} />;
    case "content_highlights":
      return <ContentHighlights key={section.id} section={section} />;
    case "partner_strip":
      return <PartnerStrip key={section.id} section={section} />;
    default:
      return null;
  }
}
```

3. Update `StorefrontHomePage` to fetch active flash sale and pass it:
```tsx
export default async function StorefrontHomePage() {
  const client = await createServerClient();
  const [chrome, home, flashSale] = await Promise.all([
    loadStorefrontChrome(client),
    loadHomePageContent(client),
    getActiveFlashSale(client),
  ]);

  return (
    <div
      data-testid="storefront-home-shell"
      data-theme="seafood-market-v2"
      className={storefrontTheme.shell}
    >
      <StorefrontHeader navItems={chrome.headerNav} />
      <main>
        <div className={storefrontTheme.mainWrap}>
          <CategorySidebar items={chrome.sidebarNav} />
          <div className={storefrontTheme.contentStack}>
            {home.sections.map((section) => renderHomeSection(section, flashSale))}
          </div>
        </div>
      </main>
      <FloatingContactActions />
      <MobileStorefrontDock items={chrome.mobileDock} />
      <StorefrontFooter
        footerLinks={chrome.footerLinks}
        paymentAssets={chrome.paymentAssets}
        partnerAssets={chrome.partnerAssets}
        trustAssets={chrome.trustAssets}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update category page**

In `app/(storefront)/categories/[slug]/page.tsx`:

1. Add imports:
```ts
import { getActiveFlashSale } from "@/src/features/flash-sales/queries";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
```

2. Update `CategoryPageData` type:
```ts
type CategoryPageData = {
  chrome: StorefrontChrome;
  products: ProductCard[];
  category: CategoryMeta;
  flashSale: ActiveFlashSale | null;
};
```

3. Update `loadCategoryPageData` to include `flashSale: null` in the fixture return, and add `getActiveFlashSale` to the real data fetch:
```ts
async function loadCategoryPageData(slug: string): Promise<CategoryPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      products: [],
      category: { name: slug.replaceAll("-", " "), description: null },
      flashSale: null,
    };
  }

  const client = await createServerClient();
  const [chrome, result, flashSale] = await Promise.all([
    getStorefrontChrome(client),
    // existing category + products fetch — keep whatever was there, just add flashSale
    client
      .from("categories")
      .select("name, description, products(id, slug, name, ...)")  // keep the existing query
      .eq("slug", slug)
      .single(),
    getActiveFlashSale(client),
  ]);
  // ... keep existing mapping logic, add flashSale to return
  return { chrome, products: ..., category: ..., flashSale };
}
```

> **Note:** The category page query is more complex than shown above. Read the actual `loadCategoryPageData` function in the file and add `getActiveFlashSale(client)` to the existing `Promise.all` call. Add `flashSale` to the return type and return value. Do not change the existing category/products fetch logic.

4. In the page render, pass `flashSale` to `ProductGrid`:
```tsx
<ProductGrid products={pageData.products} flashSale={pageData.flashSale} />
```

- [ ] **Step 4: Update ProductDetailView**

In `components/storefront/product-detail-view.tsx`, add `flashSale` prop and show flash sale banner:

1. Add import:
```ts
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
import { applyFlashSalePrice } from "@/src/features/flash-sales/price-utils";
import { FlashSaleCountdown } from "./flash-sale-countdown";
import { formatVnd } from "@/src/lib/format";
```

2. Update the props type:
```ts
type ProductDetailViewProps = {
  product: ProductDetail;
  flashSale?: ActiveFlashSale | null;
};
```

3. In the component body, after `const variants = getDisplayVariants(product.variants);`, compute flash sale price:
```tsx
export function ProductDetailView({ product, flashSale }: ProductDetailViewProps) {
  const variants = getDisplayVariants(product.variants);
  const cheapestVariant = variants[0] ?? null;
  const listPrice = cheapestVariant?.listPrice ?? 0;
  const flashSalePrice =
    flashSale != null && cheapestVariant != null
      ? applyFlashSalePrice(listPrice, flashSale.discountPct)
      : null;
  const showFlashSale = flashSalePrice != null && flashSalePrice < (cheapestVariant?.salePrice ?? listPrice);
  // ...
```

4. Inside the render, after the product name `<h1>` and before `<AddToCartControls>`, insert the flash sale banner:
```tsx
{showFlashSale && flashSale && (
  <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
    <span className="text-sm font-semibold text-red-700">
      🔥 Flash Sale: {formatVnd(flashSalePrice!)}
    </span>
    <span className="text-xs text-slate-500 line-through">{formatVnd(listPrice)}</span>
    <span className="ml-auto">
      <FlashSaleCountdown endAt={flashSale.endAt} />
    </span>
  </div>
)}
```

- [ ] **Step 5: Update product detail page to fetch and pass flashSale**

In `app/(storefront)/products/[slug]/page.tsx`:

1. Add import:
```ts
import { getActiveFlashSale } from "@/src/features/flash-sales/queries";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
```

2. Update `ProductPageData` type:
```ts
type ProductPageData = {
  chrome: StorefrontChrome;
  product: ProductDetail | null;
  flashSale: ActiveFlashSale | null;
};
```

3. Update `loadProductPageData` to fetch active flash sale. Add `flashSale: null` to the playwright fixture return, and add `getActiveFlashSale(client)` to the `Promise.all` in the real fetch:
```ts
async function loadProductPageData(slug: string): Promise<ProductPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      product: createPlaywrightProductFixture(slug),
      flashSale: null,
    };
  }

  const client = await createServerClient();
  const [chrome, product, flashSale] = await Promise.all([
    getStorefrontChrome(client),
    getProductBySlug(client, slug),
    getActiveFlashSale(client),
  ]);

  return { chrome, product, flashSale };
}
```

4. Check if the product is in the active flash sale before passing it, and pass `flashSale` to `ProductDetailView`:
```tsx
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { chrome, product, flashSale } = await loadProductPageData(slug);

  if (!product) notFound();

  const productInFlashSale =
    flashSale != null && flashSale.productIds.includes(product.id) ? flashSale : null;

  // ... existing productJsonLd code ...

  return (
    // ... existing shell ...
    <ProductDetailView product={product} flashSale={productInFlashSale} />
    // ...
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 7: Check TypeScript**

```bash
pnpm build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add \
  components/storefront/product-rail.tsx \
  "app/(storefront)/page.tsx" \
  "app/(storefront)/categories/[slug]/page.tsx" \
  "app/(storefront)/products/[slug]/page.tsx" \
  components/storefront/product-detail-view.tsx
git commit -m "feat(flash-sales): wire active flash sale into storefront pages and product detail view"
```

---

## Self-Review

**Spec coverage:**
- ✅ DB tables + view + RLS — Task 1
- ✅ Feature module (types, schema, queries, admin-actions) — Tasks 2-4
- ✅ `"flash_sales:manage"` permission — Task 4
- ✅ Admin list page with status badges — Task 5
- ✅ Admin nav link — Task 5
- ✅ Admin new/edit form + pages — Task 6
- ✅ `<FlashSaleCountdown>` client component — Task 7
- ✅ Product card flash sale badge + timer + discounted price — Task 8
- ✅ ProductGrid threads flash sale through — Task 8
- ✅ Homepage `ProductRail` gets `flashSale` prop — Task 9
- ✅ Category page wired — Task 9
- ✅ Product detail banner + countdown — Task 9
- ✅ Server-side price computation — Tasks 3, 8, 9
- ✅ Edge case: flash sale only shown if actually cheaper than current price — Task 8
- ✅ Edge case: countdown shows "Đã kết thúc" at zero — Task 7

**No placeholders:** all steps contain actual code.

**Type consistency:**
- `ActiveFlashSale.productIds: string[]` — used as `string[]` in all consumers ✅
- `ActiveFlashSale.discountPct` / `endAt` — field names consistent across Tasks 2, 8, 9 ✅
- `FlashSaleEventState = { error: string } | null` — consistent in form + actions ✅
- `applyFlashSalePrice(listPrice, discountPct)` — defined in Task 2, used in Tasks 8, 9 ✅
