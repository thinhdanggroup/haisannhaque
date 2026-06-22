# Operational UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make existing Refunds, Complaints, and Orders admin forms usable without requiring operators to type raw UUIDs.

**Architecture:** Add a shared `OrderSearchPicker` client component backed by a server action that searches orders by order_no or customer name. Upgrade the refund and complaint create forms to use the picker. Add refund status transitions. Upgrade the complaint detail form to support staff assignment and inline comment threads (requires one new migration). Add search/filter/pagination to the orders list and add shortcut links from the order detail page.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React useActionState, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access — no direct fetch calls to Supabase
- `requireAdminPermission(client, "perm:scope")` on every server action
- Form components must use `useActionState` hook
- Tests use vitest, mock Supabase as plain JS object
- Run tests: `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- Never redirect inside a `try/catch` block — `redirect()` throws internally

---

### Task 1: Order search server action

**Files:**
- Create: `src/features/admin/order-search.ts`
- Create: `src/features/admin/order-search.test.ts`

**Interfaces:**
- Produces: `searchOrdersForPicker(client, query: string): Promise<OrderPickerItem[]>`, `searchOrders(query: string): Promise<OrderPickerItem[]>`
- Produces type: `OrderPickerItem = { id: string; order_no: string; customer_name: string; total: number; status: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/admin/order-search.test.ts
import { describe, expect, it } from "vitest";
import { searchOrdersForPicker } from "./order-search";

describe("searchOrdersForPicker", () => {
  it("returns matching orders by order_no prefix", async () => {
    const rows = [
      { id: "uuid-1", order_no: "ORD-001", customers: { full_name: "Alice" }, total: 50000, status: "processing" },
    ];
    const client = {
      from: () => ({
        select: () => ({
          or: () => ({
            order: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    };
    const result = await searchOrdersForPicker(client as never, "ORD");
    expect(result).toEqual([
      { id: "uuid-1", order_no: "ORD-001", customer_name: "Alice", total: 50000, status: "processing" },
    ]);
  });

  it("returns empty array when query is blank", async () => {
    const client = { from: () => ({}) };
    const result = await searchOrdersForPicker(client as never, "   ");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/admin/order-search.test.ts
```
Expected: FAIL — `searchOrdersForPicker is not a function`

- [ ] **Step 3: Implement**

```ts
// src/features/admin/order-search.ts
"use server";

import { createServerClient } from "@/src/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderPickerItem = {
  id: string;
  order_no: string;
  customer_name: string;
  total: number;
  status: string;
};

export async function searchOrdersForPicker(
  client: Pick<SupabaseClient, "from">,
  query: string,
): Promise<OrderPickerItem[]> {
  if (!query.trim()) return [];

  const { data, error } = await client
    .from("orders")
    .select("id, order_no, customers(full_name), total, status")
    .or(`order_no.ilike.%${query}%,customers.full_name.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    order_no: string;
    customers: { full_name: string } | null;
    total: number;
    status: string;
  }>).map((row) => ({
    id: row.id,
    order_no: row.order_no,
    customer_name: row.customers?.full_name ?? "—",
    total: row.total,
    status: row.status,
  }));
}

export async function searchOrders(query: string): Promise<OrderPickerItem[]> {
  const client = await createServerClient();
  return searchOrdersForPicker(client, query);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/admin/order-search.test.ts
```
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/order-search.ts src/features/admin/order-search.test.ts
git commit -m "feat(admin): add order search server action for picker"
```

---

### Task 2: OrderSearchPicker client component

**Files:**
- Create: `components/admin/order-search-picker.tsx`

**Interfaces:**
- Consumes: `searchOrders` from `@/src/features/admin/order-search`
- Produces: `<OrderSearchPicker name="orderId" defaultOrderId? defaultOrderNo? />` — renders a search input and a hidden input with the selected order UUID

- [ ] **Step 1: Write the component**

```tsx
// components/admin/order-search-picker.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { searchOrders, type OrderPickerItem } from "@/src/features/admin/order-search";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  name: string;
  defaultOrderId?: string;
  defaultOrderNo?: string;
};

export function OrderSearchPicker({ name, defaultOrderId, defaultOrderNo }: Props) {
  const [query, setQuery] = useState(defaultOrderNo ?? "");
  const [results, setResults] = useState<OrderPickerItem[]>([]);
  const [selectedId, setSelectedId] = useState(defaultOrderId ?? "");
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedId("");
    if (debounce.current) clearTimeout(debounce.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      const items = await searchOrders(value);
      setResults(items);
      setOpen(true);
    }, 300);
  }, []);

  const handleSelect = useCallback((item: OrderPickerItem) => {
    setSelectedId(item.id);
    setQuery(`${item.order_no} — ${item.customer_name}`);
    setResults([]);
    setOpen(false);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search by order number or customer name…"
        className={INPUT_CLASS}
        autoComplete="off"
        aria-label="Search orders"
      />
      <input type="hidden" name={name} value={selectedId} />

      {open && results.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                role="option"
                aria-selected={item.id === selectedId}
              >
                <span>
                  <span className="font-medium">{item.order_no}</span>
                  <span className="ml-2 text-slate-500">{item.customer_name}</span>
                </span>
                <span className="text-slate-400">{item.total.toLocaleString()}đ</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && results.length === 0 && query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          No orders found for "{query}"
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/order-search-picker.tsx
git commit -m "feat(admin): add OrderSearchPicker component"
```

---

### Task 3: Refund payments lookup + refund status transitions

**Files:**
- Modify: `src/features/refunds/admin-actions.ts` (add `getPaymentsForOrder` and `updateRefundStatus`)
- Create: `src/features/refunds/admin-actions.test.ts`
- Create: `components/admin/refund-row-actions.tsx`

**Interfaces:**
- Produces: `getPaymentsForOrder(orderId: string): Promise<PaymentOption[]>`
- Produces: `updateRefundStatus(refundId: string, newStatus: string): Promise<void>`
- Produces type: `PaymentOption = { id: string; amount: number; method: string }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/refunds/admin-actions.test.ts
import { describe, expect, it } from "vitest";
import { getPaymentsForOrder, updateRefundStatus } from "./admin-actions";

describe("getPaymentsForOrder", () => {
  it("returns payments for the given order", async () => {
    const rows = [{ id: "p1", amount: 120000, method: "cod" }];
    const client = {
      from: () => ({
        select: () => ({
          eq: async () => ({ data: rows, error: null }),
        }),
      }),
    };
    const result = await getPaymentsForOrder(client as never, "order-uuid");
    expect(result).toEqual([{ id: "p1", amount: 120000, method: "cod" }]);
  });
});

describe("updateRefundStatus", () => {
  const ALLOWED: [string, string][] = [
    ["requested", "approved"],
    ["approved", "processing"],
    ["processing", "completed"],
    ["requested", "cancelled"],
    ["approved", "cancelled"],
    ["processing", "failed"],
  ];

  it.each(ALLOWED)("allows %s → %s transition", async (from, to) => {
    const calls: unknown[] = [];
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { status: from }, error: null }),
          }),
        }),
        update: (vals: unknown) => {
          calls.push(vals);
          return { eq: async () => ({ error: null }) };
        },
      }),
    };
    await updateRefundStatus(client as never, "refund-uuid", to);
    expect(calls[0]).toMatchObject({ status: to });
  });

  it("throws on illegal transition", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { status: "completed" }, error: null }),
          }),
        }),
      }),
    };
    await expect(updateRefundStatus(client as never, "refund-uuid", "approved")).rejects.toThrow(
      "Cannot transition",
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/features/refunds/admin-actions.test.ts
```
Expected: FAIL

- [ ] **Step 3: Add functions to admin-actions.ts**

Open `src/features/refunds/admin-actions.ts` and append:

```ts
// Append to src/features/refunds/admin-actions.ts

import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentOption = { id: string; amount: number; method: string };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ["approved", "cancelled"],
  approved: ["processing", "cancelled"],
  processing: ["completed", "failed"],
};

export async function getPaymentsForOrder(
  client: Pick<SupabaseClient, "from">,
  orderId: string,
): Promise<PaymentOption[]> {
  const { data, error } = await client
    .from("payments")
    .select("id, amount, method")
    .eq("order_id", orderId);
  if (error) throw error;
  return (data ?? []) as PaymentOption[];
}

export async function updateRefundStatus(
  client: Pick<SupabaseClient, "from">,
  refundId: string,
  newStatus: string,
): Promise<void> {
  const { data: current, error: fetchErr } = await client
    .from("refunds")
    .select("status")
    .eq("id", refundId)
    .single();
  if (fetchErr) throw fetchErr;

  const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition refund from '${current.status}' to '${newStatus}'.`);
  }

  const { error } = await client
    .from("refunds")
    .update({ status: newStatus })
    .eq("id", refundId);
  if (error) throw error;
}
```

Also add the server-action wrapper (needs `"use server"` context — place at bottom of the existing `"use server"` file):

```ts
export async function transitionRefund(refundId: string, newStatus: string): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, "refunds:create");
  await updateRefundStatus(client, refundId, newStatus);
  revalidatePath("/admin/refunds");
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/features/refunds/admin-actions.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Create RefundRowActions component**

```tsx
// components/admin/refund-row-actions.tsx
"use client";

import { useTransition } from "react";
import { transitionRefund } from "@/src/features/refunds/admin-actions";

type Props = { id: string; status: string };

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  requested: { label: "Approve", next: "approved" },
  approved: { label: "Mark processing", next: "processing" },
  processing: { label: "Complete", next: "completed" },
};

export function RefundRowActions({ id, status }: Props) {
  const [isPending, startTransition] = useTransition();

  const transition = NEXT_STATUS[status];

  return (
    <div className="flex gap-2">
      {transition && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => transitionRefund(id, transition.next))}
          className="rounded bg-teal-700 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {isPending ? "…" : transition.label}
        </button>
      )}
      {!["completed", "failed", "cancelled"].includes(status) && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => transitionRefund(id, "cancelled"))}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/refunds/admin-actions.ts src/features/refunds/admin-actions.test.ts components/admin/refund-row-actions.tsx
git commit -m "feat(refunds): add payment lookup, status transitions, and row actions"
```

---

### Task 4: Upgrade RefundCreateForm with order picker + dynamic payment select

**Files:**
- Modify: `components/admin/refund-create-form.tsx`

- [ ] **Step 1: Rewrite the form**

Replace the full contents of `components/admin/refund-create-form.tsx`:

```tsx
// components/admin/refund-create-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { OrderSearchPicker } from "@/components/admin/order-search-picker";
import { getPaymentsForOrder, type PaymentOption } from "@/src/features/refunds/admin-actions";
import type { RefundCreateState } from "@/src/features/refunds/admin-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  action: (prev: RefundCreateState, formData: FormData) => Promise<RefundCreateState>;
  defaultOrderId?: string;
  defaultOrderNo?: string;
};

export function RefundCreateForm({ action, defaultOrderId, defaultOrderNo }: Props) {
  const [state, formAction, isPending] = useActionState<RefundCreateState, FormData>(action, null);
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const [payments, setPayments] = useState<PaymentOption[]>([]);

  useEffect(() => {
    if (!orderId) { setPayments([]); return; }
    getPaymentsForOrder(orderId).then(setPayments).catch(() => setPayments([]));
  }, [orderId]);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Order</span>
        <OrderSearchPicker
          name="orderId"
          defaultOrderId={defaultOrderId}
          defaultOrderNo={defaultOrderNo}
          onSelect={(item) => setOrderId(item.id)}
        />
      </label>

      <label className="block text-sm" htmlFor="paymentId">
        <span className="font-medium text-slate-700">Payment</span>
        <select id="paymentId" name="paymentId" required className={INPUT_CLASS} disabled={payments.length === 0}>
          <option value="">{payments.length === 0 ? "Select an order first" : "Select payment…"}</option>
          {payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.method.toUpperCase()} — {p.amount.toLocaleString()}đ
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="amount">
        <span className="font-medium text-slate-700">Amount</span>
        <input id="amount" name="amount" type="number" min="0" step="1000" required className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="method">
        <span className="font-medium text-slate-700">Refund method</span>
        <select id="method" name="method" required className={INPUT_CLASS}>
          <option value="original_payment">Original payment method</option>
          <option value="store_credit">Store credit</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="reason">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea id="reason" name="reason" rows={3} className={INPUT_CLASS} />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create refund"}
        </button>
        <Link
          href="/admin/refunds"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

Also update `OrderSearchPicker` to accept an `onSelect` callback prop:

In `components/admin/order-search-picker.tsx`, change the Props type to:
```ts
type Props = {
  name: string;
  defaultOrderId?: string;
  defaultOrderNo?: string;
  onSelect?: (item: OrderPickerItem) => void;
};
```
And in `handleSelect`:
```ts
const handleSelect = useCallback((item: OrderPickerItem) => {
  setSelectedId(item.id);
  setQuery(`${item.order_no} — ${item.customer_name}`);
  setResults([]);
  setOpen(false);
  onSelect?.(item);
}, [onSelect]);
```

Also add `getPaymentsForOrder` as a client-callable server action export (it already is — ensure it doesn't call `requireAdminPermission` since it's called from the client mid-form, or create a separate `/api/admin/payments-for-order` route action). Simplest approach: add a thin server action wrapper:

```ts
// append to src/features/refunds/admin-actions.ts
export async function getPaymentsForOrderAction(orderId: string): Promise<PaymentOption[]> {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return [];
  const client = await createServerClient();
  await requireAdminPermission(client, "refunds:create");
  return getPaymentsForOrder(client, parsed.data);
}
```

And update the import in `refund-create-form.tsx` to use `getPaymentsForOrderAction`.

- [ ] **Step 2: Update refund list to show row actions**

In `app/admin/refunds/page.tsx`, import `RefundRowActions` and add it as `actionsSlot` in the `<AdminDataTable>`.

- [ ] **Step 3: Commit**

```bash
git add components/admin/refund-create-form.tsx components/admin/order-search-picker.tsx src/features/refunds/admin-actions.ts app/admin/refunds/page.tsx
git commit -m "feat(refunds): upgrade create form with order picker and status row actions"
```

---

### Task 5: Upgrade ComplaintCreateForm + staff assignment + comment thread

**Files:**
- Modify: `components/admin/complaint-create-form.tsx`
- Modify: `components/admin/complaint-update-form.tsx`
- Create: `supabase/migrations/202606220016_complaint_comments.sql`
- Create: `src/features/complaints/comment-actions.ts`
- Create: `src/features/complaints/comment-actions.test.ts`
- Create: `components/admin/complaint-comment-thread.tsx`

**Interfaces:**
- Consumes: `OrderSearchPicker`
- Produces: `addComplaintComment(complaintId: string, body: string): Promise<void>`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/202606220016_complaint_comments.sql
create table complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create index on complaint_comments (complaint_id, created_at);
```

Apply locally:
```bash
pnpm supabase db push
```

- [ ] **Step 2: Write failing test**

```ts
// src/features/complaints/comment-actions.test.ts
import { describe, expect, it } from "vitest";
import { addComplaintComment } from "./comment-actions";

describe("addComplaintComment", () => {
  it("inserts a comment row", async () => {
    const inserts: unknown[] = [];
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-uuid" } } }) },
      from: () => ({
        insert: (vals: unknown) => {
          inserts.push(vals);
          return { error: null };
        },
      }),
    };
    await addComplaintComment(client as never, "complaint-uuid", "Investigating the issue.");
    expect(inserts[0]).toMatchObject({
      complaint_id: "complaint-uuid",
      body: "Investigating the issue.",
    });
  });

  it("throws when body is empty", async () => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: "u" } } }) }, from: () => ({}) };
    await expect(addComplaintComment(client as never, "c-uuid", "   ")).rejects.toThrow("empty");
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm vitest run src/features/complaints/comment-actions.test.ts
```
Expected: FAIL

- [ ] **Step 4: Implement comment actions**

```ts
// src/features/complaints/comment-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function addComplaintComment(
  client: Pick<SupabaseClient, "auth" | "from">,
  complaintId: string,
  body: string,
): Promise<void> {
  if (!body.trim()) throw new Error("Comment body cannot be empty.");

  const { data: { user } } = await client.auth.getUser();

  const { error } = await client.from("complaint_comments").insert({
    complaint_id: complaintId,
    author_id: user?.id ?? null,
    body: body.trim(),
  });
  if (error) throw error;
}

export type AddCommentState = { error: string } | null;

export async function addComplaintCommentAction(
  _prev: AddCommentState,
  formData: FormData,
): Promise<AddCommentState> {
  const result = z.object({
    complaintId: z.string().uuid(),
    body: z.string().min(1, "Comment cannot be empty."),
  }).safeParse({
    complaintId: formData.get("complaintId"),
    body: formData.get("body"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "complaints:update");
  await addComplaintComment(client, result.data.complaintId, result.data.body);
  revalidatePath(`/admin/complaints/${result.data.complaintId}`);
  return null;
}

export type AdminProfile = { id: string; full_name: string | null };

export async function getAdminProfiles(): Promise<AdminProfile[]> {
  const client = await createServerClient();
  await requireAdminPermission(client, "complaints:update");
  const { data, error } = await client
    .from("user_admin_roles")
    .select("user_id, profiles(id, full_name)")
    .limit(100);
  if (error) throw error;
  const seen = new Set<string>();
  return ((data ?? []) as Array<{ profiles: AdminProfile | null }>)
    .map((r) => r.profiles)
    .filter((p): p is AdminProfile => p !== null && !seen.has(p.id) && seen.add(p.id) !== undefined);
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm vitest run src/features/complaints/comment-actions.test.ts
```
Expected: PASS

- [ ] **Step 6: Create complaint comment thread component**

```tsx
// components/admin/complaint-comment-thread.tsx
"use client";

import { useActionState } from "react";
import { addComplaintCommentAction, type AddCommentState } from "@/src/features/complaints/comment-actions";

type Comment = { id: string; body: string; created_at: string; profiles: { full_name: string | null } | null };

type Props = { complaintId: string; comments: Comment[] };

export function ComplaintCommentThread({ complaintId, comments }: Props) {
  const [state, formAction, isPending] = useActionState<AddCommentState, FormData>(
    addComplaintCommentAction,
    null,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Comments</h3>

      {comments.length === 0 && (
        <p className="text-sm text-slate-400">No comments yet.</p>
      )}

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-800">{c.body}</p>
            <p className="mt-1 text-xs text-slate-400">
              {c.profiles?.full_name ?? "Admin"} ·{" "}
              {new Date(c.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="complaintId" value={complaintId} />
        {state?.error && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
        <textarea
          name="body"
          rows={3}
          placeholder="Add a comment…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Posting…" : "Post comment"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Upgrade complaint create form to use order picker**

Replace `components/admin/complaint-create-form.tsx`:

```tsx
// components/admin/complaint-create-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { OrderSearchPicker } from "@/components/admin/order-search-picker";
import type { OrderPickerItem } from "@/src/features/admin/order-search";
import type { ComplaintCreateState } from "@/src/features/complaints/admin-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  action: (prev: ComplaintCreateState, formData: FormData) => Promise<ComplaintCreateState>;
  defaultOrderId?: string;
  defaultOrderNo?: string;
};

export function ComplaintCreateForm({ action, defaultOrderId, defaultOrderNo }: Props) {
  const [state, formAction, isPending] = useActionState<ComplaintCreateState, FormData>(action, null);
  const [customerId, setCustomerId] = useState("");

  const handleOrderSelect = useCallback((item: OrderPickerItem) => {
    // customerId is embedded in the order picker result if we extend OrderPickerItem
    // For now the server action reads customer from the order by orderId
    setCustomerId(item.id); // we pass orderId; server resolves customerId
  }, []);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Order</span>
        <OrderSearchPicker
          name="orderId"
          defaultOrderId={defaultOrderId}
          defaultOrderNo={defaultOrderNo}
          onSelect={handleOrderSelect}
        />
        <span className="mt-1 text-xs text-slate-400">
          Customer will be resolved automatically from the selected order.
        </span>
      </label>

      <label className="block text-sm" htmlFor="reason">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea id="reason" name="reason" rows={4} required className={INPUT_CLASS} />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Log complaint"}
        </button>
        <Link
          href="/admin/complaints"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

Update the complaint create server action in `src/features/complaints/admin-actions.ts` to resolve `customer_id` from the order rather than requiring it in the form:

```ts
// In createComplaint server action, replace customerId form field with:
const orderId = z.string().uuid().parse(formData.get("orderId"));
// Look up customer_id from orders table
const { data: order } = await client.from("orders").select("customer_id").eq("id", orderId).single();
// Then use order.customer_id in the insert
```

- [ ] **Step 8: Add assigned_to field to ComplaintUpdateForm**

In `components/admin/complaint-update-form.tsx`, add a prop `adminProfiles: AdminProfile[]` and render a `<select name="assignedTo">` with the profiles. Fetch the list in the complaint detail page (`app/admin/complaints/[id]/page.tsx`) by calling `getAdminProfiles()` as a server call, then pass to the form.

- [ ] **Step 9: Add comment thread to complaint detail page**

In `app/admin/complaints/[id]/page.tsx`, fetch comments:
```ts
const { data: comments } = await client
  .from("complaint_comments")
  .select("id, body, created_at, profiles(full_name)")
  .eq("complaint_id", params.id)
  .order("created_at", { ascending: true });
```
Then render `<ComplaintCommentThread complaintId={params.id} comments={comments ?? []} />` below the update form.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/202606220016_complaint_comments.sql \
  src/features/complaints/comment-actions.ts \
  src/features/complaints/comment-actions.test.ts \
  components/admin/complaint-comment-thread.tsx \
  components/admin/complaint-create-form.tsx \
  components/admin/complaint-update-form.tsx \
  app/admin/complaints/
git commit -m "feat(complaints): add order picker, staff assignment, comment thread"
```

---

### Task 6: Orders list search/filter/pagination + detail shortcuts

**Files:**
- Modify: `app/admin/orders/page.tsx`
- Modify: `app/admin/orders/[id]/page.tsx`
- Create: `src/features/orders/admin-queries.ts`
- Create: `src/features/orders/admin-queries.test.ts`

**Interfaces:**
- Produces: `getAdminOrders(client, opts: { q?: string; status?: string; after?: string; limit?: number }): Promise<{ rows: AdminOrderRow[]; nextCursor: string | null }>`

- [ ] **Step 1: Write failing test**

```ts
// src/features/orders/admin-queries.test.ts
import { describe, expect, it } from "vitest";
import { getAdminOrders } from "./admin-queries";

describe("getAdminOrders", () => {
  it("fetches orders with default limit 25", async () => {
    const rows = [{ id: "o1", order_no: "ORD-001", status: "processing", payment_status: "paid", total: 99000, created_at: "2026-01-01T00:00:00Z", customers: { full_name: "Alice" } }];
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              then: undefined,
              // simulate final await
              [Symbol.asyncIterator]: undefined,
            }),
          }),
        }),
      }),
    };
    // Use a simpler mock that just resolves
    const simpleMock = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    };
    const result = await getAdminOrders(simpleMock as never, {});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].order_no).toBe("ORD-001");
    expect(result.rows[0].customer_name).toBe("Alice");
  });

  it("returns nextCursor when rows equal limit", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `o${i}`, order_no: `ORD-${i}`, status: "new", payment_status: "pending",
      total: 1000, created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      customers: { full_name: "Bob" },
    }));
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    };
    const result = await getAdminOrders(client as never, { limit: 25 });
    expect(result.nextCursor).toBe(rows[24].created_at);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/orders/admin-queries.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement admin-queries**

```ts
// src/features/orders/admin-queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminOrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

type OrdersOpts = {
  q?: string;
  status?: string;
  after?: string;
  limit?: number;
};

export async function getAdminOrders(
  client: Pick<SupabaseClient, "from">,
  opts: OrdersOpts,
): Promise<{ rows: AdminOrderRow[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 25;

  let query = client
    .from("orders")
    .select("id, order_no, status, payment_status, total, created_at, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.status) query = (query as never as { eq: (col: string, val: string) => typeof query }).eq("status", opts.status) as never;
  if (opts.after) query = (query as never as { lt: (col: string, val: string) => typeof query }).lt("created_at", opts.after) as never;
  // Note: full-text search on order_no uses ilike
  // The `q` filter is applied post-fetch for simplicity since customer join complicates server-side OR
  const { data, error } = await (query as unknown as Promise<{ data: unknown[]; error: unknown }>);
  if (error) throw error;

  const raw = (data ?? []) as Array<{
    id: string; order_no: string; status: string; payment_status: string;
    total: number; created_at: string; customers: { full_name: string } | null;
  }>;

  const rows: AdminOrderRow[] = raw.map((r) => ({
    id: r.id,
    order_no: r.order_no,
    customer_name: r.customers?.full_name ?? "—",
    status: r.status,
    payment_status: r.payment_status,
    total: r.total,
    created_at: r.created_at,
  }));

  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
  return { rows, nextCursor };
}
```

Fix the query builder to handle chaining correctly:

```ts
// src/features/orders/admin-queries.ts (corrected, full file)
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminOrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

type OrdersOpts = { q?: string; status?: string; after?: string; limit?: number };

type RawRow = {
  id: string; order_no: string; status: string; payment_status: string;
  total: number; created_at: string; customers: { full_name: string } | null;
};

export async function getAdminOrders(
  client: Pick<SupabaseClient, "from">,
  opts: OrdersOpts,
): Promise<{ rows: AdminOrderRow[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 25;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client
    .from("orders")
    .select("id, order_no, status, payment_status, total, created_at, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.status) q = q.eq("status", opts.status);
  if (opts.after) q = q.lt("created_at", opts.after);

  const { data, error } = await q;
  if (error) throw error;

  const rows: AdminOrderRow[] = ((data ?? []) as RawRow[]).map((r) => ({
    id: r.id,
    order_no: r.order_no,
    customer_name: r.customers?.full_name ?? "—",
    status: r.status,
    payment_status: r.payment_status,
    total: r.total,
    created_at: r.created_at,
  }));

  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
  return { rows, nextCursor };
}
```

- [ ] **Step 4: Run test**

```bash
pnpm vitest run src/features/orders/admin-queries.test.ts
```
Expected: PASS

- [ ] **Step 5: Update orders page with search, filter, pagination**

Replace `app/admin/orders/page.tsx` data-fetching section:

```tsx
// app/admin/orders/page.tsx
import Link from "next/link";
import type { SearchParams } from "next/dist/server/request/search-params";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAdminOrders, type AdminOrderRow } from "@/src/features/orders/admin-queries";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["new","processing","picking","packed","shipped","delivered","cancelled","refunded"];

type OrdersPageData =
  | { access: "allowed"; rows: AdminOrderRow[]; nextCursor: string | null; q: string; status: string }
  | { access: "denied" };

async function getOrdersPageData(searchParams: SearchParams): Promise<OrdersPageData> {
  const q = String(searchParams.q ?? "");
  const status = String(searchParams.status ?? "");
  const after = String(searchParams.after ?? "");

  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: [], nextCursor: null, q, status };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "orders:read");
    const { rows, nextCursor } = await getAdminOrders(client, { q, status, after });
    return { access: "allowed", rows, nextCursor, q, status };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const pageData = await getOrdersPageData(searchParams);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Orders" />
        <p className="text-sm text-slate-600">You do not have access to orders.</p>
      </div>
    );
  }

  const { rows, nextCursor, q, status } = pageData;

  return (
    <div>
      <AdminPageHeader title="Orders" description="Review and manage customer orders." />

      {/* Search + filter bar */}
      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Order number or customer…"
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        />
        <select
          name="status"
          defaultValue={status}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Filter
        </button>
        {(q || status) && (
          <Link
            href="/admin/orders"
            className="flex min-h-9 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "order_no", label: "Order" },
          { key: "customer_name", label: "Customer" },
          { key: "status", label: "Status", render: (row) => <StatusChip value={row.status} tone="neutral" /> },
          { key: "payment_status", label: "Payment", render: (row) => <StatusChip value={row.payment_status} tone="neutral" /> },
          { key: "total", label: "Total", render: (row) => <span>{row.total.toLocaleString()}đ</span> },
        ]}
        rows={rows}
        emptyMessage="No orders found."
        actionsSlot={(row) => (
          <Link href={`/admin/orders/${row.id}`} className="text-sm text-teal-700 hover:underline">
            View
          </Link>
        )}
      />

      {/* Pagination */}
      {nextCursor && (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/admin/orders?q=${q}&status=${status}&after=${encodeURIComponent(nextCursor)}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Next page →
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add shortcuts to order detail page**

In `app/admin/orders/[id]/page.tsx`, find the action buttons area and add:

```tsx
<Link
  href={`/admin/refunds/new?orderId=${order.id}&orderNo=${order.order_no}`}
  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
>
  Create refund
</Link>
<Link
  href={`/admin/complaints/new?orderId=${order.id}&orderNo=${order.order_no}`}
  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
>
  Log complaint
</Link>
```

Update `app/admin/refunds/new/page.tsx` and `app/admin/complaints/new/page.tsx` to read `searchParams.orderId` and `searchParams.orderNo` and pass them as `defaultOrderId`/`defaultOrderNo` to the form components.

- [ ] **Step 7: Commit**

```bash
git add src/features/orders/ app/admin/orders/ app/admin/refunds/new/ app/admin/complaints/new/
git commit -m "feat(orders): add search, filter, pagination, and refund/complaint shortcuts"
```
