# Admin CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every admin list page with working Create, Update, and detail views, closing the gap between existing read-only tables and fully operational CRUD.

**Architecture:** All create/update mutations use Next.js server actions (`useActionState` form pattern) matching the existing `product-edit-form.tsx` pattern. Pages that need to load reference data (supplier list, warehouse list, variant list) are RSC server components that pass data as props to client form components. Complex multi-row forms (Purchase Orders) use client-side `useState` for dynamic rows and `fetch` to hit the existing API route handlers. No new state management library is added.

**Tech Stack:** Next.js 16 App Router · Supabase JS client · Zod · `useActionState` (React 19) · Vitest · `pnpm`

## Global Constraints

- Use `pnpm` — never `npm` or `yarn`.
- `strict` TypeScript — no `any`, no type assertions except where the existing codebase already uses them (`as never`, `as unknown`).
- All server actions must call `requireAdminPermission` before touching data.
- Vietnamese UI labels where the existing forms use Vietnamese (e.g. "Lưu", "Hủy").
- Reuse existing components: `AdminPageHeader`, `AdminDataTable`, `StatusChip`, `FilterBar`.
- Add `"use client"` only to files that use hooks or browser APIs.
- All new mutations must call `revalidatePath` on affected list routes.
- Do **not** implement CMS Content CRUD — that is a separate plan.
- Commit directly to `main` (no branch/worktree needed per AGENTS.md).
- Run `pnpm test` and `pnpm lint` after every task.

---

## Current CRUD Gap Map

| Section | Create | Read | Update | Delete/Archive |
|---|---|---|---|---|
| Products | ❌ button dead | ✅ | ✅ edit form exists | ✅ archive exists |
| Orders | n/a (checkout only) | ❌ detail is stub | ❌ no transition UI | n/a |
| Inventory | ❌ no adjustment UI | ✅ | (ledger-based) | n/a |
| Purchase Orders | ❌ button dead | ❌ no detail page | ❌ no receive UI | n/a |
| Refunds | ❌ button dead | ✅ | n/a | n/a |
| Complaints | ❌ button dead | ❌ no detail page | ❌ no resolve UI | n/a |
| Content/CMS | **excluded** | ✅ | **excluded** | **excluded** |

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/features/catalog/admin-actions.ts` | Modify | Add `createProduct` server action |
| `components/admin/product-create-form.tsx` | Create | New product form (client component) |
| `app/admin/products/new/page.tsx` | Create | New product page (RSC) |
| `app/admin/products/page.tsx` | Modify | Wire "New product" button to `/admin/products/new` |
| `src/features/orders/queries.ts` | Modify | Add `id` to `AdminOrderRow`; add `getAdminOrderDetail` |
| `app/admin/orders/page.tsx` | Modify | Add "View" actionsSlot with order ID link |
| `app/admin/orders/[id]/page.tsx` | Modify | Replace stub with real order detail + transition buttons |
| `components/admin/order-transition-button.tsx` | Create | Client button that POSTs to transition API |
| `src/features/inventory/queries.ts` | Modify | Add `variantId` + `warehouseCode` to `AdminInventoryRow` |
| `src/features/inventory/admin-actions.ts` | Create | `adjustInventoryBySku` server action |
| `components/admin/inventory-adjustment-form.tsx` | Create | Inline stock adjustment form per row |
| `app/admin/inventory/page.tsx` | Modify | Add actionsSlot with adjustment form |
| `components/admin/purchase-order-create-form.tsx` | Create | Multi-line PO create form (client component) |
| `app/admin/purchase-orders/new/page.tsx` | Create | New PO page — loads suppliers/warehouses/variants for dropdowns |
| `app/admin/purchase-orders/page.tsx` | Modify | Wire "New purchase order" button |
| `app/admin/purchase-orders/[id]/page.tsx` | Create | PO detail — shows lines + receive button |
| `components/admin/purchase-order-receive-form.tsx` | Create | Multi-line goods receipt form (client component) |
| `app/admin/purchase-orders/[id]/receive/page.tsx` | Create | Receive page — loads PO lines for form |
| `components/admin/refund-create-form.tsx` | Create | Refund create form (client component) |
| `app/admin/refunds/new/page.tsx` | Create | New refund page |
| `app/admin/refunds/page.tsx` | Modify | Wire "New refund" button |
| `components/admin/complaint-create-form.tsx` | Create | Complaint create form (client component) |
| `components/admin/complaint-update-form.tsx` | Create | Complaint update form (client component) |
| `app/admin/complaints/new/page.tsx` | Create | New complaint page |
| `app/admin/complaints/[id]/page.tsx` | Create | Complaint detail + resolve form |
| `app/admin/complaints/page.tsx` | Modify | Wire "New complaint" button + row link |

---

## Task 1: Product Create

**Files:**
- Modify: `src/features/catalog/admin-actions.ts`
- Create: `components/admin/product-create-form.tsx`
- Create: `app/admin/products/new/page.tsx`
- Modify: `app/admin/products/page.tsx`
- Test: `src/features/catalog/admin-actions.test.ts`

**Interfaces:**
- Produces: `createProduct(_prev: CreateProductState, formData: FormData): Promise<CreateProductState>` exported from `admin-actions.ts`
- Produces: `type CreateProductState = { error: string } | null`

- [ ] **Step 1: Write the failing test**

Add to `src/features/catalog/admin-actions.test.ts`:

```typescript
import { createProduct } from "./admin-actions";

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const insertChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "new-product-uuid" }, error: null }),
      }),
    };
    const fromChain = {
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ admin_roles: { name: "super_admin" } }],
          error: null,
        }),
      }),
    };
    mockFrom.mockReturnValue(fromChain);
  });

  it("returns error when name is empty", async () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("status", "draft");
    fd.set("temperatureClass", "fresh");
    const result = await createProduct(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("inserts product and redirects on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("name", "Cá hồi tươi");
    fd.set("status", "draft");
    fd.set("shortDescription", "");
    fd.set("description", "");
    fd.set("origin", "Na Uy");
    fd.set("temperatureClass", "fresh");
    await createProduct(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining("/admin/products/"));
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
pnpm test src/features/catalog/admin-actions
```
Expected: FAIL — `createProduct is not exported`

- [ ] **Step 3: Add `createProduct` to `src/features/catalog/admin-actions.ts`**

Add after the existing `archiveProduct` function:

```typescript
const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["draft", "published"]),
  shortDescription: z.string(),
  description: z.string(),
  origin: z.string(),
  temperatureClass: z.enum(["live", "fresh", "chilled", "frozen", "ready"]),
});

export type CreateProductState = { error: string } | null;

export async function createProduct(
  _prev: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const result = createProductSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    origin: formData.get("origin") ?? "",
    temperatureClass: formData.get("temperatureClass"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const baseSlug = result.data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await client
    .from("products")
    .insert({
      name: result.data.name,
      slug,
      status: result.data.status,
      short_description: result.data.shortDescription,
      description: result.data.description,
      origin: result.data.origin,
      temperature_class: result.data.temperatureClass,
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}/edit`);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/catalog/admin-actions
```
Expected: PASS

- [ ] **Step 5: Create `components/admin/product-create-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { createProduct, type CreateProductState } from "@/src/features/catalog/admin-actions";

export function ProductCreateForm() {
  const [state, action, isPending] = useActionState<CreateProductState, FormData>(
    createProduct,
    null,
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên sản phẩm</span>
        <input
          id="name"
          name="name"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="status"
          name="status"
          defaultValue="draft"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="temperatureClass">
        <span className="font-medium text-slate-700">Nhiệt độ bảo quản</span>
        <select
          id="temperatureClass"
          name="temperatureClass"
          defaultValue="fresh"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="live">Live (sống)</option>
          <option value="fresh">Fresh (tươi)</option>
          <option value="chilled">Chilled (ướp lạnh)</option>
          <option value="frozen">Frozen (đông lạnh)</option>
          <option value="ready">Ready (đã chế biến)</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="origin">
        <span className="font-medium text-slate-700">Xuất xứ</span>
        <input
          id="origin"
          name="origin"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="shortDescription">
        <span className="font-medium text-slate-700">Mô tả ngắn</span>
        <textarea
          id="shortDescription"
          name="shortDescription"
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="description">
        <span className="font-medium text-slate-700">Mô tả chi tiết</span>
        <textarea
          id="description"
          name="description"
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang tạo…" : "Tạo sản phẩm"}
        </button>
        <a
          href="/admin/products"
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create `app/admin/products/new/page.tsx`**

```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function AdminProductNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Product" />
          <p className="text-sm text-slate-600">You do not have access to create products.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New Product" description="Create a new storefront product." />
      <ProductCreateForm />
    </div>
  );
}
```

- [ ] **Step 7: Wire "New product" button in `app/admin/products/page.tsx`**

Replace the dead button:
```tsx
// Old:
<button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">
  <Plus className="h-4 w-4" aria-hidden="true" />
  New product
</button>

// New:
import Link from "next/link";
// ...
<Link
  href="/admin/products/new"
  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
>
  <Plus className="h-4 w-4" aria-hidden="true" />
  New product
</Link>
```

- [ ] **Step 8: Run lint and tests**

```bash
pnpm lint && pnpm test src/features/catalog/admin-actions
```
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add app/admin/products/new/page.tsx components/admin/product-create-form.tsx src/features/catalog/admin-actions.ts app/admin/products/page.tsx src/features/catalog/admin-actions.test.ts
git commit -m "feat(admin): add product create page and server action"
```

---

## Task 2: Orders List — Add Row Link + Detail Page Foundation

**Files:**
- Modify: `src/features/orders/queries.ts` — add `id` to `AdminOrderRow`
- Modify: `app/admin/orders/page.tsx` — add actionsSlot with View link
- Modify: `app/admin/orders/[id]/page.tsx` — replace stub with real detail

**Interfaces:**
- Modifies: `AdminOrderRow` adds `id: string`
- Produces: `getAdminOrderDetail(client, id: string): Promise<AdminOrderDetail>` for Task 3 to consume

- [ ] **Step 1: Write the failing test**

Create `src/features/orders/queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

import { getAdminOrderRows } from "./queries";

describe("getAdminOrderRows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps raw DB rows to AdminOrderRow including id", async () => {
    const selectChain = {
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "order-uuid-1",
            order_no: "ORD-001",
            order_status: "confirmed",
            payment_status: "paid",
            grand_total: 150000,
            created_at: "2026-06-01T10:00:00Z",
            placed_at: "2026-06-01T10:00:00Z",
          },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(selectChain) });

    const client = { from: mockFrom } as never;
    const rows = await getAdminOrderRows(client);

    expect(rows[0].id).toBe("order-uuid-1");
    expect(rows[0].orderNo).toBe("ORD-001");
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
pnpm test src/features/orders/queries
```
Expected: FAIL — `rows[0].id` is undefined

- [ ] **Step 3: Add `id` to `AdminOrderRow` in `src/features/orders/queries.ts`**

```typescript
// Full updated file:
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatVnd } from "@/src/lib/format";

export type AdminOrderRow = {
  id: string;
  orderNo: string;
  status: string;
  payment: string;
  total: string;
  placedAt: string;
};

type OrdersQueryClient = Pick<SupabaseClient, "from">;

type OrderRecord = {
  id: string;
  order_no: string;
  order_status: string;
  payment_status: string;
  grand_total: number | string;
  created_at: string;
  placed_at: string | null;
};

function formatAdminDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export async function getAdminOrderRows(client: OrdersQueryClient): Promise<AdminOrderRow[]> {
  const { data, error } = await client
    .from("orders")
    .select("id, order_no, order_status, payment_status, grand_total, created_at, placed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrderRecord[]).map((order) => ({
    id: order.id,
    orderNo: order.order_no,
    status: order.order_status,
    payment: order.payment_status,
    total: formatVnd(Number(order.grand_total)),
    placedAt: formatAdminDate(order.placed_at ?? order.created_at),
  }));
}

export type AdminOrderDetail = {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  shippingTotal: string;
  discountTotal: string;
  grandTotal: string;
  placedAt: string;
  customer: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: string;
    unitPrice: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string;
    status: string;
    amount: string;
    createdAt: string;
  }>;
};

type OrderDetailRecord = {
  id: string;
  order_no: string;
  order_status: string;
  payment_status: string;
  subtotal: number | string;
  shipping_total: number | string;
  discount_total: number | string;
  grand_total: number | string;
  placed_at: string | null;
  created_at: string;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type OrderItemRecord = {
  id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
};

type PaymentRecord = {
  id: string;
  provider: string;
  payment_method: string;
  status: string;
  amount: number | string;
  created_at: string;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function getAdminOrderDetail(
  client: OrdersQueryClient & Pick<SupabaseClient, "from">,
  id: string,
): Promise<AdminOrderDetail | null> {
  const [orderRes, itemsRes, paymentsRes] = await Promise.all([
    client
      .from("orders")
      .select("id, order_no, order_status, payment_status, subtotal, shipping_total, discount_total, grand_total, placed_at, created_at, customers(full_name)")
      .eq("id", id)
      .single(),
    client
      .from("order_items")
      .select("id, product_name_snapshot, sku_snapshot, quantity, unit_price")
      .eq("order_id", id),
    client
      .from("payments")
      .select("id, provider, payment_method, status, amount, created_at")
      .eq("order_id", id),
  ]);

  if (orderRes.error || !orderRes.data) return null;

  const order = orderRes.data as OrderDetailRecord;
  const customer = firstRelation(order.customers);

  return {
    id: order.id,
    orderNo: order.order_no,
    status: order.order_status,
    paymentStatus: order.payment_status,
    subtotal: formatVnd(Number(order.subtotal)),
    shippingTotal: formatVnd(Number(order.shipping_total)),
    discountTotal: formatVnd(Number(order.discount_total)),
    grandTotal: formatVnd(Number(order.grand_total)),
    placedAt: formatAdminDate(order.placed_at ?? order.created_at),
    customer: customer?.full_name ?? "—",
    items: ((itemsRes.data ?? []) as OrderItemRecord[]).map((item) => ({
      id: item.id,
      productName: item.product_name_snapshot,
      sku: item.sku_snapshot,
      quantity: String(item.quantity),
      unitPrice: formatVnd(Number(item.unit_price)),
    })),
    payments: ((paymentsRes.data ?? []) as PaymentRecord[]).map((p) => ({
      id: p.id,
      provider: p.provider,
      method: p.payment_method,
      status: p.status,
      amount: formatVnd(Number(p.amount)),
      createdAt: p.created_at.slice(0, 10),
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/orders/queries
```
Expected: PASS

- [ ] **Step 5: Update `app/admin/orders/page.tsx` to add actionsSlot**

In the `AdminDataTable` call, add `actionsSlot` after `emptyMessage`:
```tsx
actionsSlot={(row) => (
  <a
    href={`/admin/orders/${row.id}`}
    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    View
  </a>
)}
```

- [ ] **Step 6: Replace the stub `app/admin/orders/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip } from "@/components/admin/status-chip";
import { OrderTransitionButton } from "@/components/admin/order-transition-button";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { canTransitionOrder, type OrderStatus } from "@/src/features/orders/status";
import { getAdminOrderDetail } from "@/src/features/orders/queries";
import { createServerClient } from "@/src/lib/supabase/server";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

const ALL_STATUSES: OrderStatus[] = [
  "draft_checkout", "awaiting_payment", "payment_failed",
  "pending_confirmation", "confirmed", "picking", "packed",
  "dispatched", "delivery_attempted", "delivered", "completed",
  "cancelled", "returned", "partially_returned", "refunded",
];

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "orders:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Order Detail" />
          <p className="text-sm text-slate-600">You do not have access to orders.</p>
        </div>
      );
    }
    throw error;
  }

  const order = await getAdminOrderDetail(client, id);
  if (!order) notFound();

  const nextStatuses = ALL_STATUSES.filter((s) =>
    canTransitionOrder(order.status as OrderStatus, s),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Order ${order.orderNo}`} description={`Customer: ${order.customer}`} />

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <StatusChip value={order.status} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment</p>
          <StatusChip value={order.paymentStatus} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 font-semibold text-slate-800">{order.grandTotal}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Placed</p>
          <p className="mt-1 text-slate-700">{order.placedAt}</p>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Transition status</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <OrderTransitionButton key={s} orderId={id} nextStatus={s} />
            ))}
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Order items</h2>
        <AdminDataTable
          columns={[
            { key: "productName", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "quantity", label: "Qty" },
            { key: "unitPrice", label: "Unit price" },
          ]}
          rows={order.items}
          emptyMessage="No items."
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Payments</h2>
        <AdminDataTable
          columns={[
            { key: "provider", label: "Provider" },
            { key: "method", label: "Method" },
            { key: "amount", label: "Amount" },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusChip value={row.status} tone="neutral" />,
            },
            { key: "createdAt", label: "Date" },
          ]}
          rows={order.payments}
          emptyMessage="No payments."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Run lint**

```bash
pnpm lint
```
Expected: no errors (OrderTransitionButton will be a red import until Task 3)

- [ ] **Step 8: Commit**

```bash
git add src/features/orders/queries.ts src/features/orders/queries.test.ts app/admin/orders/page.tsx app/admin/orders/[id]/page.tsx
git commit -m "feat(admin): add order id to list rows, real order detail page"
```

---

## Task 3: Order Transition Button

**Files:**
- Create: `components/admin/order-transition-button.tsx`

**Interfaces:**
- Consumes: `OrderStatus` from `src/features/orders/status.ts`
- POSTs to `/api/admin/orders/[orderId]/transition` with `{ nextStatus }`

- [ ] **Step 1: Create `components/admin/order-transition-button.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderTransitionButtonProps = {
  orderId: string;
  nextStatus: string;
};

export function OrderTransitionButton({ orderId, nextStatus }: OrderTransitionButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(`Transition order to "${nextStatus}"?`)) return;
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Transition failed.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="inline-block">
      {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {isPending ? "…" : nextStatus.replace(/_/g, " ")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/order-transition-button.tsx
git commit -m "feat(admin): add order transition button"
```

---

## Task 4: Inventory Stock Adjustment UI

**Files:**
- Modify: `src/features/inventory/queries.ts` — add `warehouseCode` to row type
- Create: `src/features/inventory/admin-actions.ts`
- Create: `components/admin/inventory-adjustment-form.tsx`
- Modify: `app/admin/inventory/page.tsx`

**Interfaces:**
- Produces: `adjustInventoryBySku(formData: FormData): Promise<InventoryAdjustState>` — server action
- Produces: `type InventoryAdjustState = { error: string } | { success: true } | null`

- [ ] **Step 1: Write the failing test**

Create `src/features/inventory/admin-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSelectFrom = vi.fn();
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

import { adjustInventoryBySku } from "./admin-actions";

describe("adjustInventoryBySku", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
  });

  it("returns error when quantityDelta is zero", async () => {
    const fd = new FormData();
    fd.set("sku", "SKU-001");
    fd.set("warehouseCode", "HCM-01");
    fd.set("quantityDelta", "0");
    fd.set("reasonCode", "count");

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ admin_roles: { name: "super_admin" } }], error: null }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "v1" }, error: null }) }) }) };
    });

    const result = await adjustInventoryBySku(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("zero") });
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
pnpm test src/features/inventory/admin-actions
```
Expected: FAIL — module not found

- [ ] **Step 3: Add `warehouseCode` to `AdminInventoryRow` in `src/features/inventory/queries.ts`**

```typescript
// Only show the changed type and mapping; the rest of the file stays the same:

export type AdminInventoryRow = {
  sku: string;
  product: string;
  warehouse: string;
  warehouseCode: string;     // NEW — bare code for the adjustment form
  available: string;
  unit: string;
  quality: string;
};

// In the .map() callback, change to:
return ((data ?? []) as InventoryRpcRow[]).map((row) => ({
  sku: row.sku,
  product: row.product_name,
  warehouse: `${row.warehouse_code} - ${row.warehouse_name}`,
  warehouseCode: row.warehouse_code,   // NEW
  available: formatQuantity(row.available_quantity),
  unit: row.unit,
  quality: row.quality ?? "sellable",
}));
```

- [ ] **Step 4: Create `src/features/inventory/admin-actions.ts`**

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const adjustSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  warehouseCode: z.string().min(1, "Warehouse is required"),
  quantityDelta: z.coerce
    .number()
    .refine((n) => n !== 0, { message: "Delta cannot be zero" }),
  reasonCode: z.string().min(2, "Reason is required"),
});

export type InventoryAdjustState = { error: string } | { success: true } | null;

export async function adjustInventoryBySku(
  _prev: InventoryAdjustState,
  formData: FormData,
): Promise<InventoryAdjustState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const result = adjustSchema.safeParse({
    sku: formData.get("sku"),
    warehouseCode: formData.get("warehouseCode"),
    quantityDelta: formData.get("quantityDelta"),
    reasonCode: formData.get("reasonCode"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { sku, warehouseCode, quantityDelta, reasonCode } = result.data;

  const { data: variant, error: variantError } = await client
    .from("product_variants")
    .select("id")
    .eq("sku", sku)
    .single();

  if (variantError || !variant) {
    return { error: `Variant not found for SKU: ${sku}` };
  }

  const { data: warehouse, error: warehouseError } = await client
    .from("warehouses")
    .select("id")
    .eq("code", warehouseCode)
    .single();

  if (warehouseError || !warehouse) {
    return { error: `Warehouse not found: ${warehouseCode}` };
  }

  const { error } = await client.from("stock_ledger_entries").insert({
    variant_id: variant.id,
    warehouse_id: warehouse.id,
    movement_type: "adjustment",
    quantity_delta: quantityDelta,
    source_doc_type: reasonCode,
  });

  if (error) throw error;

  revalidatePath("/admin/inventory");
  return { success: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test src/features/inventory/admin-actions
```
Expected: PASS

- [ ] **Step 6: Create `components/admin/inventory-adjustment-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { useState } from "react";
import {
  adjustInventoryBySku,
  type InventoryAdjustState,
} from "@/src/features/inventory/admin-actions";

type InventoryAdjustmentFormProps = {
  sku: string;
  warehouseCode: string;
};

export function InventoryAdjustmentForm({ sku, warehouseCode }: InventoryAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState<InventoryAdjustState, FormData>(
    adjustInventoryBySku,
    null,
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Adjust
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        action(fd);
        if (!state || "success" in state) setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="warehouseCode" value={warehouseCode} />

      {state && "error" in state && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <label className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-medium text-slate-700">Δ Qty</span>
        <input
          name="quantityDelta"
          type="number"
          step="any"
          required
          placeholder="+10 or -5"
          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-medium text-slate-700">Reason</span>
        <select
          name="reasonCode"
          defaultValue="count"
          className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
        >
          <option value="count">Count</option>
          <option value="damage">Damage</option>
          <option value="return">Return</option>
          <option value="correction">Correction</option>
        </select>
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Add `actionsSlot` to `app/admin/inventory/page.tsx`**

Add import at top:
```tsx
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
```

Add `actionsSlot` to `AdminDataTable`:
```tsx
actionsSlot={(row) => (
  <InventoryAdjustmentForm sku={row.sku} warehouseCode={row.warehouseCode} />
)}
```

- [ ] **Step 8: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/features/inventory/queries.ts src/features/inventory/admin-actions.ts src/features/inventory/admin-actions.test.ts components/admin/inventory-adjustment-form.tsx app/admin/inventory/page.tsx
git commit -m "feat(admin): inventory stock adjustment form"
```

---

## Task 5: Purchase Order Create

**Files:**
- Create: `components/admin/purchase-order-create-form.tsx`
- Create: `app/admin/purchase-orders/new/page.tsx`
- Modify: `app/admin/purchase-orders/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/purchase-orders` with `PurchaseOrderInput` from `src/features/procurement/schema.ts`
- Page loads: suppliers `{ id, name }[]`, warehouses `{ id, code }[]`, variants `{ id, sku, productName }[]`

- [ ] **Step 1: Create `app/admin/purchase-orders/new/page.tsx`**

```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PurchaseOrderCreateForm } from "@/components/admin/purchase-order-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function AdminPurchaseOrderNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Purchase Order" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const [suppliersRes, warehousesRes, variantsRes] = await Promise.all([
    client.from("suppliers").select("id, name").order("name").limit(200),
    client.from("warehouses").select("id, code").eq("is_active", true).order("code").limit(50),
    client
      .from("product_variants")
      .select("id, sku, products(name)")
      .eq("is_active", true)
      .order("sku")
      .limit(500),
  ]);

  type VariantRecord = {
    id: string;
    sku: string;
    products: { name: string } | Array<{ name: string }> | null;
  };

  function firstRelation<T>(rel: T | T[] | null): T | null {
    return Array.isArray(rel) ? (rel[0] ?? null) : rel;
  }

  const suppliers = (suppliersRes.data ?? []) as Array<{ id: string; name: string }>;
  const warehouses = (warehousesRes.data ?? []) as Array<{ id: string; code: string }>;
  const variants = ((variantsRes.data ?? []) as VariantRecord[]).map((v) => ({
    id: v.id,
    sku: v.sku,
    productName: firstRelation(v.products)?.name ?? v.sku,
  }));

  return (
    <div>
      <AdminPageHeader
        title="New Purchase Order"
        description="Create a supplier purchase order with line items."
      />
      <PurchaseOrderCreateForm
        suppliers={suppliers}
        warehouses={warehouses}
        variants={variants}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `components/admin/purchase-order-create-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Supplier = { id: string; name: string };
type Warehouse = { id: string; code: string };
type Variant = { id: string; sku: string; productName: string };

type PurchaseOrderCreateFormProps = {
  suppliers: Supplier[];
  warehouses: Warehouse[];
  variants: Variant[];
};

type LineState = { variantId: string; orderedQty: string; unitCost: string };

export function PurchaseOrderCreateForm({
  suppliers,
  warehouses,
  variants,
}: PurchaseOrderCreateFormProps) {
  const router = useRouter();
  const [lines, setLines] = useState<LineState[]>([
    { variantId: "", orderedQty: "", unitCost: "" },
  ]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    setLines((prev) => [...prev, { variantId: "", orderedQty: "", unitCost: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineState, value: string) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const parsedLines = lines.map((line) => ({
      variantId: line.variantId,
      orderedQty: Number(line.orderedQty),
      unitCost: Number(line.unitCost),
    }));

    const payload = {
      supplierId: fd.get("supplierId"),
      destinationWarehouseId: fd.get("destinationWarehouseId"),
      expectedAt: fd.get("expectedAt") || undefined,
      lines: parsedLines,
    };

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to create purchase order.");
        return;
      }

      router.push("/admin/purchase-orders");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="block text-sm" htmlFor="supplierId">
        <span className="font-medium text-slate-700">Supplier</span>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">— Select supplier —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="destinationWarehouseId">
        <span className="font-medium text-slate-700">Destination warehouse</span>
        <select
          id="destinationWarehouseId"
          name="destinationWarehouseId"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">— Select warehouse —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="expectedAt">
        <span className="font-medium text-slate-700">Expected delivery (optional)</span>
        <input
          id="expectedAt"
          name="expectedAt"
          type="datetime-local"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Line items</p>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={line.variantId}
                onChange={(e) => updateLine(i, "variantId", e.target.value)}
                required
                className="min-h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              >
                <option value="">— SKU —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} — {v.productName}
                  </option>
                ))}
              </select>
              <input
                value={line.orderedQty}
                onChange={(e) => updateLine(i, "orderedQty", e.target.value)}
                type="number"
                min="0.001"
                step="any"
                required
                placeholder="Qty"
                className="min-h-9 w-24 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              />
              <input
                value={line.unitCost}
                onChange={(e) => updateLine(i, "unitCost", e.target.value)}
                type="number"
                min="0"
                step="any"
                required
                placeholder="Unit cost"
                className="min-h-9 w-28 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <Plus className="h-4 w-4" />
          Add line
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create purchase order"}
        </button>
        <a
          href="/admin/purchase-orders"
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Wire the button in `app/admin/purchase-orders/page.tsx`**

Replace the dead button with a Link:
```tsx
import Link from "next/link";
// ...
<Link
  href="/admin/purchase-orders/new"
  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
>
  <Plus className="h-4 w-4" aria-hidden="true" />
  New purchase order
</Link>
```

Also add a "View" actionsSlot that links to `/admin/purchase-orders/[id]`. First, update the list query to include `id` in the row. In `getPurchaseOrders()`:
- Add `id` to the select: `.select("id, po_no, status, ordered_total, received_total, suppliers(name), warehouses(code)")`
- Add `id: string` to `PurchaseOrderRow` type
- Add `id: purchaseOrder.id` to the row mapping
- Add `actionsSlot` to the DataTable:
```tsx
actionsSlot={(row) => (
  <a
    href={`/admin/purchase-orders/${row.id}`}
    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    View
  </a>
)}
```

- [ ] **Step 4: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/admin/purchase-orders/new/page.tsx components/admin/purchase-order-create-form.tsx app/admin/purchase-orders/page.tsx
git commit -m "feat(admin): purchase order create form and list row links"
```

---

## Task 6: Purchase Order Detail + Receive

**Files:**
- Create: `app/admin/purchase-orders/[id]/page.tsx`
- Create: `app/admin/purchase-orders/[id]/receive/page.tsx`
- Create: `components/admin/purchase-order-receive-form.tsx`

**Interfaces:**
- POSTs to `/api/admin/purchase-orders/[id]/receive` with `PurchaseOrderReceiptInput`

- [ ] **Step 1: Create `app/admin/purchase-orders/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type PoRecord = {
  id: string;
  po_no: string;
  status: string;
  ordered_total: number | string;
  received_total: number | string;
  expected_at: string | null;
  suppliers: { name: string } | Array<{ name: string }> | null;
  warehouses: { code: string } | Array<{ code: string }> | null;
};

type LineRecord = {
  id: string;
  variant_id: string;
  ordered_qty: number | string;
  received_qty: number | string;
  unit_cost: number | string;
  product_variants: { sku: string; unit: string } | Array<{ sku: string; unit: string }> | null;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminPurchaseOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Purchase Order" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const [poRes, linesRes] = await Promise.all([
    client
      .from("purchase_orders")
      .select("id, po_no, status, ordered_total, received_total, expected_at, suppliers(name), warehouses(code)")
      .eq("id", id)
      .single(),
    client
      .from("purchase_order_lines")
      .select("id, variant_id, ordered_qty, received_qty, unit_cost, product_variants(sku, unit)")
      .eq("purchase_order_id", id)
      .order("id"),
  ]);

  if (poRes.error || !poRes.data) notFound();

  const po = poRes.data as PoRecord;
  const supplier = firstRelation(po.suppliers);
  const warehouse = firstRelation(po.warehouses);
  const lines = ((linesRes.data ?? []) as LineRecord[]).map((l) => {
    const variant = firstRelation(l.product_variants);
    return {
      id: l.id,
      sku: variant?.sku ?? l.variant_id,
      unit: variant?.unit ?? "",
      orderedQty: String(l.ordered_qty),
      receivedQty: String(l.received_qty),
      unitCost: String(l.unit_cost),
    };
  });

  const canReceive = ["submitted", "partially_received"].includes(po.status);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={po.po_no}
        description={`${supplier?.name ?? "—"} → ${warehouse?.code ?? "—"}`}
        action={
          canReceive ? (
            <Link
              href={`/admin/purchase-orders/${id}/receive`}
              className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Record receipt
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <StatusChip value={po.status} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ordered</p>
          <p className="mt-1 font-semibold text-slate-800">{String(po.ordered_total)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Received</p>
          <p className="mt-1 font-semibold text-slate-800">{String(po.received_total)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expected</p>
          <p className="mt-1 text-slate-700">{po.expected_at ? po.expected_at.slice(0, 10) : "—"}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Line items</h2>
        <AdminDataTable
          columns={[
            { key: "sku", label: "SKU" },
            { key: "unit", label: "Unit" },
            { key: "orderedQty", label: "Ordered" },
            { key: "receivedQty", label: "Received" },
            { key: "unitCost", label: "Cost" },
          ]}
          rows={lines}
          emptyMessage="No lines."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/admin/purchase-order-receive-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReceiveLine = {
  lineId: string;
  sku: string;
  orderedQty: string;
  receivedQty: string;
  unit: string;
};

type ReceiveState = { [lineId: string]: { qty: string; lotNo: string; expiryAt: string } };

type PurchaseOrderReceiveFormProps = {
  purchaseOrderId: string;
  lines: ReceiveLine[];
};

export function PurchaseOrderReceiveForm({
  purchaseOrderId,
  lines,
}: PurchaseOrderReceiveFormProps) {
  const router = useRouter();
  const [state, setState] = useState<ReceiveState>(
    Object.fromEntries(
      lines.map((l) => [l.lineId, { qty: l.orderedQty, lotNo: "", expiryAt: "" }]),
    ),
  );
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      notes: notes || undefined,
      lines: lines
        .filter((l) => Number(state[l.lineId]?.qty) > 0)
        .map((l) => ({
          purchaseOrderLineId: l.lineId,
          receivedQty: Number(state[l.lineId]?.qty),
          lotNo: state[l.lineId]?.lotNo || undefined,
          expiryAt: state[l.lineId]?.expiryAt
            ? new Date(state[l.lineId]!.expiryAt).toISOString()
            : undefined,
        })),
    };

    if (payload.lines.length === 0) {
      setError("Enter a received quantity for at least one line.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Receipt failed.");
        return;
      }

      router.push(`/admin/purchase-orders/${purchaseOrderId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-left">Ordered</th>
              <th className="px-4 py-2 text-left">Received qty</th>
              <th className="px-4 py-2 text-left">Lot no.</th>
              <th className="px-4 py-2 text-left">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-2 font-medium text-slate-800">{line.sku}</td>
                <td className="px-4 py-2 text-slate-600">
                  {line.orderedQty} {line.unit}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={state[line.lineId]?.qty ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, qty: e.target.value },
                      }))
                    }
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="optional"
                    value={state[line.lineId]?.lotNo ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, lotNo: e.target.value },
                      }))
                    }
                    className="w-28 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={state[line.lineId]?.expiryAt ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, expiryAt: e.target.value },
                      }))
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="block text-sm" htmlFor="notes">
        <span className="font-medium text-slate-700">Notes (optional)</span>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Record receipt"}
        </button>
        <a
          href={`/admin/purchase-orders/${purchaseOrderId}`}
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/admin/purchase-orders/[id]/receive/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PurchaseOrderReceiveForm } from "@/components/admin/purchase-order-receive-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type LineRecord = {
  id: string;
  ordered_qty: number | string;
  received_qty: number | string;
  product_variants: { sku: string; unit: string } | Array<{ sku: string; unit: string }> | null;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminPurchaseOrderReceivePage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Record Receipt" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const [poRes, linesRes] = await Promise.all([
    client.from("purchase_orders").select("po_no, status").eq("id", id).single(),
    client
      .from("purchase_order_lines")
      .select("id, ordered_qty, received_qty, product_variants(sku, unit)")
      .eq("purchase_order_id", id)
      .order("id"),
  ]);

  if (poRes.error || !poRes.data) notFound();

  const po = poRes.data as { po_no: string; status: string };
  if (!["submitted", "partially_received"].includes(po.status)) {
    return (
      <div>
        <AdminPageHeader title="Record Receipt" description={po.po_no} />
        <p className="text-sm text-slate-600">
          This PO cannot receive goods in its current status ({po.status}).
        </p>
      </div>
    );
  }

  const lines = ((linesRes.data ?? []) as LineRecord[]).map((l) => {
    const variant = firstRelation(l.product_variants);
    return {
      lineId: l.id,
      sku: variant?.sku ?? l.id,
      unit: variant?.unit ?? "",
      orderedQty: String(l.ordered_qty),
      receivedQty: String(l.received_qty),
    };
  });

  return (
    <div>
      <AdminPageHeader
        title="Record Receipt"
        description={`Recording goods received for ${po.po_no}`}
      />
      <PurchaseOrderReceiveForm purchaseOrderId={id} lines={lines} />
    </div>
  );
}
```

- [ ] **Step 4: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/admin/purchase-orders/[id]/page.tsx app/admin/purchase-orders/[id]/receive/page.tsx components/admin/purchase-order-receive-form.tsx
git commit -m "feat(admin): purchase order detail and receive page"
```

---

## Task 7: Refund Create

**Files:**
- Create: `components/admin/refund-create-form.tsx`
- Create: `app/admin/refunds/new/page.tsx`
- Modify: `app/admin/refunds/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/refunds` with `RefundInput` from `src/features/refunds/schema.ts`

- [ ] **Step 1: Create `components/admin/refund-create-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefundCreateForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload = {
      orderId: fd.get("orderId"),
      paymentId: fd.get("paymentId") || undefined,
      amount: Number(fd.get("amount")),
      refundMethod: fd.get("refundMethod"),
      reason: fd.get("reason"),
    };

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to create refund.");
        return;
      }

      router.push("/admin/refunds");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="block text-sm" htmlFor="orderId">
        <span className="font-medium text-slate-700">Order ID (UUID)</span>
        <input
          id="orderId"
          name="orderId"
          required
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="paymentId">
        <span className="font-medium text-slate-700">Payment ID (optional)</span>
        <input
          id="paymentId"
          name="paymentId"
          placeholder="Leave blank if unknown"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="amount">
        <span className="font-medium text-slate-700">Amount (VND)</span>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="refundMethod">
        <span className="font-medium text-slate-700">Refund method</span>
        <select
          id="refundMethod"
          name="refundMethod"
          defaultValue="bank_transfer"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="gateway">Gateway</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="voucher">Voucher</option>
          <option value="loyalty_points">Loyalty points</option>
          <option value="manual_finance">Manual finance</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="reason">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={3}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create refund"}
        </button>
        <a
          href="/admin/refunds"
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/refunds/new/page.tsx`**

```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RefundCreateForm } from "@/components/admin/refund-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function AdminRefundNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "refunds:create");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Refund" />
          <p className="text-sm text-slate-600">You do not have access to create refunds.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New Refund" description="Issue a refund against an order." />
      <RefundCreateForm />
    </div>
  );
}
```

- [ ] **Step 3: Wire the button in `app/admin/refunds/page.tsx`**

Replace the dead button with a Link (same pattern as Task 1 Step 7):
```tsx
import Link from "next/link";
// ...
<Link
  href="/admin/refunds/new"
  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
>
  <Plus className="h-4 w-4" aria-hidden="true" />
  New refund
</Link>
```

- [ ] **Step 4: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/admin/refund-create-form.tsx app/admin/refunds/new/page.tsx app/admin/refunds/page.tsx
git commit -m "feat(admin): refund create page"
```

---

## Task 8: Complaint Create + Update

**Files:**
- Create: `src/features/complaints/admin-actions.ts`
- Create: `components/admin/complaint-create-form.tsx`
- Create: `components/admin/complaint-update-form.tsx`
- Create: `app/admin/complaints/new/page.tsx`
- Create: `app/admin/complaints/[id]/page.tsx`
- Modify: `app/admin/complaints/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/complaints` with `ComplaintCaseInput`
- Produces: `updateComplaintCase(_prev, formData): Promise<ComplaintUpdateState>` server action

- [ ] **Step 1: Write the failing test**

Create `src/features/complaints/admin-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdate = vi.fn();
const mockEq = vi.fn();
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

import { updateComplaintCase } from "./admin-actions";

describe("updateComplaintCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      update: mockUpdate,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ admin_roles: { name: "super_admin" } }],
          error: null,
        }),
      }),
    });
  });

  it("returns error when id is missing", async () => {
    const fd = new FormData();
    fd.set("status", "resolved");
    fd.set("resolution", "Fixed.");
    const result = await updateComplaintCase(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("updates status and resolution", async () => {
    const fd = new FormData();
    fd.set("id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    fd.set("status", "resolved");
    fd.set("resolution", "Issue fixed.");
    await updateComplaintCase(null, fd);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resolved", resolution: "Issue fixed." }),
    );
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
pnpm test src/features/complaints/admin-actions
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/complaints/admin-actions.ts`**

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const updateComplaintSchema = z.object({
  id: z.string().uuid("Invalid complaint ID"),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
  resolution: z.string(),
});

export type ComplaintUpdateState = { error: string } | null;

export async function updateComplaintCase(
  _prev: ComplaintUpdateState,
  formData: FormData,
): Promise<ComplaintUpdateState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "complaints:update");

  const result = updateComplaintSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolution: formData.get("resolution") ?? "",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await client
    .from("complaint_cases")
    .update({
      status: result.data.status,
      resolution: result.data.resolution || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/complaints");
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/complaints/admin-actions
```
Expected: PASS

- [ ] **Step 5: Create `components/admin/complaint-create-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ComplaintCreateForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload = {
      orderId: fd.get("orderId") || undefined,
      customerId: fd.get("customerId") || undefined,
      reason: fd.get("reason"),
      resolution: fd.get("resolution") || undefined,
    };

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to create complaint.");
        return;
      }

      router.push("/admin/complaints");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="block text-sm" htmlFor="orderId">
        <span className="font-medium text-slate-700">Order ID (optional)</span>
        <input
          id="orderId"
          name="orderId"
          placeholder="UUID of related order"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="customerId">
        <span className="font-medium text-slate-700">Customer ID (optional)</span>
        <input
          id="customerId"
          name="customerId"
          placeholder="UUID of related customer"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="reason">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={3}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create complaint"}
        </button>
        <a
          href="/admin/complaints"
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create `components/admin/complaint-update-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import {
  updateComplaintCase,
  type ComplaintUpdateState,
} from "@/src/features/complaints/admin-actions";

type ComplaintUpdateFormProps = {
  id: string;
  status: string;
  resolution: string;
};

export function ComplaintUpdateForm({ id, status, resolution }: ComplaintUpdateFormProps) {
  const [state, action, isPending] = useActionState<ComplaintUpdateState, FormData>(
    updateComplaintCase,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="resolution">
        <span className="font-medium text-slate-700">Resolution</span>
        <textarea
          id="resolution"
          name="resolution"
          defaultValue={resolution}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Create `app/admin/complaints/new/page.tsx`**

```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ComplaintCreateForm } from "@/components/admin/complaint-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function AdminComplaintNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "complaints:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Complaint" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New Complaint" description="Log a new customer complaint case." />
      <ComplaintCreateForm />
    </div>
  );
}
```

- [ ] **Step 8: Create `app/admin/complaints/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ComplaintUpdateForm } from "@/components/admin/complaint-update-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type ComplaintRecord = {
  id: string;
  status: string;
  reason: string;
  resolution: string | null;
  orders: { order_no: string } | Array<{ order_no: string }> | null;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminComplaintDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "complaints:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Complaint" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error: fetchError } = await client
    .from("complaint_cases")
    .select("id, status, reason, resolution, orders(order_no), customers(full_name)")
    .eq("id", id)
    .single();

  if (fetchError || !data) notFound();

  const complaint = data as ComplaintRecord;
  const order = firstRelation(complaint.orders);
  const customer = firstRelation(complaint.customers);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Complaint"
        description={order ? `Order ${order.order_no}` : customer?.full_name ?? "No order linked"}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Reason</p>
        <p className="mt-1">{complaint.reason}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-4 text-sm font-semibold text-slate-800">Update complaint</p>
        <ComplaintUpdateForm
          id={complaint.id}
          status={complaint.status}
          resolution={complaint.resolution ?? ""}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Update `app/admin/complaints/page.tsx`**

Three changes:
1. Add `id` to the complaint query select and row mapping:
   - Change `.select("status, reason, resolution, orders(order_no), customers(full_name)")` → `.select("id, status, reason, resolution, orders(order_no), customers(full_name)")`
   - Add `id: string` to `ComplaintRow` type
   - Add `id: complaint.id` to the mapping
2. Wire "New complaint" button to `/admin/complaints/new` (same Link pattern)
3. Add `actionsSlot` to the DataTable:
```tsx
actionsSlot={(row) => (
  <a
    href={`/admin/complaints/${row.id}`}
    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    View
  </a>
)}
```

- [ ] **Step 10: Run lint and tests**

```bash
pnpm lint && pnpm test
```
Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add src/features/complaints/admin-actions.ts src/features/complaints/admin-actions.test.ts components/admin/complaint-create-form.tsx components/admin/complaint-update-form.tsx app/admin/complaints/new/page.tsx app/admin/complaints/[id]/page.tsx app/admin/complaints/page.tsx
git commit -m "feat(admin): complaint create and update pages"
```

---

## Self-Review

**Spec coverage check:**

| Gap | Covered by Task |
|---|---|
| Products: Create | Task 1 ✅ |
| Orders: Detail page | Task 2 ✅ |
| Orders: Transition UI | Task 3 ✅ |
| Inventory: Adjustment UI | Task 4 ✅ |
| Purchase Orders: Create | Task 5 ✅ |
| Purchase Orders: Detail + Receive | Task 6 ✅ |
| Refunds: Create | Task 7 ✅ |
| Complaints: Create + Update | Task 8 ✅ |
| CMS Content CRUD | **excluded by design** — separate plan |

**Not covered (require separate plans or business decision):**
- Order Create (not applicable — orders come from checkout only)
- Inventory permanent delete (not applicable — immutable ledger)
- Refund update/resolve (status transitions not in scope for v1)
- Purchase Order cancel/close (status transitions not in scope for v1)
- CMS Content CRUD (excluded — 6 entity types, complex inline editing)

**Placeholder scan:** None found. All steps include actual code.

**Type consistency check:**
- `AdminOrderRow.id` introduced in Task 2, used in Task 2 actionsSlot ✅
- `AdminInventoryRow.warehouseCode` introduced in Task 4 queries modification, consumed by `InventoryAdjustmentForm` ✅
- `PurchaseOrderRow.id` introduced and consumed within Task 5 ✅
- `ComplaintRow.id` introduced and consumed within Task 8 ✅
- `getAdminOrderDetail` return type `AdminOrderDetail` defined and consumed by Task 2's order detail page ✅
