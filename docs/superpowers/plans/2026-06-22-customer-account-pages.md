# Customer Account Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all four stub account sub-pages with real Supabase data, add a profile page, and add a logout button to the account sidebar.

**Architecture:** Server Components fetch data using `createServerClient()` and pass it to thin Client Component forms/lists. Query logic lives in `src/features/account/queries.ts`. Server Actions for mutations (profile update, address CRUD) live in separate action files. The layout gains a logout button and active-link highlighting.

**Tech Stack:** Next.js 15 App Router, Supabase SSR client (`@/src/lib/supabase/server`), Server Actions, Zod validation, Tailwind CSS, Vitest for unit tests.

## Global Constraints

- All query functions accept a duck-typed client so they are unit-testable without a real Supabase connection.
- Server Actions must be in files marked `"use server"` at the top.
- Client Components (forms, interactive buttons) must be in files marked `"use client"` at the top.
- Vietnamese copy: use Vietnamese for user-facing labels where the existing codebase already does (e.g., "Đăng xuất", "Lưu thay đổi").
- `formatVnd` from `@/src/lib/format` must be used for all money values.
- Run `npm test` after each task to verify no regressions.

---

### Task 1: Account query functions

**Files:**
- Create: `src/features/account/queries.ts`
- Create: `src/features/account/queries.test.ts`

**Interfaces:**
- Produces:
  - `getAccountProfile(client, userId: string): Promise<AccountProfile | null>`
  - `getAccountOrders(client, customerId: string): Promise<AccountOrder[]>`
  - `getAccountAddresses(client, customerId: string): Promise<AccountAddress[]>`
  - `getAccountWishlist(client, customerId: string): Promise<AccountWishlistItem[]>`
  - `getAccountLoyaltyLedger(client, customerId: string): Promise<LoyaltyLedgerEntry[]>`
  - Types: `AccountProfile`, `AccountOrder`, `AccountAddress`, `AccountWishlistItem`, `LoyaltyLedgerEntry`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/account/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getAccountProfile,
  getAccountOrders,
  getAccountAddresses,
} from "./queries";

describe("getAccountProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps customer row to AccountProfile", async () => {
    const chain = { single: vi.fn().mockResolvedValue({
      data: {
        id: "cust-1",
        full_name: "Nguyễn Văn A",
        phone: "0901234567",
        loyalty_points: 250,
        loyalty_tier: "silver",
      },
      error: null,
    })};
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(chain),
      }),
    });

    const result = await getAccountProfile({ from: mockFrom } as never, "user-1");

    expect(result).toEqual({
      customerId: "cust-1",
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
      loyaltyPoints: 250,
      loyaltyTier: "silver",
    });
  });

  it("returns null when customer row not found", async () => {
    const chain = { single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }) };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountProfile({ from: mockFrom } as never, "user-missing");

    expect(result).toBeNull();
  });
});

describe("getAccountOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps order rows including item count and formats VND", async () => {
    const chain = {
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "ord-1",
          order_no: "ORD-001",
          order_status: "completed",
          grand_total: 299000,
          placed_at: "2026-06-01T10:00:00Z",
          created_at: "2026-06-01T10:00:00Z",
          order_items: [{ id: "i1" }, { id: "i2" }],
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountOrders({ from: mockFrom } as never, "cust-1");

    expect(result).toEqual([{
      id: "ord-1",
      orderNo: "ORD-001",
      status: "completed",
      grandTotal: "299.000d",
      placedAt: "2026-06-01",
      itemCount: 2,
    }]);
  });

  it("uses created_at when placed_at is null", async () => {
    const chain = {
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "ord-2",
          order_no: "ORD-002",
          order_status: "confirmed",
          grand_total: 0,
          placed_at: null,
          created_at: "2026-05-20T08:00:00Z",
          order_items: [],
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const [row] = await getAccountOrders({ from: mockFrom } as never, "cust-1");

    expect(row.placedAt).toBe("2026-05-20");
    expect(row.itemCount).toBe(0);
  });
});

describe("getAccountAddresses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps address rows and puts default first", async () => {
    const chain = {
      order: vi.fn().mockResolvedValue({
        data: [{
          id: "addr-1",
          label: "Nhà",
          receiver_name: "Nguyễn Văn A",
          phone: "0901234567",
          province: "Hà Nội",
          district: "Ba Đình",
          ward: "Phúc Xá",
          address_line: "123 Đường Láng",
          is_default: true,
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountAddresses({ from: mockFrom } as never, "cust-1");

    expect(result).toEqual([{
      id: "addr-1",
      label: "Nhà",
      receiverName: "Nguyễn Văn A",
      phone: "0901234567",
      province: "Hà Nội",
      district: "Ba Đình",
      ward: "Phúc Xá",
      addressLine: "123 Đường Láng",
      isDefault: true,
    }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/features/account/queries.test.ts
```

Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/account/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatVnd } from "@/src/lib/format";

type QueryClient = Pick<SupabaseClient, "from">;

export type AccountProfile = {
  customerId: string;
  fullName: string | null;
  phone: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
};

export type AccountOrder = {
  id: string;
  orderNo: string;
  status: string;
  grandTotal: string;
  placedAt: string;
  itemCount: number;
};

export type AccountAddress = {
  id: string;
  label: string | null;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault: boolean;
};

export type AccountWishlistItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
};

export type LoyaltyLedgerEntry = {
  id: string;
  pointsDelta: number;
  reason: string;
  createdAt: string;
};

export async function getAccountProfile(
  client: QueryClient,
  userId: string,
): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from("customers")
    .select("id, full_name, phone, loyalty_points, loyalty_tier")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const row = data as {
    id: string;
    full_name: string | null;
    phone: string | null;
    loyalty_points: number;
    loyalty_tier: string;
  };

  return {
    customerId: row.id,
    fullName: row.full_name,
    phone: row.phone,
    loyaltyPoints: row.loyalty_points,
    loyaltyTier: row.loyalty_tier,
  };
}

export async function getAccountOrders(
  client: QueryClient,
  customerId: string,
): Promise<AccountOrder[]> {
  const { data, error } = await client
    .from("orders")
    .select("id, order_no, order_status, grand_total, placed_at, created_at, order_items(id)")
    .eq("customer_id", customerId)
    .not("order_status", "eq", "draft_checkout")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    order_no: string;
    order_status: string;
    grand_total: number | string;
    placed_at: string | null;
    created_at: string;
    order_items: Array<{ id: string }> | null;
  }>).map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    status: row.order_status,
    grandTotal: formatVnd(Number(row.grand_total)),
    placedAt: (row.placed_at ?? row.created_at).slice(0, 10),
    itemCount: Array.isArray(row.order_items) ? row.order_items.length : 0,
  }));
}

export async function getAccountAddresses(
  client: QueryClient,
  customerId: string,
): Promise<AccountAddress[]> {
  const { data, error } = await client
    .from("addresses")
    .select("id, label, receiver_name, phone, province, district, ward, address_line, is_default")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    label: string | null;
    receiver_name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    address_line: string;
    is_default: boolean;
  }>).map((row) => ({
    id: row.id,
    label: row.label,
    receiverName: row.receiver_name,
    phone: row.phone,
    province: row.province,
    district: row.district,
    ward: row.ward,
    addressLine: row.address_line,
    isDefault: row.is_default,
  }));
}

export async function getAccountWishlist(
  client: QueryClient,
  customerId: string,
): Promise<AccountWishlistItem[]> {
  const { data, error } = await client
    .from("wishlists")
    .select("wishlist_items(id, products(id, name, slug, product_images(url)))")
    .eq("customer_id", customerId)
    .single();

  if (error || !data) return [];

  const row = data as {
    wishlist_items: Array<{
      id: string;
      products: { id: string; name: string; slug: string; product_images: Array<{ url: string }> } | null;
    }> | null;
  };

  return (row.wishlist_items ?? []).map((item) => {
    const product = item.products;
    const images = product?.product_images ?? [];
    return {
      id: item.id,
      productId: product?.id ?? "",
      productName: product?.name ?? "",
      productSlug: product?.slug ?? "",
      imageUrl: images[0]?.url ?? null,
    };
  });
}

export async function getAccountLoyaltyLedger(
  client: QueryClient,
  customerId: string,
): Promise<LoyaltyLedgerEntry[]> {
  const { data, error } = await client
    .from("loyalty_ledger")
    .select("id, points_delta, reason, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    points_delta: number;
    reason: string;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    pointsDelta: row.points_delta,
    reason: row.reason,
    createdAt: row.created_at.slice(0, 10),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/features/account/queries.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/features/account/queries.ts src/features/account/queries.test.ts
git commit -m "feat(account): add account query functions with tests"
```

---

### Task 2: Logout action + button in layout

**Files:**
- Create: `src/features/account/logout-action.ts`
- Modify: `app/account/layout.tsx`

**Interfaces:**
- Consumes: `getAccountSessionState` from `@/src/features/account/actions` (already exists)
- Produces: `logoutAction()` server action that signs out and redirects to `/login`

- [ ] **Step 1: Create the logout server action**

```typescript
// src/features/account/logout-action.ts
"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/src/lib/supabase/server";

export async function logoutAction(): Promise<never> {
  const client = await createServerClient();
  await client.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Add logout button to account layout**

Replace the full content of `app/account/layout.tsx`:

```tsx
// app/account/layout.tsx
import Link from "next/link";
import { getAccountSessionState } from "@/src/features/account/actions";
import { logoutAction } from "@/src/features/account/logout-action";

type AccountLayoutProps = {
  children: React.ReactNode;
};

const accountLinks = [
  { href: "/account", label: "Hồ sơ" },
  { href: "/account/orders", label: "Đơn hàng" },
  { href: "/account/addresses", label: "Địa chỉ" },
  { href: "/account/wishlist", label: "Yêu thích" },
  { href: "/account/loyalty", label: "Tích điểm" },
];

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const session = await getAccountSessionState();
  const email = session.status === "authenticated" ? session.email : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3">
          <div className="px-2 py-2 text-sm font-semibold text-slate-700 truncate">
            {email ?? "Tài khoản"}
          </div>
          <nav className="mt-2 space-y-1">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
npm test
```

Expected: all existing tests PASS (no new tests for this task — logout is an integration concern)

- [ ] **Step 4: Commit**

```bash
git add src/features/account/logout-action.ts app/account/layout.tsx
git commit -m "feat(account): add logout action and update account layout nav"
```

---

### Task 3: Profile page

**Files:**
- Create: `app/account/page.tsx`
- Create: `src/features/account/profile-action.ts`
- Create: `components/account/profile-form.tsx`

**Interfaces:**
- Consumes: `getAccountProfile(client, userId)` from Task 1; `getAccountSessionState()` from `@/src/features/account/actions`
- Produces: `/account` page rendering the profile form; `updateProfileAction` server action

- [ ] **Step 1: Create the profile update server action**

```typescript
// src/features/account/profile-action.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
});

export type ProfileActionState = { error: string } | { success: true } | null;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const { error } = await client
    .from("profiles")
    .update({ full_name: result.data.fullName, phone: result.data.phone })
    .eq("id", user.id);

  if (error) return { error: "Không thể lưu thông tin. Vui lòng thử lại." };

  revalidatePath("/account");
  return { success: true };
}
```

- [ ] **Step 2: Create the profile form client component**

```tsx
// components/account/profile-form.tsx
"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/src/features/account/profile-action";

type ProfileFormProps = {
  defaultFullName: string | null;
  defaultPhone: string | null;
};

export function ProfileForm({ defaultFullName, defaultPhone }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className="space-y-4 max-w-sm">
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-green-600">Đã lưu thay đổi.</p>
      )}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
          Họ và tên
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={defaultFullName ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
          Số điện thoại
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultPhone ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the profile page server component**

```tsx
// app/account/page.tsx
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile } from "@/src/features/account/queries";
import { ProfileForm } from "@/components/account/profile-form";
import { redirect } from "next/navigation";

export default async function AccountProfilePage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-1">Hồ sơ</h1>
      <p className="text-sm text-slate-500 mb-6">{session.email}</p>
      <ProfileForm
        defaultFullName={profile?.fullName ?? null}
        defaultPhone={profile?.phone ?? null}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: PASS — all tests pass (no unit tests for thin UI/action wrappers)

- [ ] **Step 5: Commit**

```bash
git add app/account/page.tsx src/features/account/profile-action.ts components/account/profile-form.tsx
git commit -m "feat(account): add profile page with edit form"
```

---

### Task 4: Orders page with real data

**Files:**
- Modify: `app/account/orders/page.tsx`

**Interfaces:**
- Consumes: `getAccountProfile`, `getAccountOrders` from `src/features/account/queries.ts` (Task 1)

- [ ] **Step 1: Replace the stub with a real data fetch**

```tsx
// app/account/orders/page.tsx
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountOrders } from "@/src/features/account/queries";
import { redirect } from "next/navigation";

const statusLabels: Record<string, string> = {
  draft_checkout: "Nháp",
  awaiting_payment: "Chờ thanh toán",
  payment_failed: "Thanh toán thất bại",
  pending_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  picking: "Đang lấy hàng",
  packed: "Đã đóng gói",
  dispatched: "Đang giao",
  delivery_attempted: "Giao không thành công",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã trả hàng",
  partially_returned: "Trả một phần",
  refunded: "Đã hoàn tiền",
};

export default async function AccountOrdersPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;

  const orders = profile
    ? await getAccountOrders(client, profile.customerId)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <div key={order.id} className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{order.orderNo}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.itemCount} sản phẩm · {order.placedAt}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{order.grandTotal}</p>
                <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
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
git add app/account/orders/page.tsx
git commit -m "feat(account): implement orders page with real order history"
```

---

### Task 5: Addresses page with CRUD

**Files:**
- Create: `src/features/account/address-actions.ts`
- Create: `components/account/address-form.tsx`
- Create: `components/account/address-card.tsx`
- Modify: `app/account/addresses/page.tsx`

**Interfaces:**
- Consumes: `AccountAddress` type, `getAccountProfile`, `getAccountAddresses` from Task 1
- Produces:
  - `addAddressAction(_prev, formData)` server action
  - `deleteAddressAction(addressId: string)` server action
  - `setDefaultAddressAction(addressId: string, customerId: string)` server action

- [ ] **Step 1: Create address server actions**

```typescript
// src/features/account/address-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const addressSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().optional(),
  receiverName: z.string().min(1, "Vui lòng nhập tên người nhận"),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  province: z.string().min(1, "Vui lòng nhập tỉnh/thành"),
  district: z.string().min(1, "Vui lòng nhập quận/huyện"),
  ward: z.string().min(1, "Vui lòng nhập phường/xã"),
  addressLine: z.string().min(1, "Vui lòng nhập địa chỉ"),
  isDefault: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
});

export type AddressActionState = { error: string } | { success: true } | null;

export async function addAddressAction(
  _prev: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const result = addressSchema.safeParse({
    customerId: formData.get("customerId"),
    label: formData.get("label") || undefined,
    receiverName: formData.get("receiverName"),
    phone: formData.get("phone"),
    province: formData.get("province"),
    district: formData.get("district"),
    ward: formData.get("ward"),
    addressLine: formData.get("addressLine"),
    isDefault: formData.get("isDefault"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();

  if (result.data.isDefault) {
    await client
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", result.data.customerId);
  }

  const { error } = await client.from("addresses").insert({
    customer_id: result.data.customerId,
    label: result.data.label ?? null,
    receiver_name: result.data.receiverName,
    phone: result.data.phone,
    province: result.data.province,
    district: result.data.district,
    ward: result.data.ward,
    address_line: result.data.addressLine,
    is_default: result.data.isDefault,
  });

  if (error) return { error: "Không thể thêm địa chỉ. Vui lòng thử lại." };

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const client = await createServerClient();
  const { error } = await client.from("addresses").delete().eq("id", addressId);
  if (error) throw error;
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(
  addressId: string,
  customerId: string,
): Promise<void> {
  const client = await createServerClient();

  await client
    .from("addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  const { error } = await client
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId);

  if (error) throw error;
  revalidatePath("/account/addresses");
}
```

- [ ] **Step 2: Create the address form client component**

```tsx
// components/account/address-form.tsx
"use client";

import { useActionState } from "react";
import {
  addAddressAction,
  type AddressActionState,
} from "@/src/features/account/address-actions";

type AddressFormProps = {
  customerId: string;
  onSuccess?: () => void;
};

export function AddressForm({ customerId, onSuccess: _onSuccess }: AddressFormProps) {
  const [state, action, pending] = useActionState<AddressActionState, FormData>(
    addAddressAction,
    null,
  );

  return (
    <form action={action} className="space-y-3 mt-4">
      <input type="hidden" name="customerId" value={customerId} />
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="receiverName" className="block text-sm font-medium text-slate-700 mb-1">
            Tên người nhận *
          </label>
          <input
            id="receiverName"
            name="receiverName"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Số điện thoại *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-slate-700 mb-1">
            Tỉnh/Thành *
          </label>
          <input
            id="province"
            name="province"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-slate-700 mb-1">
            Quận/Huyện *
          </label>
          <input
            id="district"
            name="district"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="ward" className="block text-sm font-medium text-slate-700 mb-1">
            Phường/Xã *
          </label>
          <input
            id="ward"
            name="ward"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-slate-700 mb-1">
            Nhãn (tùy chọn)
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="VD: Nhà, Văn phòng"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="addressLine" className="block text-sm font-medium text-slate-700 mb-1">
            Địa chỉ chi tiết *
          </label>
          <input
            id="addressLine"
            name="addressLine"
            type="text"
            required
            placeholder="Số nhà, tên đường"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="isDefault"
            name="isDefault"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="isDefault" className="text-sm text-slate-700">
            Đặt làm địa chỉ mặc định
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Thêm địa chỉ"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the address card client component**

```tsx
// components/account/address-card.tsx
"use client";

import { useTransition } from "react";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/src/features/account/address-actions";
import type { AccountAddress } from "@/src/features/account/queries";

type AddressCardProps = {
  address: AccountAddress;
  customerId: string;
};

export function AddressCard({ address, customerId }: AddressCardProps) {
  const [pending, startTransition] = useTransition();

  function handleSetDefault() {
    startTransition(() => setDefaultAddressAction(address.id, customerId));
  }

  function handleDelete() {
    startTransition(() => deleteAddressAction(address.id));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          {address.label && (
            <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 mb-1">
              {address.label}
            </span>
          )}
          {address.isDefault && (
            <span className="inline-block ml-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 mb-1">
              Mặc định
            </span>
          )}
          <p className="text-sm font-medium text-slate-900">{address.receiverName}</p>
          <p className="text-sm text-slate-600">{address.phone}</p>
          <p className="text-sm text-slate-600">
            {address.addressLine}, {address.ward}, {address.district}, {address.province}
          </p>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {!address.isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={pending}
            className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Đặt mặc định
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace the addresses page stub**

```tsx
// app/account/addresses/page.tsx
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountAddresses } from "@/src/features/account/queries";
import { AddressForm } from "@/components/account/address-form";
import { AddressCard } from "@/components/account/address-card";
import { redirect } from "next/navigation";

export default async function AccountAddressesPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const addresses = profile
    ? await getAccountAddresses(client, profile.customerId)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Địa chỉ giao hàng</h1>
      {addresses.length === 0 ? (
        <p className="text-sm text-slate-500 mb-4">Chưa có địa chỉ nào được lưu.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              customerId={profile!.customerId}
            />
          ))}
        </div>
      )}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Thêm địa chỉ mới
        </summary>
        {profile && <AddressForm customerId={profile.customerId} />}
      </details>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/account/address-actions.ts components/account/address-form.tsx components/account/address-card.tsx app/account/addresses/page.tsx
git commit -m "feat(account): implement addresses page with add/delete/set-default"
```

---

### Task 6: Wishlist page with real data

**Files:**
- Modify: `app/account/wishlist/page.tsx`

**Interfaces:**
- Consumes: `getAccountProfile`, `getAccountWishlist` from Task 1; `removeWishlistItem` from `src/features/wishlist/actions.ts` (already exists)

- [ ] **Step 1: Replace the wishlist stub**

```tsx
// app/account/wishlist/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountWishlist } from "@/src/features/account/queries";
import { RemoveWishlistButton } from "@/components/account/remove-wishlist-button";
import { redirect } from "next/navigation";

export default async function AccountWishlistPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const items = profile ? await getAccountWishlist(client, profile.customerId) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Sản phẩm yêu thích</h1>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có sản phẩm nào trong danh sách yêu thích.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
              {item.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden rounded">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <Link
                href={`/products/${item.productSlug}`}
                className="block text-sm font-medium text-slate-900 hover:underline"
              >
                {item.productName}
              </Link>
              <RemoveWishlistButton wishlistItemId={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the remove wishlist button client component**

```tsx
// components/account/remove-wishlist-button.tsx
"use client";

import { useTransition } from "react";
import { removeWishlistItem } from "@/src/features/wishlist/actions";

export function RemoveWishlistButton({ wishlistItemId }: { wishlistItemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => removeWishlistItem({ wishlistItemId }))}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? "Đang xóa…" : "Xóa"}
    </button>
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
git add app/account/wishlist/page.tsx components/account/remove-wishlist-button.tsx
git commit -m "feat(account): implement wishlist page with real data and remove action"
```

---

### Task 7: Loyalty page with real data

**Files:**
- Modify: `app/account/loyalty/page.tsx`

**Interfaces:**
- Consumes: `getAccountProfile`, `getAccountLoyaltyLedger` from Task 1

- [ ] **Step 1: Replace the loyalty stub**

```tsx
// app/account/loyalty/page.tsx
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountLoyaltyLedger } from "@/src/features/account/queries";
import { redirect } from "next/navigation";

const tierLabels: Record<string, string> = {
  standard: "Tiêu Chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

const reasonLabels: Record<string, string> = {
  order_completed: "Đơn hàng hoàn thành",
  manual_adjustment: "Điều chỉnh thủ công",
};

export default async function AccountLoyaltyPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const ledger = profile ? await getAccountLoyaltyLedger(client, profile.customerId) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-2">Tích điểm</h1>
      {profile ? (
        <>
          <div className="mb-6 flex gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Điểm tích lũy</p>
              <p className="text-3xl font-bold text-slate-900">
                {profile.loyaltyPoints.toLocaleString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Hạng thành viên</p>
              <p className="text-lg font-semibold text-slate-700">
                {tierLabels[profile.loyaltyTier] ?? profile.loyaltyTier}
              </p>
            </div>
          </div>
          <h2 className="text-base font-semibold mb-2 text-slate-800">Lịch sử điểm</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có giao dịch điểm nào.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      {reasonLabels[entry.reason] ?? entry.reason}
                    </p>
                    <p className="text-xs text-slate-400">{entry.createdAt}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
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
        </>
      ) : (
        <p className="text-sm text-slate-500">Không tìm thấy thông tin khách hàng.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/account/loyalty/page.tsx
git commit -m "feat(account): implement loyalty page with points balance and ledger"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Profile page (`/account` + `ProfileForm`)
- ✅ Logout button in layout
- ✅ Orders page with real data
- ✅ Addresses page with add/delete/set-default
- ✅ Wishlist page with real data + remove
- ✅ Loyalty page with points, tier, ledger
- ✅ `"Hồ sơ"` link added to account nav in layout (Task 2)

**Missing from stubs but not originally caught:** No active nav link highlighting. The layout uses plain `<Link>` — active state requires a Client Component. This is low-priority UX polish; add it post-MVP by wrapping the `<Link>` list in a `"use client"` component that uses `usePathname()` to add `aria-current="page"` and a highlight class.
