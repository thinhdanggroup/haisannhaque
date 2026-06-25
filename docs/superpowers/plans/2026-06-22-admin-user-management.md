# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-side user management section: a paginated customer list, a customer detail view (orders, loyalty, addresses), and a role assignment UI for managing which users have admin access.

**Architecture:** New `/admin/users` route group mirrors the existing admin pages (products, orders, etc.). Query functions live in `src/features/admin/customers/`. Role management queries+actions live in `src/features/admin/roles/`. All admin pages call `requireAdminPermission(client, "customers:read")` from the existing `src/features/admin/auth.ts`. The admin nav gets a "Users" entry.

**Tech Stack:** Next.js 15 App Router, Supabase SSR client, `requireAdminPermission` from `@/src/features/admin/auth`, `AdminDataTable` + `AdminPageHeader` existing admin UI components, Vitest for unit tests.

## Global Constraints

- All query functions accept a duck-typed client and are unit-testable without a real DB.
- Use `requireAdminPermission(client, "customers:read")` before any data fetch; throw `AdminAuthorizationError` on failure (matches existing admin pattern — see `src/features/admin/auth.ts`).
- Money values must use `formatVnd` from `@/src/lib/format`.
- The `AdminDataTable` component at `components/admin/admin-data-table.tsx` accepts `columns: { key, label }[]` and `rows: Record<string, ReactNode>[]` — follow the exact same interface seen in existing admin pages.
- Existing admin roles: `super_admin`, `catalog_manager`, `marketing`, `customer_service`, `warehouse`, `procurement`, `finance`, `reporter`. Only `super_admin` can assign roles (has `*` permission).
- Run `npm test` after each task.

---

### Task 1: Customer list query

**Files:**
- Create: `src/features/admin/customers/queries.ts`
- Create: `src/features/admin/customers/queries.test.ts`

**Interfaces:**
- Produces:
  - `getAdminCustomerRows(client): Promise<AdminCustomerRow[]>`
  - Type: `AdminCustomerRow { id, email, fullName, phone, loyaltyTier, loyaltyPoints, createdAt }`

- [ ] **Step 1: Read the AdminDataTable to confirm its column/row contract**

```bash
head -30 components/admin/admin-data-table.tsx
```

Confirm it accepts `columns: { key: string; label: string }[]` and `rows: Record<string, React.ReactNode>[]`.

- [ ] **Step 2: Write the failing tests**

```typescript
// src/features/admin/customers/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import { getAdminCustomerRows } from "./queries";

describe("getAdminCustomerRows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps customer rows to AdminCustomerRow shape", async () => {
    const chain = {
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "cust-1",
          email: "a@example.com",
          full_name: "Nguyễn Văn A",
          phone: "0901234567",
          loyalty_tier: "silver",
          loyalty_points: 500,
          created_at: "2026-06-01T00:00:00Z",
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    const result = await getAdminCustomerRows({ from: mockFrom } as never);

    expect(result).toEqual([{
      id: "cust-1",
      email: "a@example.com",
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
      loyaltyTier: "silver",
      loyaltyPoints: 500,
      createdAt: "2026-06-01",
    }]);
  });

  it("handles null full_name gracefully", async () => {
    const chain = {
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "cust-2",
          email: null,
          full_name: null,
          phone: null,
          loyalty_tier: "standard",
          loyalty_points: 0,
          created_at: "2026-05-01T00:00:00Z",
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    const [row] = await getAdminCustomerRows({ from: mockFrom } as never);

    expect(row.fullName).toBe("—");
    expect(row.email).toBe("—");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- src/features/admin/customers/queries.test.ts
```

Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 4: Write the implementation**

```typescript
// src/features/admin/customers/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryClient = Pick<SupabaseClient, "from">;

export type AdminCustomerRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  loyaltyTier: string;
  loyaltyPoints: number;
  createdAt: string;
};

export type AdminCustomerDetail = AdminCustomerRow & {
  orders: Array<{
    id: string;
    orderNo: string;
    status: string;
    grandTotal: string;
    placedAt: string;
  }>;
  addresses: Array<{
    id: string;
    label: string | null;
    receiverName: string;
    addressLine: string;
    province: string;
    isDefault: boolean;
  }>;
  loyaltyLedger: Array<{
    id: string;
    pointsDelta: number;
    reason: string;
    createdAt: string;
  }>;
};

function fallback(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

export async function getAdminCustomerRows(
  client: QueryClient,
): Promise<AdminCustomerRow[]> {
  const { data, error } = await client
    .from("customers")
    .select("id, email, full_name, phone, loyalty_tier, loyalty_points, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    loyalty_tier: string;
    loyalty_points: number;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    email: fallback(row.email),
    fullName: fallback(row.full_name),
    phone: fallback(row.phone),
    loyaltyTier: row.loyalty_tier,
    loyaltyPoints: row.loyalty_points,
    createdAt: row.created_at.slice(0, 10),
  }));
}

export async function getAdminCustomerDetail(
  client: QueryClient,
  customerId: string,
): Promise<AdminCustomerDetail | null> {
  const { data: cust, error: custErr } = await (client as SupabaseClient)
    .from("customers")
    .select("id, email, full_name, phone, loyalty_tier, loyalty_points, created_at")
    .eq("id", customerId)
    .single();

  if (custErr || !cust) return null;

  const row = cust as {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    loyalty_tier: string;
    loyalty_points: number;
    created_at: string;
  };

  const [ordersRes, addressesRes, ledgerRes] = await Promise.all([
    (client as SupabaseClient)
      .from("orders")
      .select("id, order_no, order_status, grand_total, placed_at, created_at")
      .eq("customer_id", customerId)
      .not("order_status", "eq", "draft_checkout")
      .order("created_at", { ascending: false })
      .limit(20),
    (client as SupabaseClient)
      .from("addresses")
      .select("id, label, receiver_name, address_line, province, is_default")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false }),
    (client as SupabaseClient)
      .from("loyalty_ledger")
      .select("id, points_delta, reason, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    id: row.id,
    email: fallback(row.email),
    fullName: fallback(row.full_name),
    phone: fallback(row.phone),
    loyaltyTier: row.loyalty_tier,
    loyaltyPoints: row.loyalty_points,
    createdAt: row.created_at.slice(0, 10),
    orders: ((ordersRes.data ?? []) as Array<{
      id: string;
      order_no: string;
      order_status: string;
      grand_total: number | string;
      placed_at: string | null;
      created_at: string;
    }>).map((o) => ({
      id: o.id,
      orderNo: o.order_no,
      status: o.order_status,
      grandTotal: `${Number(o.grand_total).toLocaleString("vi-VN")}đ`,
      placedAt: (o.placed_at ?? o.created_at).slice(0, 10),
    })),
    addresses: ((addressesRes.data ?? []) as Array<{
      id: string;
      label: string | null;
      receiver_name: string;
      address_line: string;
      province: string;
      is_default: boolean;
    }>).map((a) => ({
      id: a.id,
      label: a.label,
      receiverName: a.receiver_name,
      addressLine: a.address_line,
      province: a.province,
      isDefault: a.is_default,
    })),
    loyaltyLedger: ((ledgerRes.data ?? []) as Array<{
      id: string;
      points_delta: number;
      reason: string;
      created_at: string;
    }>).map((e) => ({
      id: e.id,
      pointsDelta: e.points_delta,
      reason: e.reason,
      createdAt: e.created_at.slice(0, 10),
    })),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/features/admin/customers/queries.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/customers/queries.ts src/features/admin/customers/queries.test.ts
git commit -m "feat(admin): add customer query functions with tests"
```

---

### Task 2: Admin customers list page

**Files:**
- Create: `app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `getAdminCustomerRows` from Task 1; `requireAdminPermission` from `src/features/admin/auth.ts`; `AdminDataTable` from `components/admin/admin-data-table.tsx`; `AdminPageHeader` from `components/admin/admin-page-header.tsx`

- [ ] **Step 1: Read AdminPageHeader to confirm its props**

```bash
head -20 components/admin/admin-page-header.tsx
```

Confirm it accepts `title: string` and optionally `action?: ReactNode`.

- [ ] **Step 2: Create the customers list page**

```tsx
// app/admin/users/page.tsx
import Link from "next/link";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission, createAdminErrorResponse } from "@/src/features/admin/auth";
import { getAdminCustomerRows } from "@/src/features/admin/customers/queries";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";

const tierLabels: Record<string, string> = {
  standard: "Tiêu Chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

const columns = [
  { key: "email", label: "Email" },
  { key: "fullName", label: "Họ tên" },
  { key: "phone", label: "Điện thoại" },
  { key: "loyaltyTier", label: "Hạng" },
  { key: "loyaltyPoints", label: "Điểm" },
  { key: "createdAt", label: "Ngày tạo" },
];

export default async function AdminUsersPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "customers:read");
  } catch (err: unknown) {
    const { AdminAuthorizationError } = await import("@/src/features/admin/auth");
    if (err instanceof AdminAuthorizationError) {
      return createAdminErrorResponse(err);
    }
    throw err;
  }

  const customers = await getAdminCustomerRows(client);

  const rows = customers.map((c) => ({
    id: c.id,
    email: (
      <Link href={`/admin/users/${c.id}`} className="font-medium text-slate-900 hover:underline">
        {c.email}
      </Link>
    ),
    fullName: c.fullName,
    phone: c.phone,
    loyaltyTier: tierLabels[c.loyaltyTier] ?? c.loyaltyTier,
    loyaltyPoints: c.loyaltyPoints.toLocaleString("vi-VN"),
    createdAt: c.createdAt,
  }));

  return (
    <div>
      <AdminPageHeader title="Khách hàng" />
      <AdminDataTable columns={columns} rows={rows} />
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "feat(admin): add customers list page"
```

---

### Task 3: Admin customer detail page

**Files:**
- Create: `app/admin/users/[id]/page.tsx`

**Interfaces:**
- Consumes: `getAdminCustomerDetail` from Task 1 (same `queries.ts` file)

- [ ] **Step 1: Create the customer detail page**

```tsx
// app/admin/users/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission, AdminAuthorizationError, createAdminErrorResponse } from "@/src/features/admin/auth";
import { getAdminCustomerDetail } from "@/src/features/admin/customers/queries";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";

const tierLabels: Record<string, string> = {
  standard: "Tiêu Chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "customers:read");
  } catch (err: unknown) {
    if (err instanceof AdminAuthorizationError) {
      return createAdminErrorResponse(err);
    }
    throw err;
  }

  const customer = await getAdminCustomerDetail(client, id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={customer.fullName !== "—" ? customer.fullName : customer.email}
        action={
          <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-700">
            ← Danh sách khách hàng
          </Link>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Email", value: customer.email },
          { label: "Điện thoại", value: customer.phone },
          { label: "Hạng", value: tierLabels[customer.loyaltyTier] ?? customer.loyaltyTier },
          { label: "Điểm tích lũy", value: customer.loyaltyPoints.toLocaleString("vi-VN") },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Đơn hàng</h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đơn hàng.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="pb-2 font-medium text-slate-600">Mã đơn</th>
                <th className="pb-2 font-medium text-slate-600">Trạng thái</th>
                <th className="pb-2 font-medium text-slate-600">Tổng tiền</th>
                <th className="pb-2 font-medium text-slate-600">Ngày đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customer.orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="py-2">
                    <StatusChip status={o.status} />
                  </td>
                  <td className="py-2 text-slate-700">{o.grandTotal}</td>
                  <td className="py-2 text-slate-500">{o.placedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Addresses */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Địa chỉ</h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có địa chỉ nào.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customer.addresses.map((addr) => (
              <div key={addr.id} className="rounded border border-slate-100 p-3 text-sm">
                {addr.label && (
                  <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 mb-1">
                    {addr.label}
                  </span>
                )}
                {addr.isDefault && (
                  <span className="inline-block ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 mb-1">
                    Mặc định
                  </span>
                )}
                <p className="text-slate-700">{addr.receiverName}</p>
                <p className="text-slate-500">
                  {addr.addressLine}, {addr.province}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Loyalty ledger */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Lịch sử điểm</h2>
        {customer.loyaltyLedger.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có giao dịch điểm nào.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {customer.loyaltyLedger.map((entry) => (
              <div key={entry.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700">{entry.reason}</p>
                  <p className="text-xs text-slate-400">{entry.createdAt}</p>
                </div>
                <span
                  className={`font-semibold ${
                    entry.pointsDelta >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {entry.pointsDelta >= 0 ? "+" : ""}
                  {entry.pointsDelta.toLocaleString("vi-VN")} điểm
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/[id]/page.tsx
git commit -m "feat(admin): add customer detail page with orders, addresses, loyalty"
```

---

### Task 4: Admin role management

**Files:**
- Create: `src/features/admin/roles/queries.ts`
- Create: `src/features/admin/roles/queries.test.ts`
- Create: `src/features/admin/roles/actions.ts`
- Create: `components/admin/role-assignment-form.tsx`
- Modify: `app/admin/users/[id]/page.tsx` (add role section)

**Interfaces:**
- Consumes: `requireAdminPermission(client, "*")` (super_admin only)
- Produces:
  - `getAdminRoles(client): Promise<AdminRole[]>` — all available roles
  - `getUserRoles(client, userId: string): Promise<string[]>` — role names for a specific auth user
  - `assignRoleAction(userId, roleId)` server action
  - `revokeRoleAction(userId, roleId)` server action
  - `RoleAssignmentForm` client component

**Note:** `userId` here is `auth.users.id` (a UUID) not `customers.id`. The customer detail page has `customer.id` (customers table). We need the linked `user_id` from the `customers` table. Update `getAdminCustomerDetail` to also return `userId: string | null`.

- [ ] **Step 1: Update `getAdminCustomerDetail` to return `userId`**

In `src/features/admin/customers/queries.ts`, add `user_id` to the select and to the `AdminCustomerDetail` type:

```typescript
// In AdminCustomerDetail type, add:
userId: string | null;

// In the customers select, change:
.select("id, email, full_name, phone, loyalty_tier, loyalty_points, created_at")
// to:
.select("id, user_id, email, full_name, phone, loyalty_tier, loyalty_points, created_at")

// In the row mapping, add:
userId: (cust as { user_id?: string | null }).user_id ?? null,
```

- [ ] **Step 2: Write the role query tests**

```typescript
// src/features/admin/roles/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import { getAdminRoles, getUserRoles } from "./queries";

describe("getAdminRoles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all admin roles", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "role-1", name: "super_admin", description: "Full access" },
            { id: "role-2", name: "catalog_manager", description: null },
          ],
          error: null,
        }),
      }),
    });

    const result = await getAdminRoles({ from: mockFrom } as never);

    expect(result).toEqual([
      { id: "role-1", name: "super_admin", description: "Full access" },
      { id: "role-2", name: "catalog_manager", description: null },
    ]);
  });
});

describe("getUserRoles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns role names for a user", async () => {
    const eqChain = vi.fn().mockResolvedValue({
      data: [{ admin_roles: { name: "finance" } }],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqChain }),
    });

    const result = await getUserRoles({ from: mockFrom } as never, "user-uuid-1");

    expect(result).toEqual([{ roleId: undefined, roleName: "finance" }]);
    expect(eqChain).toHaveBeenCalledWith("user_id", "user-uuid-1");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- src/features/admin/roles/queries.test.ts
```

Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 4: Create the role query functions**

```typescript
// src/features/admin/roles/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryClient = Pick<SupabaseClient, "from">;

export type AdminRole = {
  id: string;
  name: string;
  description: string | null;
};

export type UserRoleAssignment = {
  roleId: string | undefined;
  roleName: string;
};

export async function getAdminRoles(client: QueryClient): Promise<AdminRole[]> {
  const { data, error } = await client
    .from("admin_roles")
    .select("id, name, description")
    .order("name");

  if (error) throw error;

  return ((data ?? []) as AdminRole[]);
}

export async function getUserRoles(
  client: QueryClient,
  userId: string,
): Promise<UserRoleAssignment[]> {
  const { data, error } = await client
    .from("user_admin_roles")
    .select("role_id, admin_roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return ((data ?? []) as Array<{
    role_id: string;
    admin_roles: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => {
    const roleName = Array.isArray(row.admin_roles)
      ? (row.admin_roles[0]?.name ?? "")
      : (row.admin_roles?.name ?? "");

    return { roleId: row.role_id, roleName };
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/features/admin/roles/queries.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 6: Create the role assignment server actions**

```typescript
// src/features/admin/roles/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const rolePayloadSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  customerId: z.string().uuid(),
});

export async function assignRoleAction(formData: FormData): Promise<void> {
  const payload = rolePayloadSchema.parse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
    customerId: formData.get("customerId"),
  });

  const client = await createServerClient();
  await requireAdminPermission(client, "*");

  const { error } = await client
    .from("user_admin_roles")
    .upsert(
      { user_id: payload.userId, role_id: payload.roleId },
      { onConflict: "user_id,role_id" },
    );

  if (error) throw error;
  revalidatePath(`/admin/users/${payload.customerId}`);
}

export async function revokeRoleAction(formData: FormData): Promise<void> {
  const payload = rolePayloadSchema.parse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
    customerId: formData.get("customerId"),
  });

  const client = await createServerClient();
  await requireAdminPermission(client, "*");

  const { error } = await client
    .from("user_admin_roles")
    .delete()
    .eq("user_id", payload.userId)
    .eq("role_id", payload.roleId);

  if (error) throw error;
  revalidatePath(`/admin/users/${payload.customerId}`);
}
```

- [ ] **Step 7: Create the role assignment form client component**

```tsx
// components/admin/role-assignment-form.tsx
"use client";

import { useTransition } from "react";
import { assignRoleAction, revokeRoleAction } from "@/src/features/admin/roles/actions";
import type { AdminRole, UserRoleAssignment } from "@/src/features/admin/roles/queries";

type RoleAssignmentFormProps = {
  userId: string;
  customerId: string;
  allRoles: AdminRole[];
  currentAssignments: UserRoleAssignment[];
};

export function RoleAssignmentForm({
  userId,
  customerId,
  allRoles,
  currentAssignments,
}: RoleAssignmentFormProps) {
  const [pending, startTransition] = useTransition();
  const assignedIds = new Set(currentAssignments.map((a) => a.roleId));

  function handleToggle(roleId: string, isAssigned: boolean) {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("roleId", roleId);
    formData.set("customerId", customerId);

    startTransition(() =>
      isAssigned ? revokeRoleAction(formData) : assignRoleAction(formData),
    );
  }

  return (
    <div className="space-y-2">
      {allRoles.map((role) => {
        const isAssigned = assignedIds.has(role.id);
        return (
          <div key={role.id} className="flex items-center justify-between rounded border border-slate-100 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{role.name}</p>
              {role.description && (
                <p className="text-xs text-slate-500">{role.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleToggle(role.id, isAssigned)}
              disabled={pending}
              className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                isAssigned
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAssigned ? "Thu hồi" : "Cấp quyền"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8: Add role section to customer detail page**

In `app/admin/users/[id]/page.tsx`, add imports and the role section after the loyalty ledger section.

Add imports at the top:

```tsx
import { getAdminRoles, getUserRoles } from "@/src/features/admin/roles/queries";
import { RoleAssignmentForm } from "@/components/admin/role-assignment-form";
```

In the page function, after `getAdminCustomerDetail`, fetch roles if the customer has a linked auth user:

```tsx
// After: const customer = await getAdminCustomerDetail(client, id);

const [allRoles, currentAssignments] = customer?.userId
  ? await Promise.all([
      getAdminRoles(client),
      getUserRoles(client, customer.userId),
    ])
  : [[], []];
```

Add the role section after the loyalty ledger section:

```tsx
{/* Role management — only visible to super_admin */}
{customer.userId && (
  <section className="rounded-lg border border-slate-200 bg-white p-4">
    <h2 className="text-base font-semibold text-slate-800 mb-3">Quyền quản trị</h2>
    <RoleAssignmentForm
      userId={customer.userId}
      customerId={customer.id}
      allRoles={allRoles}
      currentAssignments={currentAssignments}
    />
  </section>
)}
```

- [ ] **Step 9: Run the full test suite**

```bash
npm test
```

Expected: PASS — all tests pass

- [ ] **Step 10: Commit**

```bash
git add src/features/admin/roles/queries.ts src/features/admin/roles/queries.test.ts src/features/admin/roles/actions.ts components/admin/role-assignment-form.tsx app/admin/users/[id]/page.tsx src/features/admin/customers/queries.ts
git commit -m "feat(admin): add role management UI to customer detail page"
```

---

### Task 5: Add Users to admin nav

**Files:**
- Modify: `components/admin/admin-nav.tsx`

**Interfaces:**
- No new interfaces — adds a link entry to the existing `adminLinks` array

- [ ] **Step 1: Add the Users link**

In `components/admin/admin-nav.tsx`, add `{ href: "/admin/users", label: "Users" }` to the `adminLinks` array, after the `Reports` entry:

```typescript
// components/admin/admin-nav.tsx — updated adminLinks array:
const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/warehouses", label: "Warehouses" },
  { href: "/admin/purchase-orders", label: "Purchase Orders" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
];
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-nav.tsx
git commit -m "feat(admin): add Users link to admin navigation"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/admin/users` — customer list with email, name, tier, points, date
- ✅ `/admin/users/[id]` — customer detail with orders, addresses, loyalty ledger
- ✅ Role management section on customer detail — assign/revoke admin roles
- ✅ `requireAdminPermission("customers:read")` gates list and detail pages
- ✅ `requireAdminPermission("*")` gates assign/revoke actions (super_admin only)
- ✅ "Users" added to admin nav

**Known limitation:** The customer list is limited to 200 rows (`limit(200)`). Pagination can be added later; this is sufficient for early admin use. The `limit()` call makes the constraint explicit and visible.
