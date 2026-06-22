# Dashboard & Reports Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date-range filters, a canvas-based bar chart, CSV export, a customer activity report, and a revenue trend chart to the dashboard and reports pages.

**Architecture:** Date parsing and CSV serialization logic lives in `src/features/reports/` with unit tests. The bar chart is a pure canvas client component — no chart library is added. Reports receive date range from URL `searchParams` (GET form). CSV export is a Next.js Route Handler at `app/admin/reports/[reportKey]/export/route.ts`. The promotion usage fix depends on Plan 3 (Promotions), but the SQL migration stub is written here so it can be applied once that table exists.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Tailwind CSS, Vitest, HTML Canvas API

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "reports:read")` on all report access
- Tests mock Supabase as plain JS object, run with `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- **No external chart libraries** — chart is rendered via `<canvas>` and `CanvasRenderingContext2D`

---

### Task 1: Date Range Parsing Utility

**Files:**
- Create: `src/features/reports/date-range.ts`
- Test: `src/features/reports/date-range.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/reports/date-range.test.ts
import { describe, it, expect } from "vitest";
import { parseDateRange } from "./date-range";

describe("parseDateRange", () => {
  it("defaults to last 7 days when no args given", () => {
    const result = parseDateRange(undefined, undefined, new Date("2026-06-22"));
    expect(result.to).toBe("2026-06-22");
    expect(result.from).toBe("2026-06-15");
  });

  it("accepts valid ISO date strings", () => {
    const result = parseDateRange("2026-05-01", "2026-05-31", new Date("2026-06-22"));
    expect(result.from).toBe("2026-05-01");
    expect(result.to).toBe("2026-05-31");
  });

  it("clamps range to max 90 days — moves from forward if range too wide", () => {
    const result = parseDateRange("2026-01-01", "2026-12-31", new Date("2026-06-22"));
    // to stays, from is moved forward so range = 90 days
    const from = new Date(result.from);
    const to = new Date(result.to);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
    expect(result.to).toBe("2026-12-31");
  });

  it("swaps from/to if from is after to", () => {
    const result = parseDateRange("2026-06-22", "2026-06-01", new Date("2026-06-22"));
    expect(new Date(result.from) <= new Date(result.to)).toBe(true);
  });

  it("ignores invalid (non-date) strings and falls back to default", () => {
    const result = parseDateRange("not-a-date", "also-bad", new Date("2026-06-22"));
    expect(result.to).toBe("2026-06-22");
    expect(result.from).toBe("2026-06-15");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/reports/date-range.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/reports/date-range.ts`**

```ts
// src/features/reports/date-range.ts
const MAX_RANGE_DAYS = 90;
const DEFAULT_RANGE_DAYS = 7;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDateRange(
  rawFrom?: string,
  rawTo?: string,
  now = new Date(),
): { from: string; to: string } {
  const todayMs = new Date(toIsoDate(now)).getTime();

  let from = new Date(todayMs - DEFAULT_RANGE_DAYS * 86_400_000);
  let to = new Date(todayMs);

  const parsedFrom = rawFrom ? new Date(rawFrom) : null;
  const parsedTo = rawTo ? new Date(rawTo) : null;

  const fromValid = parsedFrom instanceof Date && !isNaN(parsedFrom.getTime());
  const toValid = parsedTo instanceof Date && !isNaN(parsedTo.getTime());

  if (fromValid && toValid) {
    // Ensure correct order
    from = parsedFrom < parsedTo ? parsedFrom : parsedTo;
    to = parsedFrom < parsedTo ? parsedTo : parsedFrom;

    // Clamp to max range
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (diffDays > MAX_RANGE_DAYS) {
      from = new Date(to.getTime() - MAX_RANGE_DAYS * 86_400_000);
    }
  } else if (fromValid) {
    from = parsedFrom;
    to = new Date(Math.min(from.getTime() + DEFAULT_RANGE_DAYS * 86_400_000, todayMs));
  } else if (toValid) {
    to = parsedTo;
    from = new Date(to.getTime() - DEFAULT_RANGE_DAYS * 86_400_000);
  }

  return { from: toIsoDate(from), to: toIsoDate(to) };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/reports/date-range.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/date-range.ts src/features/reports/date-range.test.ts
git commit -m "feat(reports): add date range parsing utility"
```

---

### Task 2: CSV Export Utility

**Files:**
- Create: `src/features/reports/csv-export.ts`
- Test: `src/features/reports/csv-export.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/reports/csv-export.test.ts
import { describe, it, expect } from "vitest";
import { toCsv } from "./csv-export";

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("produces headers from first row keys", () => {
    const rows = [{ name: "Apple", qty: 10 }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,qty");
  });

  it("produces data rows", () => {
    const rows = [
      { name: "Apple", qty: 10 },
      { name: "Banana", qty: 5 },
    ];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Apple,10");
    expect(lines[2]).toBe("Banana,5");
  });

  it("wraps values containing commas in double quotes", () => {
    const rows = [{ name: "Smith, John", amount: 100 }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Smith, John",100');
  });

  it("escapes double quotes inside values", () => {
    const rows = [{ note: 'He said "hello"' }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"He said ""hello"""');
  });

  it("converts null and undefined to empty string", () => {
    const rows = [{ a: null, b: undefined, c: "ok" }] as unknown as Record<string, unknown>[];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",,ok");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/reports/csv-export.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/reports/csv-export.ts`**

```ts
// src/features/reports/csv-export.ts
function escapeCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","));

  return [headerLine, ...dataLines].join("\n");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/reports/csv-export.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/csv-export.ts src/features/reports/csv-export.test.ts
git commit -m "feat(reports): add CSV serialization utility"
```

---

### Task 3: Reports Page — Date Range Filter

**Files:**
- Modify: `app/admin/reports/page.tsx`

- [ ] **Step 1: Read the current reports page**

Open `app/admin/reports/page.tsx` and identify:
- Where each RPC call is made (`get_daily_sales_report`, `get_product_sales_report`, etc.)
- The current hardcoded 7-day window (likely something like `new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0,10)`)
- The page's props signature (currently `export default async function AdminReportsPage()`)

- [ ] **Step 2: Update the page to accept searchParams and use parseDateRange**

```tsx
// app/admin/reports/page.tsx — top section changes

export const dynamic = "force-dynamic";

import { parseDateRange } from "@/src/features/reports/date-range";
// ... existing imports ...

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params.from, params.to);

  // Replace every hardcoded date calculation with `from` and `to`:
  // Before: const startDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  // After: use `from` for start_date and `to` for end_date in all RPC calls.

  // Example RPC call change:
  // Before: await client.rpc("get_daily_sales_report", { start_date: sevenDaysAgo, end_date: today })
  // After:  await client.rpc("get_daily_sales_report", { start_date: from, end_date: to })

  // ... rest of the function remains the same ...
}
```

- [ ] **Step 3: Add the date filter form above the first report section**

In the JSX return, add this before the first report section:

```tsx
{/* Date range filter */}
<form method="GET" className="mb-8 flex flex-wrap items-end gap-3">
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">From</span>
    <input
      type="date"
      name="from"
      defaultValue={from}
      className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
    />
  </label>
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">To</span>
    <input
      type="date"
      name="to"
      defaultValue={to}
      className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
    />
  </label>
  <button
    type="submit"
    className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800"
  >
    Apply
  </button>
</form>
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/reports/page.tsx
git commit -m "feat(reports): add date-range filter using searchParams"
```

---

### Task 4: CSV Export Route Handler

**Files:**
- Create: `app/admin/reports/[reportKey]/export/route.ts`

- [ ] **Step 1: Create the export route**

```ts
// app/admin/reports/[reportKey]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { parseDateRange } from "@/src/features/reports/date-range";
import { toCsv } from "@/src/features/reports/csv-export";

const ALLOWED_REPORT_KEYS = new Set([
  "daily-sales",
  "product-sales",
  "refunds",
  "purchase-orders",
  "stock-adjustments",
]);

const RPC_MAP: Record<string, string> = {
  "daily-sales": "get_daily_sales_report",
  "product-sales": "get_product_sales_report",
  "refunds": "get_refunds_report",
  "purchase-orders": "get_po_report",
  "stock-adjustments": "get_stock_adjustments_report",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportKey: string }> },
) {
  const { reportKey } = await params;

  if (!ALLOWED_REPORT_KEYS.has(reportKey)) {
    return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  }

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "reports:read");
  } catch {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const { from, to } = parseDateRange(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  const rpcName = RPC_MAP[reportKey];
  const { data, error } = await client.rpc(rpcName, { start_date: from, end_date: to });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch report." }, { status: 500 });
  }

  const csv = toCsv((data ?? []) as Record<string, unknown>[]);
  const filename = `${reportKey}-${from}-${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Add "Export CSV" links to `app/admin/reports/page.tsx`**

For each report section header, add a link alongside the section title. Pass the current `from` and `to` as query params:

```tsx
// Example for the daily sales section header:
<div className="flex items-center justify-between">
  <h2 className="text-base font-semibold text-slate-800">Daily Sales</h2>
  <a
    href={`/admin/reports/daily-sales/export?from=${from}&to=${to}`}
    className="text-xs font-medium text-teal-700 hover:text-teal-900"
  >
    Export CSV
  </a>
</div>
```

Repeat for: product-sales, refunds, purchase-orders, stock-adjustments sections.

- [ ] **Step 3: Commit**

```bash
git add app/admin/reports/\[reportKey\]/export/route.ts app/admin/reports/page.tsx
git commit -m "feat(reports): add CSV export route handler and export links"
```

---

### Task 5: Canvas Bar Chart Component

**Files:**
- Create: `components/admin/bar-chart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/admin/bar-chart.tsx
"use client";

import { useEffect, useRef } from "react";

type BarDatum = {
  label: string;
  value: number;
};

type Props = {
  data: BarDatum[];
  height?: number;
};

export function BarChart({ data, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = height;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const PADDING_LEFT = 40;
    const PADDING_BOTTOM = 28;
    const PADDING_TOP = 12;
    const PADDING_RIGHT = 8;

    const chartW = cssWidth - PADDING_LEFT - PADDING_RIGHT;
    const chartH = cssHeight - PADDING_BOTTOM - PADDING_TOP;

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const barW = Math.max(4, Math.floor((chartW / data.length) * 0.6));
    const barGap = Math.max(2, Math.floor((chartW / data.length) * 0.4));

    // Clear
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Y-axis grid lines + labels
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = PADDING_TOP + chartH - (i / gridSteps) * chartH;
      const val = Math.round((i / gridSteps) * maxVal);

      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(PADDING_LEFT + chartW, y);
      ctx.stroke();

      ctx.fillText(
        val >= 1_000_000
          ? `${(val / 1_000_000).toFixed(1)}M`
          : val >= 1_000
          ? `${(val / 1_000).toFixed(0)}k`
          : String(val),
        PADDING_LEFT - 4,
        y + 3,
      );
    }

    // Bars
    ctx.textAlign = "center";

    data.forEach((d, i) => {
      const x = PADDING_LEFT + i * (barW + barGap) + barGap / 2;
      const barH = (d.value / maxVal) * chartH;
      const y = PADDING_TOP + chartH - barH;

      ctx.fillStyle = "#0d9488"; // teal-600
      ctx.fillRect(x, y, barW, barH);

      // X-axis label — show every nth label to avoid crowding
      const showEvery = Math.ceil(data.length / 10);
      if (i % showEvery === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "9px system-ui, sans-serif";
        // Show last 4 chars of label (e.g. "06-15" from "2026-06-15")
        ctx.fillText(d.label.slice(-5), x + barW / 2, PADDING_TOP + chartH + 14);
      }
    });
  }, [data, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
      aria-label="Bar chart"
      role="img"
    />
  );
}
```

- [ ] **Step 2: Add the bar chart to the daily sales section in `app/admin/reports/page.tsx`**

```tsx
// At the top of the file, add:
import { BarChart } from "@/components/admin/bar-chart";

// Above the daily sales table, add:
{dailySalesReport.length > 0 && (
  <div className="mb-4 rounded-lg border border-slate-100 bg-white p-4">
    <BarChart
      data={dailySalesReport.map((r) => ({
        label: String(r.date),
        value: Number(r.revenue),
      }))}
      height={140}
    />
  </div>
)}
```

Note: `dailySalesReport` is whatever variable holds the result of the `get_daily_sales_report` RPC in the current `app/admin/reports/page.tsx`. Use the exact variable name found in that file.

- [ ] **Step 3: Commit**

```bash
git add components/admin/bar-chart.tsx app/admin/reports/page.tsx
git commit -m "feat(reports): add canvas bar chart component and wire into daily sales section"
```

---

### Task 6: Dashboard Revenue Trend Chart

**Files:**
- Modify: `src/features/admin/dashboard.ts`
- Test: `src/features/admin/dashboard.test.ts`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add `getDashboardTrend` to `src/features/admin/dashboard.ts`**

```ts
// Add to src/features/admin/dashboard.ts:
export type TrendPoint = { date: string; revenue: number };

export async function getDashboardTrend(
  client: Pick<SupabaseClient, "rpc">,
): Promise<TrendPoint[]> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await client.rpc("get_daily_sales_report", {
    start_date: sevenDaysAgo,
    end_date: today,
  });

  if (error) throw error;

  return ((data ?? []) as Array<{ date: string; revenue: string | number }>).map((row) => ({
    date: String(row.date),
    revenue: Number(row.revenue),
  }));
}
```

- [ ] **Step 2: Write a test for getDashboardTrend**

```ts
// Add to src/features/admin/dashboard.test.ts:
describe("getDashboardTrend", () => {
  it("calls get_daily_sales_report RPC and maps rows to TrendPoint", async () => {
    const rpcCalls: string[] = [];
    const mockClient = {
      rpc: async (name: string) => {
        rpcCalls.push(name);
        return {
          data: [
            { date: "2026-06-15", revenue: "500000" },
            { date: "2026-06-16", revenue: "750000" },
          ],
          error: null,
        };
      },
    };

    const { getDashboardTrend } = await import("./dashboard");
    const result = await getDashboardTrend(mockClient as never);

    expect(rpcCalls).toContain("get_daily_sales_report");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-06-15", revenue: 500000 });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm vitest run src/features/admin/dashboard.test.ts
```
Expected: PASS

- [ ] **Step 4: Add the trend chart to `app/admin/page.tsx`**

```tsx
// At the top of app/admin/page.tsx, add:
import { BarChart } from "@/components/admin/bar-chart";
import { getDashboardTrend } from "@/src/features/admin/dashboard";

// In the data fetching section of getAdminDashboardData (or wherever metrics are fetched),
// also fetch the trend. Add alongside existing metric fetch:
const trend = await getDashboardTrend(client);

// In the JSX, after the metric tiles grid, add:
{trend.length > 0 && (
  <section className="mt-8">
    <h2 className="mb-3 text-sm font-semibold text-slate-700">Revenue — last 7 days</h2>
    <div className="rounded-lg border border-slate-100 bg-white p-4">
      <BarChart
        data={trend.map((p) => ({ label: p.date, value: p.revenue }))}
        height={120}
      />
    </div>
  </section>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/dashboard.ts src/features/admin/dashboard.test.ts app/admin/page.tsx
git commit -m "feat(dashboard): add revenue trend chart using 7-day RPC data"
```

---

### Task 7: Promotion Usage Report Fix (DB Migration Stub)

**Files:**
- Create: `supabase/migrations/202606220019_promotion_usage_rpc.sql`

Note: This migration depends on the `promotions` table being created by Plan 3 (Promotions). **Apply this migration only after Plan 3 is complete.** The file is written now so nothing is forgotten.

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/202606220019_promotion_usage_rpc.sql
-- DEPENDENCY: requires the `promotions` table from the Promotions plan.
-- Apply after Plan 3 (2026-06-22-promotions.md) is complete.

create or replace function get_promotion_usage_report(start_date date, end_date date)
returns table(
  code       text,
  name       text,
  used_count bigint,
  total_discount numeric
)
language sql stable as $$
  select
    p.code,
    p.name,
    p.used_count::bigint,
    0::numeric as total_discount
  from promotions p
  where p.created_at::date between start_date and end_date
  order by p.used_count desc;
$$;
```

Note: `total_discount` returns 0 until Plan 3 wires a `promotion_id` FK into `order_items`. The `promotion_snapshot` jsonb column exists in `order_items` but extracting a reliable monetary value from unstructured JSON is deferred.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/202606220019_promotion_usage_rpc.sql
git commit -m "feat(reports): add promotion_usage_rpc migration stub (apply after Promotions plan)"
```

---

### Task 8: Customer Activity Report

**Files:**
- Create: `supabase/migrations/202606220020_customer_report_rpc.sql`
- Modify: `app/admin/reports/page.tsx`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/202606220020_customer_report_rpc.sql
create or replace function get_customer_report(start_date date, end_date date)
returns table(
  customer_id  uuid,
  full_name    text,
  email        text,
  order_count  bigint,
  total_spent  numeric,
  loyalty_tier text
)
language sql stable as $$
  select
    c.id              as customer_id,
    c.full_name,
    c.email,
    count(o.id)       as order_count,
    coalesce(sum(o.total), 0) as total_spent,
    c.loyalty_tier
  from customers c
  left join orders o
    on  o.customer_id = c.id
    and o.created_at::date between start_date and end_date
    and o.status = 'delivered'
  group by c.id, c.full_name, c.email, c.loyalty_tier
  order by total_spent desc
  limit 50;
$$;
```

Apply: `pnpm supabase db push`

- [ ] **Step 2: Add the customer report section to `app/admin/reports/page.tsx`**

Fetch the data alongside the other reports:

```tsx
// In the data fetching section (parallel with other RPC calls):
const customerReportResult = await client.rpc("get_customer_report", {
  start_date: from,
  end_date: to,
});
const customerReport = (customerReportResult.data ?? []) as Array<{
  customer_id: string;
  full_name: string;
  email: string;
  order_count: number;
  total_spent: number;
  loyalty_tier: string;
}>;
```

Add a new section in the JSX at the bottom of the reports page:

```tsx
<section>
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-semibold text-slate-800">Customer Activity</h2>
    <a
      href={`/admin/reports/customer-activity/export?from=${from}&to=${to}`}
      className="text-xs font-medium text-teal-700 hover:text-teal-900"
    >
      Export CSV
    </a>
  </div>
  <AdminDataTable
    columns={[
      { key: "full_name", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "order_count", label: "Orders" },
      {
        key: "total_spent",
        label: "Total spent",
        render: (row) => (
          <span>{Number(row.total_spent).toLocaleString()}đ</span>
        ),
      },
      { key: "loyalty_tier", label: "Tier" },
    ]}
    rows={customerReport.map((r) => ({ ...r, id: r.customer_id }))}
    emptyMessage="No customer activity in this period."
  />
</section>
```

- [ ] **Step 3: Add `customer-activity` to the export route's allowed keys and RPC map**

In `app/admin/reports/[reportKey]/export/route.ts`:

```ts
const ALLOWED_REPORT_KEYS = new Set([
  "daily-sales",
  "product-sales",
  "refunds",
  "purchase-orders",
  "stock-adjustments",
  "customer-activity",  // add this
]);

const RPC_MAP: Record<string, string> = {
  "daily-sales": "get_daily_sales_report",
  "product-sales": "get_product_sales_report",
  "refunds": "get_refunds_report",
  "purchase-orders": "get_po_report",
  "stock-adjustments": "get_stock_adjustments_report",
  "customer-activity": "get_customer_report",  // add this
};
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606220020_customer_report_rpc.sql \
        app/admin/reports/page.tsx \
        app/admin/reports/\[reportKey\]/export/route.ts
git commit -m "feat(reports): add customer activity report with RPC and CSV export"
```
