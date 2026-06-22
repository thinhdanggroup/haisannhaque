# Inventory & Procurement Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lot management, stock ledger history, quality status controls, bulk inventory adjustment, PO submit/cancel actions, goods receipt history, and list filtering to the inventory and procurement sections.

**Architecture:** New inventory pages read from `lots` and `stock_ledger` tables directly. Lot quality updates go through a new server action in a new `src/features/inventory/lot-actions.ts` file. Bulk CSV adjustment calls the existing `adjust_inventory` RPC per row sequentially and returns a summary. PO submit/cancel and goods receipt history live in a new `src/features/procurement/po-actions.ts` file. All mutations require the appropriate permissions and use the established Zod + server-action pattern.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React useActionState, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "inventory:update")` for inventory mutations, `"inventory:read"` for queries
- `requireAdminPermission(client, "purchase_orders:update")` for PO mutations, `"purchase_orders:read"` for queries
- Form components must use `useActionState` hook
- Tests use vitest, mock Supabase as plain JS object
- Run tests: `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- `quality_status` allowed values: `'good'`, `'quarantine'`, `'damaged'`, `'expired'`

---

### Task 1: Lot management — list and quality status update

**Files:**
- Create: `src/features/inventory/lot-actions.ts`
- Create: `src/features/inventory/lot-actions.test.ts`
- Create: `app/admin/inventory/lots/page.tsx`
- Create: `components/admin/lot-quality-form.tsx`

**Interfaces:**
- Produces: `getLots(client, filters?): Promise<LotRow[]>`
- Produces: `updateLotQuality(client, lotId: string, qualityStatus: string): Promise<void>`
- Produces: `updateLotQualityAction(_prev, formData): Promise<LotQualityState>`
- Produces type: `LotRow = { id: string; lot_no: string; expiry_at: string | null; quality_status: string; variant_sku: string; product_name: string; warehouse_code: string }`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/inventory/lot-actions.test.ts
import { describe, expect, it } from "vitest";
import { getLots, updateLotQuality } from "./lot-actions";

const VALID_STATUSES = ["good", "quarantine", "damaged", "expired"];

describe("getLots", () => {
  it("returns mapped lot rows", async () => {
    const rows = [
      {
        id: "lot-1",
        lot_no: "LOT-001",
        expiry_at: "2026-12-31T00:00:00Z",
        quality_status: "good",
        product_variants: { sku: "SKU-A", products: { name: "Apple" } },
        warehouses: { code: "WH01" },
      },
    ];
    const client = {
      from: () => ({
        select: () => ({
          order: async () => ({ data: rows, error: null }),
        }),
      }),
    };
    const result = await getLots(client as never, {});
    expect(result).toEqual([
      {
        id: "lot-1",
        lot_no: "LOT-001",
        expiry_at: "2026-12-31T00:00:00Z",
        quality_status: "good",
        variant_sku: "SKU-A",
        product_name: "Apple",
        warehouse_code: "WH01",
      },
    ]);
  });
});

describe("updateLotQuality", () => {
  it.each(VALID_STATUSES)("accepts valid status: %s", async (status) => {
    const updates: unknown[] = [];
    const client = {
      from: () => ({
        update: (vals: unknown) => {
          updates.push(vals);
          return { eq: async () => ({ error: null }) };
        },
      }),
    };
    await updateLotQuality(client as never, "lot-uuid", status);
    expect(updates[0]).toMatchObject({ quality_status: status });
  });

  it("throws on invalid quality status", async () => {
    const client = { from: () => ({}) };
    await expect(updateLotQuality(client as never, "lot-uuid", "rotten")).rejects.toThrow(
      "Invalid quality status",
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/features/inventory/lot-actions.test.ts
```
Expected: FAIL — `getLots is not a function`

- [ ] **Step 3: Implement lot-actions.ts**

```ts
// src/features/inventory/lot-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LotRow = {
  id: string;
  lot_no: string;
  expiry_at: string | null;
  quality_status: string;
  variant_sku: string;
  product_name: string;
  warehouse_code: string;
};

type LotFilters = {
  variantId?: string;
  warehouseId?: string;
  qualityStatus?: string;
};

type RawLot = {
  id: string;
  lot_no: string;
  expiry_at: string | null;
  quality_status: string;
  product_variants: { sku: string; products: { name: string } } | null;
  warehouses: { code: string } | null;
};

const VALID_QUALITY_STATUSES = ["good", "quarantine", "damaged", "expired"] as const;
type QualityStatus = typeof VALID_QUALITY_STATUSES[number];

export async function getLots(
  client: Pick<SupabaseClient, "from">,
  filters: LotFilters,
): Promise<LotRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client
    .from("lots")
    .select("id, lot_no, expiry_at, quality_status, product_variants(sku, products(name)), warehouses(code)")
    .order("created_at", { ascending: false });

  if (filters.variantId) q = q.eq("variant_id", filters.variantId);
  if (filters.warehouseId) q = q.eq("warehouse_id", filters.warehouseId);
  if (filters.qualityStatus) q = q.eq("quality_status", filters.qualityStatus);

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as RawLot[]).map((r) => ({
    id: r.id,
    lot_no: r.lot_no,
    expiry_at: r.expiry_at,
    quality_status: r.quality_status,
    variant_sku: r.product_variants?.sku ?? "—",
    product_name: r.product_variants?.products?.name ?? "—",
    warehouse_code: r.warehouses?.code ?? "—",
  }));
}

export async function updateLotQuality(
  client: Pick<SupabaseClient, "from">,
  lotId: string,
  qualityStatus: string,
): Promise<void> {
  if (!VALID_QUALITY_STATUSES.includes(qualityStatus as QualityStatus)) {
    throw new Error(`Invalid quality status: '${qualityStatus}'. Must be one of: ${VALID_QUALITY_STATUSES.join(", ")}.`);
  }

  const { error } = await client
    .from("lots")
    .update({ quality_status: qualityStatus })
    .eq("id", lotId);

  if (error) throw error;
}

export type LotQualityState = { error: string } | null;

export async function updateLotQualityAction(
  _prev: LotQualityState,
  formData: FormData,
): Promise<LotQualityState> {
  const result = z.object({
    lotId: z.string().uuid(),
    qualityStatus: z.enum(VALID_QUALITY_STATUSES),
  }).safeParse({
    lotId: formData.get("lotId"),
    qualityStatus: formData.get("qualityStatus"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");
  await updateLotQuality(client, result.data.lotId, result.data.qualityStatus);
  revalidatePath("/admin/inventory/lots");
  return null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/features/inventory/lot-actions.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Create LotQualityForm component**

```tsx
// components/admin/lot-quality-form.tsx
"use client";

import { useActionState } from "react";
import { updateLotQualityAction, type LotQualityState } from "@/src/features/inventory/lot-actions";

const STATUSES = ["good", "quarantine", "damaged", "expired"] as const;
const TONE: Record<string, string> = {
  good: "text-green-700",
  quarantine: "text-amber-700",
  damaged: "text-red-700",
  expired: "text-slate-500",
};

type Props = { lotId: string; currentStatus: string };

export function LotQualityForm({ lotId, currentStatus }: Props) {
  const [state, formAction, isPending] = useActionState<LotQualityState, FormData>(
    updateLotQualityAction,
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="lotId" value={lotId} />
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      <select
        name="qualityStatus"
        defaultValue={currentStatus}
        className={`rounded border border-slate-300 px-2 py-1 text-xs font-medium outline-none focus:border-teal-600 ${TONE[currentStatus] ?? ""}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-teal-700 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {isPending ? "…" : "Update"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Create lots list page**

```tsx
// app/admin/inventory/lots/page.tsx
import type { SearchParams } from "next/dist/server/request/search-params";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LotQualityForm } from "@/components/admin/lot-quality-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getLots, type LotRow } from "@/src/features/inventory/lot-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

const QUALITY_STATUSES = ["good", "quarantine", "damaged", "expired"];

type PageData = { access: "allowed"; lots: LotRow[]; qualityFilter: string } | { access: "denied" };

async function getPageData(searchParams: SearchParams): Promise<PageData> {
  const qualityFilter = String(searchParams.quality ?? "");

  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", lots: [], qualityFilter };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:read");
    const lots = await getLots(client, { qualityStatus: qualityFilter || undefined });
    return { access: "allowed", lots, qualityFilter };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function InventoryLotsPage({ searchParams }: { searchParams: SearchParams }) {
  const pageData = await getPageData(searchParams);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Lots" />
        <p className="text-sm text-slate-600">You do not have access to inventory.</p>
      </div>
    );
  }

  const { lots, qualityFilter } = pageData;

  return (
    <div>
      <AdminPageHeader
        title="Lot Management"
        description="View and update lot quality status across all warehouses."
      />

      {/* Quality filter */}
      <form method="GET" className="mb-4 flex gap-2">
        <select
          name="quality"
          defaultValue={qualityFilter}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All quality statuses</option>
          {QUALITY_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Filter
        </button>
      </form>

      {lots.length === 0 ? (
        <p className="text-sm text-slate-500">No lots found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="py-2 pr-4">Lot No.</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Warehouse</th>
                <th className="py-2 pr-4">Expiry</th>
                <th className="py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-mono text-xs">{lot.lot_no}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-600">{lot.variant_sku}</td>
                  <td className="py-2 pr-4">{lot.product_name}</td>
                  <td className="py-2 pr-4 text-slate-600">{lot.warehouse_code}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {lot.expiry_at
                      ? new Date(lot.expiry_at).toLocaleDateString()
                      : <span className="text-slate-400">No expiry</span>}
                  </td>
                  <td className="py-2">
                    <LotQualityForm lotId={lot.id} currentStatus={lot.quality_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/inventory/lot-actions.ts src/features/inventory/lot-actions.test.ts \
  components/admin/lot-quality-form.tsx app/admin/inventory/lots/page.tsx
git commit -m "feat(inventory): add lot management page with quality status updates"
```

---

### Task 2: Stock ledger history per SKU

**Files:**
- Modify: `src/features/inventory/lot-actions.ts` (add `getStockLedger`)
- Create: `app/admin/inventory/[variantId]/ledger/page.tsx`
- Modify: `src/features/inventory/lot-actions.test.ts` (add ledger tests)

**Interfaces:**
- Produces: `getStockLedger(client, variantId: string, limit?: number): Promise<LedgerRow[]>`
- Produces type: `LedgerRow = { id: string; delta: number; reason: string; warehouse_code: string; lot_no: string | null; created_at: string }`

- [ ] **Step 1: Add failing test**

In `src/features/inventory/lot-actions.test.ts`, add:

```ts
describe("getStockLedger", () => {
  it("returns ledger entries for a variant", async () => {
    const rows = [
      {
        id: "ledger-1",
        delta: -5,
        reason: "sale",
        created_at: "2026-01-10T00:00:00Z",
        warehouses: { code: "WH01" },
        lots: { lot_no: "LOT-001" },
      },
    ];
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    };
    const result = await getStockLedger(client as never, "variant-uuid");
    expect(result).toEqual([
      {
        id: "ledger-1",
        delta: -5,
        reason: "sale",
        warehouse_code: "WH01",
        lot_no: "LOT-001",
        created_at: "2026-01-10T00:00:00Z",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/inventory/lot-actions.test.ts
```
Expected: FAIL on `getStockLedger` test

- [ ] **Step 3: Implement getStockLedger**

Append to `src/features/inventory/lot-actions.ts`:

```ts
export type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  warehouse_code: string;
  lot_no: string | null;
  created_at: string;
};

type RawLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
  warehouses: { code: string } | null;
  lots: { lot_no: string } | null;
};

export async function getStockLedger(
  client: Pick<SupabaseClient, "from">,
  variantId: string,
  limit = 50,
): Promise<LedgerRow[]> {
  const { data, error } = await client
    .from("stock_ledger")
    .select("id, delta, reason, created_at, warehouses(code), lots(lot_no)")
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as RawLedgerRow[]).map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    warehouse_code: r.warehouses?.code ?? "—",
    lot_no: r.lots?.lot_no ?? null,
    created_at: r.created_at,
  }));
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/inventory/lot-actions.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Create ledger page**

```tsx
// app/admin/inventory/[variantId]/ledger/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { getStockLedger, type LedgerRow } from "@/src/features/inventory/lot-actions";
import { createServerClient } from "@/src/lib/supabase/server";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";

export const dynamic = "force-dynamic";

type Params = { variantId: string };
type PageData =
  | { access: "allowed"; entries: LedgerRow[]; variantSku: string }
  | { access: "denied" }
  | { access: "not_found" };

async function getPageData(variantId: string): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", entries: [], variantSku: variantId };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:read");

    const { data: variant } = await client
      .from("product_variants")
      .select("sku")
      .eq("id", variantId)
      .single();

    if (!variant) return { access: "not_found" };

    const entries = await getStockLedger(client, variantId);
    return { access: "allowed", entries, variantSku: variant.sku };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function StockLedgerPage({ params }: { params: Params }) {
  const pageData = await getPageData(params.variantId);

  if (pageData.access === "not_found") notFound();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Stock Ledger" />
        <p className="text-sm text-slate-600">You do not have access to inventory.</p>
      </div>
    );
  }

  const { entries, variantSku } = pageData;

  return (
    <div>
      <AdminPageHeader
        title={`Stock Ledger — ${variantSku}`}
        description="Last 50 inventory movements for this SKU."
        action={
          <Link
            href="/admin/inventory"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← Inventory
          </Link>
        }
      />

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No ledger entries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Delta</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Warehouse</th>
                <th className="py-2">Lot</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className={`py-2 pr-4 font-mono font-semibold ${entry.delta >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {entry.delta >= 0 ? "+" : ""}{entry.delta}
                  </td>
                  <td className="py-2 pr-4 text-slate-700">{entry.reason}</td>
                  <td className="py-2 pr-4 text-slate-600">{entry.warehouse_code}</td>
                  <td className="py-2 font-mono text-xs text-slate-500">
                    {entry.lot_no ?? <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Link to ledger from inventory list**

In `app/admin/inventory/page.tsx`, add a "Ledger" link in the row actions for each SKU:
```tsx
<Link href={`/admin/inventory/${row.variantId}/ledger`} className="text-xs text-teal-700 hover:underline">
  Ledger
</Link>
```
(This requires the inventory list to include `variant_id` in its row data — add it to the select query if not present.)

- [ ] **Step 7: Commit**

```bash
git add src/features/inventory/lot-actions.ts src/features/inventory/lot-actions.test.ts \
  app/admin/inventory/
git commit -m "feat(inventory): add stock ledger history page per SKU"
```

---

### Task 3: Bulk inventory adjustment via CSV

**Files:**
- Create: `src/features/inventory/bulk-adjust.ts`
- Create: `src/features/inventory/bulk-adjust.test.ts`
- Create: `app/admin/inventory/bulk-adjust/page.tsx`
- Create: `components/admin/bulk-adjust-form.tsx`

**Interfaces:**
- Produces: `parseBulkAdjustCsv(csv: string): BulkAdjustRow[]`
- Produces: `bulkAdjustInventory(client, rows: BulkAdjustRow[]): Promise<BulkAdjustResult>`
- Produces type: `BulkAdjustRow = { sku: string; warehouseCode: string; delta: number; reason: string }`
- Produces type: `BulkAdjustResult = { succeeded: number; failed: Array<{ row: BulkAdjustRow; error: string }> }`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/inventory/bulk-adjust.test.ts
import { describe, expect, it } from "vitest";
import { parseBulkAdjustCsv, bulkAdjustInventory } from "./bulk-adjust";

describe("parseBulkAdjustCsv", () => {
  it("parses valid CSV into rows", () => {
    const csv = `SKU-A,WH01,10,sale_return\nSKU-B,WH01,-3,damage`;
    const result = parseBulkAdjustCsv(csv);
    expect(result).toEqual([
      { sku: "SKU-A", warehouseCode: "WH01", delta: 10, reason: "sale_return" },
      { sku: "SKU-B", warehouseCode: "WH01", delta: -3, reason: "damage" },
    ]);
  });

  it("skips blank lines and header-like rows", () => {
    const csv = `sku,warehouse,delta,reason\nSKU-A,WH01,5,adjustment\n\n`;
    const result = parseBulkAdjustCsv(csv);
    // skips header row (delta is NaN)
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("SKU-A");
  });

  it("throws when delta is zero", () => {
    expect(() => parseBulkAdjustCsv("SKU-A,WH01,0,reason")).toThrow("delta cannot be zero");
  });
});

describe("bulkAdjustInventory", () => {
  it("calls adjust_inventory RPC for each row and returns summary", async () => {
    const rpcCalls: unknown[] = [];
    const client = {
      rpc: (name: string, params: unknown) => {
        rpcCalls.push({ name, params });
        return { error: null };
      },
    };
    const rows = [
      { sku: "SKU-A", warehouseCode: "WH01", delta: 5, reason: "return" },
      { sku: "SKU-B", warehouseCode: "WH01", delta: -2, reason: "damage" },
    ];
    const result = await bulkAdjustInventory(client as never, rows);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(rpcCalls).toHaveLength(2);
  });

  it("records failures without stopping", async () => {
    let call = 0;
    const client = {
      rpc: () => {
        call++;
        return { error: call === 1 ? { message: "SKU not found" } : null };
      },
    };
    const rows = [
      { sku: "BAD-SKU", warehouseCode: "WH01", delta: 1, reason: "test" },
      { sku: "GOOD-SKU", warehouseCode: "WH01", delta: 1, reason: "test" },
    ];
    const result = await bulkAdjustInventory(client as never, rows);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe("SKU not found");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/features/inventory/bulk-adjust.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement bulk-adjust.ts**

```ts
// src/features/inventory/bulk-adjust.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BulkAdjustRow = {
  sku: string;
  warehouseCode: string;
  delta: number;
  reason: string;
};

export type BulkAdjustResult = {
  succeeded: number;
  failed: Array<{ row: BulkAdjustRow; error: string }>;
};

export function parseBulkAdjustCsv(csv: string): BulkAdjustRow[] {
  const rows: BulkAdjustRow[] = [];
  for (const line of csv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [sku, warehouseCode, rawDelta, ...reasonParts] = trimmed.split(",");
    const delta = Number(rawDelta);
    const reason = reasonParts.join(",").trim();

    if (!sku || !warehouseCode || isNaN(delta) || !reason) continue;
    if (delta === 0) throw new Error(`Row "${trimmed}": delta cannot be zero.`);

    rows.push({ sku: sku.trim(), warehouseCode: warehouseCode.trim(), delta, reason });
  }
  return rows;
}

export async function bulkAdjustInventory(
  client: Pick<SupabaseClient, "rpc">,
  rows: BulkAdjustRow[],
): Promise<BulkAdjustResult> {
  let succeeded = 0;
  const failed: BulkAdjustResult["failed"] = [];

  for (const row of rows) {
    const { error } = await client.rpc("adjust_inventory", {
      p_sku: row.sku,
      p_warehouse_code: row.warehouseCode,
      p_delta: row.delta,
      p_reason: row.reason,
    });

    if (error) {
      failed.push({ row, error: error.message });
    } else {
      succeeded++;
    }
  }

  return { succeeded, failed };
}

export type BulkAdjustState =
  | { status: "success"; succeeded: number; failed: BulkAdjustResult["failed"] }
  | { status: "error"; error: string }
  | null;

export async function bulkAdjustInventoryAction(
  _prev: BulkAdjustState,
  formData: FormData,
): Promise<BulkAdjustState> {
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return { status: "error", error: "CSV input is empty." };

  let rows: BulkAdjustRow[];
  try {
    rows = parseBulkAdjustCsv(csv);
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : "Invalid CSV." };
  }

  if (rows.length === 0) return { status: "error", error: "No valid rows found in CSV." };

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const result = await bulkAdjustInventory(client, rows);
  revalidatePath("/admin/inventory");
  return { status: "success", succeeded: result.succeeded, failed: result.failed };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/features/inventory/bulk-adjust.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Create BulkAdjustForm component**

```tsx
// components/admin/bulk-adjust-form.tsx
"use client";

import { useActionState } from "react";
import { bulkAdjustInventoryAction, type BulkAdjustState } from "@/src/features/inventory/bulk-adjust";

export function BulkAdjustForm() {
  const [state, formAction, isPending] = useActionState<BulkAdjustState, FormData>(
    bulkAdjustInventoryAction,
    null,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state?.status === "error" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state?.status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <p className="font-medium text-green-800">
            {state.succeeded} row{state.succeeded !== 1 ? "s" : ""} adjusted successfully.
          </p>
          {state.failed.length > 0 && (
            <ul className="mt-2 space-y-1">
              {state.failed.map((f, i) => (
                <li key={i} className="text-red-700">
                  {f.row.sku} / {f.row.warehouseCode}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label htmlFor="csv" className="block text-sm font-medium text-slate-700">
          CSV input
          <span className="ml-1 text-xs font-normal text-slate-400">
            — one row per line: sku,warehouse_code,delta,reason
          </span>
        </label>
        <pre className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          SKU-APPLE-1KG,WH01,50,purchase_receipt{"\n"}
          SKU-BANANA-500G,WH01,-3,damage
        </pre>
        <textarea
          id="csv"
          name="csv"
          rows={10}
          placeholder={"SKU-A,WH01,10,purchase_receipt\nSKU-B,WH02,-2,damage"}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Applying…" : "Apply adjustments"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Create bulk-adjust page**

```tsx
// app/admin/inventory/bulk-adjust/page.tsx
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BulkAdjustForm } from "@/components/admin/bulk-adjust-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";

export const dynamic = "force-dynamic";

async function checkAccess(): Promise<boolean> {
  if (shouldUseAdminPlaywrightFixture()) return true;
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:update");
    return true;
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return false;
    throw e;
  }
}

export default async function BulkAdjustPage() {
  const allowed = await checkAccess();

  if (!allowed) {
    return (
      <div>
        <AdminPageHeader title="Bulk Adjustment" />
        <p className="text-sm text-slate-600">You do not have access to inventory adjustments.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Bulk Inventory Adjustment"
        description="Paste CSV to apply multiple adjustments at once."
        action={
          <Link
            href="/admin/inventory"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← Inventory
          </Link>
        }
      />
      <BulkAdjustForm />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/inventory/bulk-adjust.ts src/features/inventory/bulk-adjust.test.ts \
  components/admin/bulk-adjust-form.tsx app/admin/inventory/bulk-adjust/page.tsx
git commit -m "feat(inventory): add bulk CSV adjustment page"
```

---

### Task 4: Purchase Orders — submit and cancel actions

**Files:**
- Create: `src/features/procurement/po-actions.ts`
- Create: `src/features/procurement/po-actions.test.ts`
- Modify: `app/admin/purchase-orders/[id]/page.tsx`

**Interfaces:**
- Produces: `submitPurchaseOrder(client, id: string): Promise<void>`
- Produces: `cancelPurchaseOrder(client, id: string): Promise<void>`
- Produces server action wrappers: `submitPurchaseOrderAction(id)`, `cancelPurchaseOrderAction(id)`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/procurement/po-actions.test.ts
import { describe, expect, it } from "vitest";
import { submitPurchaseOrder, cancelPurchaseOrder } from "./po-actions";

function makePOClient(currentStatus: string) {
  const updates: unknown[] = [];
  return {
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { status: currentStatus }, error: null }),
          }),
        }),
        update: (vals: unknown) => {
          updates.push(vals);
          return { eq: async () => ({ error: null }) };
        },
      }),
    },
    updates,
  };
}

describe("submitPurchaseOrder", () => {
  it("transitions draft → submitted", async () => {
    const { client, updates } = makePOClient("draft");
    await submitPurchaseOrder(client as never, "po-uuid");
    expect(updates[0]).toMatchObject({ status: "submitted" });
  });

  it("throws when status is not draft", async () => {
    const { client } = makePOClient("submitted");
    await expect(submitPurchaseOrder(client as never, "po-uuid")).rejects.toThrow(
      "can only be submitted",
    );
  });
});

describe("cancelPurchaseOrder", () => {
  it("transitions draft → cancelled", async () => {
    const { client, updates } = makePOClient("draft");
    await cancelPurchaseOrder(client as never, "po-uuid");
    expect(updates[0]).toMatchObject({ status: "cancelled" });
  });

  it("transitions submitted → cancelled", async () => {
    const { client, updates } = makePOClient("submitted");
    await cancelPurchaseOrder(client as never, "po-uuid");
    expect(updates[0]).toMatchObject({ status: "cancelled" });
  });

  it("throws when status is received", async () => {
    const { client } = makePOClient("received");
    await expect(cancelPurchaseOrder(client as never, "po-uuid")).rejects.toThrow("cannot be cancelled");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/features/procurement/po-actions.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement po-actions.ts**

```ts
// src/features/procurement/po-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

const CANCELLABLE_STATUSES = ["draft", "submitted"] as const;

async function getPOStatus(
  client: Pick<SupabaseClient, "from">,
  id: string,
): Promise<string> {
  const { data, error } = await client
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data.status;
}

export async function submitPurchaseOrder(
  client: Pick<SupabaseClient, "from">,
  id: string,
): Promise<void> {
  const status = await getPOStatus(client, id);
  if (status !== "draft") {
    throw new Error(`Purchase order can only be submitted when in 'draft' status. Current: '${status}'.`);
  }

  const { error } = await client
    .from("purchase_orders")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function cancelPurchaseOrder(
  client: Pick<SupabaseClient, "from">,
  id: string,
): Promise<void> {
  const status = await getPOStatus(client, id);
  if (!CANCELLABLE_STATUSES.includes(status as typeof CANCELLABLE_STATUSES[number])) {
    throw new Error(`Purchase order in '${status}' status cannot be cancelled.`);
  }

  const { error } = await client
    .from("purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function submitPurchaseOrderAction(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid PO id.");
  const client = await createServerClient();
  await requireAdminPermission(client, "purchase_orders:update");
  await submitPurchaseOrder(client, parsed.data);
  revalidatePath(`/admin/purchase-orders/${id}`);
}

export async function cancelPurchaseOrderAction(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid PO id.");
  const client = await createServerClient();
  await requireAdminPermission(client, "purchase_orders:update");
  await cancelPurchaseOrder(client, parsed.data);
  revalidatePath(`/admin/purchase-orders/${id}`);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/features/procurement/po-actions.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Add Submit and Cancel buttons to PO detail page**

In `app/admin/purchase-orders/[id]/page.tsx`, add a client component for the buttons:

```tsx
// components/admin/po-status-actions.tsx
"use client";

import { useTransition } from "react";
import {
  submitPurchaseOrderAction,
  cancelPurchaseOrderAction,
} from "@/src/features/procurement/po-actions";

type Props = { id: string; status: string };

export function POStatusActions({ id, status }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => submitPurchaseOrderAction(id))}
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {isPending ? "…" : "Submit PO"}
        </button>
      )}
      {(status === "draft" || status === "submitted") && (
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm("Cancel this purchase order?")) return;
            startTransition(() => cancelPurchaseOrderAction(id));
          }}
          className="min-h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isPending ? "…" : "Cancel PO"}
        </button>
      )}
    </div>
  );
}
```

Import and render `<POStatusActions id={po.id} status={po.status} />` in the PO detail page.

- [ ] **Step 6: Commit**

```bash
git add src/features/procurement/po-actions.ts src/features/procurement/po-actions.test.ts \
  components/admin/po-status-actions.tsx app/admin/purchase-orders/
git commit -m "feat(procurement): add submit and cancel actions to purchase orders"
```

---

### Task 5: Purchase Orders — goods receipt history

**Files:**
- Modify: `src/features/procurement/po-actions.ts` (add `getGoodsReceipts`)
- Modify: `src/features/procurement/po-actions.test.ts` (add receipt tests)
- Create: `app/admin/purchase-orders/[id]/receipts/page.tsx`

**Interfaces:**
- Produces: `getGoodsReceipts(client, purchaseOrderId: string): Promise<GoodsReceiptRow[]>`
- Produces type: `GoodsReceiptRow = { id: string; received_at: string; notes: string | null; lines: GoodsReceiptLine[] }`
- Produces type: `GoodsReceiptLine = { id: string; variant_sku: string; lot_no: string | null; received_qty: number; unit_cost: number }`

- [ ] **Step 1: Add failing test**

In `src/features/procurement/po-actions.test.ts`, append:

```ts
describe("getGoodsReceipts", () => {
  it("returns receipts with lines for a PO", async () => {
    const rows = [
      {
        id: "gr-1",
        received_at: "2026-01-15T10:00:00Z",
        notes: "All good",
        goods_receipt_lines: [
          {
            id: "grl-1",
            product_variants: { sku: "SKU-A" },
            lots: { lot_no: "LOT-001" },
            received_qty: 20,
            unit_cost: 5000,
          },
        ],
      },
    ];
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    };
    const result = await getGoodsReceipts(client as never, "po-uuid");
    expect(result).toHaveLength(1);
    expect(result[0].lines[0].variant_sku).toBe("SKU-A");
    expect(result[0].lines[0].lot_no).toBe("LOT-001");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/procurement/po-actions.test.ts
```
Expected: FAIL on `getGoodsReceipts` test

- [ ] **Step 3: Implement getGoodsReceipts**

Append to `src/features/procurement/po-actions.ts`:

```ts
export type GoodsReceiptLine = {
  id: string;
  variant_sku: string;
  lot_no: string | null;
  received_qty: number;
  unit_cost: number;
};

export type GoodsReceiptRow = {
  id: string;
  received_at: string;
  notes: string | null;
  lines: GoodsReceiptLine[];
};

type RawLine = {
  id: string;
  product_variants: { sku: string } | null;
  lots: { lot_no: string } | null;
  received_qty: number;
  unit_cost: number;
};

type RawReceipt = {
  id: string;
  received_at: string;
  notes: string | null;
  goods_receipt_lines: RawLine[];
};

export async function getGoodsReceipts(
  client: Pick<SupabaseClient, "from">,
  purchaseOrderId: string,
): Promise<GoodsReceiptRow[]> {
  const { data, error } = await client
    .from("goods_receipts")
    .select(
      "id, received_at, notes, goods_receipt_lines(id, product_variants(sku), lots(lot_no), received_qty, unit_cost)",
    )
    .eq("purchase_order_id", purchaseOrderId)
    .order("received_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as RawReceipt[]).map((r) => ({
    id: r.id,
    received_at: r.received_at,
    notes: r.notes,
    lines: (r.goods_receipt_lines ?? []).map((l) => ({
      id: l.id,
      variant_sku: l.product_variants?.sku ?? "—",
      lot_no: l.lots?.lot_no ?? null,
      received_qty: l.received_qty,
      unit_cost: l.unit_cost,
    })),
  }));
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/procurement/po-actions.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Create goods receipt history page**

```tsx
// app/admin/purchase-orders/[id]/receipts/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { getGoodsReceipts, type GoodsReceiptRow } from "@/src/features/procurement/po-actions";
import { createServerClient } from "@/src/lib/supabase/server";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";

export const dynamic = "force-dynamic";

type Params = { id: string };
type PageData =
  | { access: "allowed"; receipts: GoodsReceiptRow[]; poNo: string }
  | { access: "denied" }
  | { access: "not_found" };

async function getPageData(id: string): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", receipts: [], poNo: id };
  }
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "purchase_orders:read");

    const { data: po } = await client
      .from("purchase_orders")
      .select("po_no")
      .eq("id", id)
      .single();

    if (!po) return { access: "not_found" };

    const receipts = await getGoodsReceipts(client, id);
    return { access: "allowed", receipts, poNo: po.po_no };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function GoodsReceiptsPage({ params }: { params: Params }) {
  const pageData = await getPageData(params.id);

  if (pageData.access === "not_found") notFound();
  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Goods Receipts" />
        <p className="text-sm text-slate-600">You do not have access to purchase orders.</p>
      </div>
    );
  }

  const { receipts, poNo } = pageData;

  return (
    <div>
      <AdminPageHeader
        title={`Goods Receipts — ${poNo}`}
        description="All receiving events for this purchase order."
        action={
          <Link
            href={`/admin/purchase-orders/${params.id}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← Purchase order
          </Link>
        }
      />

      {receipts.length === 0 ? (
        <p className="text-sm text-slate-500">No goods receipts recorded yet.</p>
      ) : (
        <div className="space-y-6">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">
                  Received {new Date(receipt.received_at).toLocaleString()}
                </p>
                {receipt.notes && (
                  <p className="text-xs text-slate-500">{receipt.notes}</p>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="pb-1 pr-4">SKU</th>
                    <th className="pb-1 pr-4">Lot</th>
                    <th className="pb-1 pr-4">Qty received</th>
                    <th className="pb-1">Unit cost</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.lines.map((line) => (
                    <tr key={line.id} className="border-b border-slate-50">
                      <td className="py-1 pr-4 font-mono text-xs">{line.variant_sku}</td>
                      <td className="py-1 pr-4 font-mono text-xs text-slate-500">
                        {line.lot_no ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-1 pr-4">{line.received_qty}</td>
                      <td className="py-1">{line.unit_cost.toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Also add a "View receipts" link on the PO detail page:
```tsx
<Link
  href={`/admin/purchase-orders/${po.id}/receipts`}
  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
>
  View receipts
</Link>
```

- [ ] **Step 6: Commit**

```bash
git add src/features/procurement/po-actions.ts src/features/procurement/po-actions.test.ts \
  app/admin/purchase-orders/
git commit -m "feat(procurement): add goods receipt history page"
```

---

### Task 6: Purchase Orders list — status and supplier filter

**Files:**
- Modify: `app/admin/purchase-orders/page.tsx`

- [ ] **Step 1: Update page to read search params and filter**

Replace the data-fetching function in `app/admin/purchase-orders/page.tsx`:

```tsx
// app/admin/purchase-orders/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SearchParams } from "next/dist/server/request/search-params";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

const PO_STATUSES = ["draft", "submitted", "partially_received", "received", "cancelled"];

type PORow = {
  id: string;
  po_no: string;
  supplier_name: string;
  warehouse_code: string;
  status: string;
  ordered_total: number;
  received_total: number;
};

type Supplier = { id: string; name: string };

type PageData =
  | { access: "allowed"; rows: PORow[]; suppliers: Supplier[]; statusFilter: string; supplierFilter: string }
  | { access: "denied" };

async function getPageData(searchParams: SearchParams): Promise<PageData> {
  const statusFilter = String(searchParams.status ?? "");
  const supplierFilter = String(searchParams.supplierId ?? "");

  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: [], suppliers: [], statusFilter, supplierFilter };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "purchase_orders:read");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = client
      .from("purchase_orders")
      .select("id, po_no, status, ordered_total, received_total, suppliers(id, name), warehouses(code)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter) q = q.eq("status", statusFilter);
    if (supplierFilter) q = q.eq("supplier_id", supplierFilter);

    const [{ data: poData, error }, { data: supplierData }] = await Promise.all([
      q,
      client.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    ]);

    if (error) throw error;

    type RawPO = {
      id: string; po_no: string; status: string;
      ordered_total: number; received_total: number;
      suppliers: { name: string } | null;
      warehouses: { code: string } | null;
    };

    const rows: PORow[] = ((poData ?? []) as RawPO[]).map((r) => ({
      id: r.id,
      po_no: r.po_no,
      supplier_name: r.suppliers?.name ?? "—",
      warehouse_code: r.warehouses?.code ?? "—",
      status: r.status,
      ordered_total: r.ordered_total,
      received_total: r.received_total,
    }));

    return {
      access: "allowed",
      rows,
      suppliers: (supplierData ?? []) as Supplier[],
      statusFilter,
      supplierFilter,
    };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminPurchaseOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const pageData = await getPageData(searchParams);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Purchase Orders" />
        <p className="text-sm text-slate-600">You do not have access to purchase orders.</p>
      </div>
    );
  }

  const { rows, suppliers, statusFilter, supplierFilter } = pageData;

  return (
    <div>
      <AdminPageHeader
        title="Purchase Orders"
        description="Track inbound stock orders from suppliers."
        action={
          <Link
            href="/admin/purchase-orders/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New PO
          </Link>
        }
      />

      {/* Filter bar */}
      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <select
          name="status"
          defaultValue={statusFilter}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          name="supplierId"
          defaultValue={supplierFilter}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Filter
        </button>
        {(statusFilter || supplierFilter) && (
          <Link
            href="/admin/purchase-orders"
            className="flex min-h-9 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "po_no", label: "PO No." },
          { key: "supplier_name", label: "Supplier" },
          { key: "warehouse_code", label: "Warehouse" },
          { key: "status", label: "Status", render: (row) => <StatusChip value={row.status} tone="neutral" /> },
          { key: "ordered_total", label: "Ordered", render: (row) => <span>{row.ordered_total.toLocaleString()}đ</span> },
          { key: "received_total", label: "Received", render: (row) => <span>{row.received_total.toLocaleString()}đ</span> },
        ]}
        rows={rows}
        emptyMessage="No purchase orders found."
        actionsSlot={(row) => (
          <Link href={`/admin/purchase-orders/${row.id}`} className="text-sm text-teal-700 hover:underline">
            View
          </Link>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/purchase-orders/page.tsx
git commit -m "feat(procurement): add status and supplier filter to purchase orders list"
```
