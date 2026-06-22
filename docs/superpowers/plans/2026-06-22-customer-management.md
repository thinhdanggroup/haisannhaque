# Customer Management & Loyalty Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give operators a read-only customer browser with profile, address, order history, and loyalty balance, plus full CRUD for loyalty tier configuration.

**Architecture:** Customer data is read-only from admin (customers self-register via storefront). The customer list and detail pages query `customers`, `addresses`, `orders`, and aggregate `loyalty_ledger` directly. Loyalty tiers use the standard server-actions + form pattern. A new `loyalty:update` permission is added to `permissions.ts` scoped to `super_admin` only.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + JS client), TypeScript, Zod, React `useActionState`, Tailwind CSS, Vitest

## Global Constraints
- Use `createServerClient()` from `@/src/lib/supabase/server` for all DB access
- Use `requireAdminPermission(client, "permission:scope")` for every admin action
- Form components must use `useActionState` hook pattern
- All Zod validation errors surface as `{ error: string }` return from server actions
- Tests use vitest, mock the Supabase client as a plain JS object (no real DB)
- Run tests with `pnpm vitest run <path>`
- CSS: use existing INPUT_CLASS pattern, `bg-teal-700 text-white` for primary buttons
- `export const dynamic = "force-dynamic"` on all admin page components

---

### Task 1: Customer query functions + tests

**Files:**
- Create: `src/features/admin/customers.ts`
- Create: `src/features/admin/customers.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `getAdminCustomerRows(client): Promise<CustomerRow[]>`
  - `getAdminCustomerDetail(client, customerId: string): Promise<CustomerDetail | null>`

- [ ] **Step 1: Write the tests**

```ts
// src/features/admin/customers.test.ts
import { describe, it, expect } from "vitest";
import { getAdminCustomerRows, getAdminCustomerDetail } from "./customers";

const mockRows = [
  { id: "cust-1", full_name: "Nguyen Van A", email: "a@test.com", phone: "0901000001", loyalty_tier: "standard", created_at: "2024-01-01T00:00:00Z" },
  { id: "cust-2", full_name: "Tran Thi B", email: "b@test.com", phone: "0901000002", loyalty_tier: "gold", created_at: "2024-02-01T00:00:00Z" },
];

function makeListClient() {
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: mockRows, error: null }),
        }),
      }),
    }),
  };
}

function makeDetailClient() {
  return {
    from: (table: string) => {
      if (table === "customers") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "cust-1", full_name: "Nguyen Van A", email: "a@test.com", phone: "0901000001", loyalty_tier: "standard", created_at: "2024-01-01T00:00:00Z" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "addresses") {
        return {
          select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        };
      }
      if (table === "orders") {
        return {
          select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
        };
      }
      if (table === "loyalty_ledger") {
        return {
          select: () => ({ eq: async () => ({ data: [{ delta: 100 }, { delta: -20 }], error: null }) }),
        };
      }
      return {};
    },
  };
}

describe("getAdminCustomerRows", () => {
  it("returns customer rows in order", async () => {
    const rows = await getAdminCustomerRows(makeListClient() as never);
    expect(rows).toHaveLength(2);
    expect(rows[0].full_name).toBe("Nguyen Van A");
    expect(rows[1].loyalty_tier).toBe("gold");
  });
});

describe("getAdminCustomerDetail", () => {
  it("returns customer with loyalty balance summed", async () => {
    const detail = await getAdminCustomerDetail(makeDetailClient() as never, "cust-1");
    expect(detail).not.toBeNull();
    expect(detail!.loyaltyBalance).toBe(80); // 100 + (-20)
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm vitest run src/features/admin/customers.test.ts
```
Expected: FAIL — "Cannot find module './customers'"

- [ ] **Step 3: Create customers.ts**

```ts
// src/features/admin/customers.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_tier: string;
  created_at: string;
};

export type CustomerAddress = {
  id: string;
  label: string | null;
  receiver_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  address_line: string;
  is_default: boolean;
};

export type CustomerOrderRow = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

export type CustomerDetail = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_tier: string;
  created_at: string;
  addresses: CustomerAddress[];
  recentOrders: CustomerOrderRow[];
  loyaltyBalance: number;
};

export async function getAdminCustomerRows(
  client: Pick<SupabaseClient, "from">,
): Promise<CustomerRow[]> {
  const { data, error } = await client
    .from("customers")
    .select("id, full_name, email, phone, loyalty_tier, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

export async function getAdminCustomerDetail(
  client: Pick<SupabaseClient, "from">,
  customerId: string,
): Promise<CustomerDetail | null> {
  const [{ data: customer, error: custErr }, { data: addresses, error: addrErr }, { data: orders, error: ordErr }, { data: ledger, error: ledgErr }] =
    await Promise.all([
      client
        .from("customers")
        .select("id, full_name, email, phone, loyalty_tier, created_at")
        .eq("id", customerId)
        .single(),
      client
        .from("addresses")
        .select("id, label, receiver_name, phone, province, district, ward, address_line, is_default")
        .eq("customer_id", customerId)
        .order("is_default", { ascending: false }),
      client
        .from("orders")
        .select("id, order_no, status, payment_status, total, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10),
      client.from("loyalty_ledger").select("delta").eq("customer_id", customerId),
    ]);

  if (custErr || !customer) return null;
  if (addrErr) throw addrErr;
  if (ordErr) throw ordErr;
  if (ledgErr) throw ledgErr;

  const loyaltyBalance = (ledger ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0);

  return {
    ...customer,
    addresses: addresses ?? [],
    recentOrders: orders ?? [],
    loyaltyBalance,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/admin/customers.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/customers.ts src/features/admin/customers.test.ts
git commit -m "feat(admin): add customer query functions"
```

---

### Task 2: Customer list page

**Files:**
- Create: `app/admin/customers/page.tsx`

**Interfaces:**
- Consumes: `getAdminCustomerRows` from `@/src/features/admin/customers`
- Produces: `/admin/customers` route

- [ ] **Step 1: Create the list page**

```tsx
// app/admin/customers/page.tsx
import Link from "next/link";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAdminCustomerRows, type CustomerRow } from "@/src/features/admin/customers";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";

export const dynamic = "force-dynamic";

type PageData = { access: "allowed"; customers: CustomerRow[] } | { access: "denied" };

function getTierTone(tier: string): "success" | "warning" | "neutral" {
  if (tier === "gold" || tier === "platinum") return "success";
  if (tier === "silver") return "warning";
  return "neutral";
}

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", customers: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "customers:read");
    const customers = await getAdminCustomerRows(client);
    return { access: "allowed", customers };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminCustomersPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Customers" />
        <p className="text-sm text-slate-600">You do not have access to customer records.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="Browse registered customer accounts."
      />
      <AdminDataTable
        columns={[
          {
            key: "full_name",
            label: "Name",
            render: (row) => (
              <Link href={`/admin/customers/${row.id}`} className="font-medium text-teal-700 hover:underline">
                {row.full_name ?? "—"}
              </Link>
            ),
          },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          {
            key: "loyalty_tier",
            label: "Tier",
            render: (row) => (
              <StatusChip value={row.loyalty_tier} tone={getTierTone(row.loyalty_tier)} />
            ),
          },
          {
            key: "created_at",
            label: "Joined",
            render: (row) => <span className="text-sm text-slate-500">{new Date(row.created_at).toLocaleDateString("vi-VN")}</span>,
          },
        ]}
        rows={pageData.customers}
        emptyMessage="No customers yet."
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/customers/page.tsx
git commit -m "feat(admin): add customer list page"
```

---

### Task 3: Customer detail page

**Files:**
- Create: `app/admin/customers/[id]/page.tsx`

**Interfaces:**
- Consumes: `getAdminCustomerDetail` from `@/src/features/admin/customers`

- [ ] **Step 1: Create the detail page**

```tsx
// app/admin/customers/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAdminCustomerDetail } from "@/src/features/admin/customers";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return <div><AdminPageHeader title="Customer detail" /></div>;
  }

  let detail;
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "customers:read");
    detail = await getAdminCustomerDetail(client, id);
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Customer" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw e;
  }

  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={detail.full_name ?? "Unknown customer"}
        description={detail.email ?? undefined}
        action={
          <Link href="/admin/customers" className="flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            ← Back to customers
          </Link>
        }
      />

      {/* Profile */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
          <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{detail.phone ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Loyalty tier</dt><dd><StatusChip value={detail.loyalty_tier} tone="neutral" /></dd></div>
          <div><dt className="text-slate-500">Points balance</dt><dd className="font-medium">{detail.loyaltyBalance.toLocaleString()}</dd></div>
          <div><dt className="text-slate-500">Joined</dt><dd className="font-medium">{new Date(detail.created_at).toLocaleDateString("vi-VN")}</dd></div>
        </dl>
      </section>

      {/* Addresses */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Addresses</h2>
        {detail.addresses.length === 0 ? (
          <p className="text-sm text-slate-500">No saved addresses.</p>
        ) : (
          <div className="space-y-2">
            {detail.addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{addr.receiver_name}</span>
                  <span className="text-slate-500">{addr.phone}</span>
                  {addr.is_default && <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Default</span>}
                </div>
                <p className="mt-1 text-slate-600">{addr.address_line}, {addr.ward}, {addr.district}, {addr.province}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent orders</h2>
        {detail.recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-medium text-slate-600">Order</th>
                <th className="py-2 text-left font-medium text-slate-600">Status</th>
                <th className="py-2 text-left font-medium text-slate-600">Payment</th>
                <th className="py-2 text-right font-medium text-slate-600">Total</th>
                <th className="py-2 text-right font-medium text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-teal-700 hover:underline">
                      {order.order_no}
                    </Link>
                  </td>
                  <td className="py-2"><StatusChip value={order.status} tone="neutral" /></td>
                  <td className="py-2"><StatusChip value={order.payment_status} tone="neutral" /></td>
                  <td className="py-2 text-right">{Number(order.total).toLocaleString("vi-VN")}đ</td>
                  <td className="py-2 text-right text-slate-500">{new Date(order.created_at).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/customers/[id]/page.tsx
git commit -m "feat(admin): add customer detail page with addresses and order history"
```

---

### Task 4: Add loyalty:update permission + loyalty tier server actions

**Files:**
- Modify: `src/features/admin/permissions.ts`
- Create: `src/features/loyalty/tier-actions.ts`
- Create: `src/features/loyalty/tier-actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `LoyaltyTierState`, `createLoyaltyTier`, `updateLoyaltyTier`, `deleteLoyaltyTier`

- [ ] **Step 1: Add loyalty:update to permissions.ts**

In `src/features/admin/permissions.ts`, update the `super_admin` entry:

```ts
const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],
  catalog_manager: ["products:read", "products:create", "products:update", "products:delete", "categories:update"],
  marketing: ["cms:update", "promotions:update"],
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
  loyalty_admin: ["loyalty:update", "customers:read"],
};
```

Note: `super_admin` already has `"*"` so it automatically covers `loyalty:update`. Adding `loyalty_admin` as a dedicated role allows scoped assignment.

- [ ] **Step 2: Write tier action tests**

```ts
// src/features/loyalty/tier-actions.test.ts
import { describe, it, expect } from "vitest";
import { createLoyaltyTier, updateLoyaltyTier } from "./tier-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("loyalty tier actions (validation)", () => {
  it("returns error when name is empty", async () => {
    const fd = makeFormData({ name: "", minPoints: "0", earnRate: "0.01" });
    const result = await createLoyaltyTier(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when earnRate is negative", async () => {
    const fd = makeFormData({ name: "Gold", minPoints: "1000", earnRate: "-0.01" });
    const result = await createLoyaltyTier(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("returns error when minPoints is negative", async () => {
    const fd = makeFormData({ name: "Gold", minPoints: "-1", earnRate: "0.01" });
    const result = await createLoyaltyTier(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
pnpm vitest run src/features/loyalty/tier-actions.test.ts
```
Expected: FAIL

- [ ] **Step 4: Create tier-actions.ts**

```ts
// src/features/loyalty/tier-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type LoyaltyTierState = { error: string } | null;

const tierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  minPoints: z.coerce.number().int().min(0, "Minimum points cannot be negative"),
  earnRate: z.coerce.number().min(0, "Earn rate cannot be negative").max(1, "Earn rate cannot exceed 1"),
  description: z.string(),
});

const tierUpdateSchema = tierSchema.extend({ id: z.string().uuid() });

export async function createLoyaltyTier(
  _prev: LoyaltyTierState,
  formData: FormData,
): Promise<LoyaltyTierState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "loyalty:update");

  const result = tierSchema.safeParse({
    name: formData.get("name"),
    minPoints: formData.get("minPoints") ?? 0,
    earnRate: formData.get("earnRate") ?? 0.01,
    description: formData.get("description") ?? "",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("loyalty_tiers").insert({
    name: result.data.name,
    min_points: result.data.minPoints,
    earn_rate: result.data.earnRate,
    description: result.data.description || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "A tier with this name already exists." };
    throw error;
  }

  revalidatePath("/admin/loyalty-tiers");
  redirect("/admin/loyalty-tiers");
}

export async function updateLoyaltyTier(
  _prev: LoyaltyTierState,
  formData: FormData,
): Promise<LoyaltyTierState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "loyalty:update");

  const result = tierUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    minPoints: formData.get("minPoints") ?? 0,
    earnRate: formData.get("earnRate") ?? 0.01,
    description: formData.get("description") ?? "",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("loyalty_tiers")
    .update({
      name: result.data.name,
      min_points: result.data.minPoints,
      earn_rate: result.data.earnRate,
      description: result.data.description || null,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/loyalty-tiers");
  redirect("/admin/loyalty-tiers");
}

export async function deleteLoyaltyTier(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid tier id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "loyalty:update");

  const { error } = await client.from("loyalty_tiers").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/loyalty-tiers");
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm vitest run src/features/loyalty/tier-actions.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/permissions.ts src/features/loyalty/tier-actions.ts src/features/loyalty/tier-actions.test.ts
git commit -m "feat(admin): add loyalty_admin role and loyalty tier server actions"
```

---

### Task 5: Loyalty tier list page + form + pages

**Files:**
- Create: `app/admin/loyalty-tiers/page.tsx`
- Create: `components/admin/loyalty-tier-form.tsx`
- Create: `components/admin/loyalty-tier-row-actions.tsx`
- Create: `app/admin/loyalty-tiers/new/page.tsx`
- Create: `app/admin/loyalty-tiers/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createLoyaltyTier`, `updateLoyaltyTier`, `deleteLoyaltyTier`, `LoyaltyTierState`

- [ ] **Step 1: Create list page**

```tsx
// app/admin/loyalty-tiers/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LoyaltyTierRowActions } from "@/components/admin/loyalty-tier-row-actions";

export const dynamic = "force-dynamic";

type TierRow = { id: string; name: string; min_points: number; earn_rate: number; description: string | null };
type PageData = { access: "allowed"; tiers: TierRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", tiers: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "loyalty:update");
    const { data, error } = await client
      .from("loyalty_tiers")
      .select("id, name, min_points, earn_rate, description")
      .order("min_points");
    if (error) throw error;
    return { access: "allowed", tiers: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminLoyaltyTiersPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Loyalty Tiers" />
        <p className="text-sm text-slate-600">You do not have access to loyalty tiers.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Loyalty Tiers"
        description="Configure earn rates and point thresholds for each tier."
        action={
          <Link
            href="/admin/loyalty-tiers/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New tier
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "min_points", label: "Min points" },
          {
            key: "earn_rate",
            label: "Earn rate",
            render: (row) => <span>{(Number(row.earn_rate) * 100).toFixed(2)}%</span>,
          },
          { key: "description", label: "Description" },
        ]}
        rows={pageData.tiers}
        emptyMessage="No loyalty tiers configured yet."
        actionsSlot={(row) => <LoyaltyTierRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create loyalty tier form**

```tsx
// components/admin/loyalty-tier-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { LoyaltyTierState } from "@/src/features/loyalty/tier-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type LoyaltyTierFormProps = {
  action: (prev: LoyaltyTierState, formData: FormData) => Promise<LoyaltyTierState>;
  initialValues?: { id: string; name: string; minPoints: number; earnRate: number; description: string };
};

export function LoyaltyTierForm({ action, initialValues }: LoyaltyTierFormProps) {
  const [state, formAction, isPending] = useActionState<LoyaltyTierState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tier name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="minPoints">
        <span className="font-medium text-slate-700">Minimum points to reach this tier</span>
        <input id="minPoints" name="minPoints" type="number" min={0} required defaultValue={initialValues?.minPoints ?? 0} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="earnRate">
        <span className="font-medium text-slate-700">Earn rate</span>
        <span className="ml-1 text-xs text-slate-400">(fraction of order value awarded as points, e.g. 0.01 = 1%)</span>
        <input id="earnRate" name="earnRate" type="number" step="0.0001" min={0} max={1} required defaultValue={initialValues?.earnRate ?? 0.01} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="description">
        <span className="font-medium text-slate-700">Description</span>
        <textarea id="description" name="description" rows={2} defaultValue={initialValues?.description} className={`${INPUT_CLASS} py-2`} />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create tier"}
        </button>
        <Link
          href="/admin/loyalty-tiers"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create row actions**

```tsx
// components/admin/loyalty-tier-row-actions.tsx
"use client";

import Link from "next/link";
import { deleteLoyaltyTier } from "@/src/features/loyalty/tier-actions";

export function LoyaltyTierRowActions({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete tier "${name}"? Existing customers at this tier keep their tier label.`)) return;
    await deleteLoyaltyTier(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/loyalty-tiers/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create new page**

```tsx
// app/admin/loyalty-tiers/new/page.tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LoyaltyTierForm } from "@/components/admin/loyalty-tier-form";
import { createLoyaltyTier } from "@/src/features/loyalty/tier-actions";

export const dynamic = "force-dynamic";

export default function NewLoyaltyTierPage() {
  return (
    <div>
      <AdminPageHeader title="New loyalty tier" />
      <LoyaltyTierForm action={createLoyaltyTier} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit page**

```tsx
// app/admin/loyalty-tiers/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LoyaltyTierForm } from "@/components/admin/loyalty-tier-form";
import { updateLoyaltyTier } from "@/src/features/loyalty/tier-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditLoyaltyTierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const { data, error } = await client
    .from("loyalty_tiers")
    .select("id, name, min_points, earn_rate, description")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.name}`} />
      <LoyaltyTierForm
        action={updateLoyaltyTier}
        initialValues={{
          id: data.id,
          name: data.name,
          minPoints: data.min_points,
          earnRate: Number(data.earn_rate),
          description: data.description ?? "",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/loyalty-tiers/ components/admin/loyalty-tier-form.tsx components/admin/loyalty-tier-row-actions.tsx
git commit -m "feat(admin): add loyalty tier list, create, and edit pages"
```

---

### Task 6: Update admin navigation

**Files:**
- Modify: `components/admin/admin-nav.tsx`

- [ ] **Step 1: Add Customers and Loyalty Tiers to nav**

Replace the `adminLinks` array in `components/admin/admin-nav.tsx`:

```tsx
const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/warehouses", label: "Warehouses" },
  { href: "/admin/purchase-orders", label: "Purchase Orders" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/loyalty-tiers", label: "Loyalty Tiers" },
  { href: "/admin/reports", label: "Reports" },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/admin-nav.tsx
git commit -m "feat(admin): add customers and loyalty tiers to admin nav"
```
