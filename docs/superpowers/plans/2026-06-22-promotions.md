# Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the promotions DB table and build full admin CRUD so operators can create, activate, and expire discount codes.

**Architecture:** A migration creates the `promotions` table with `promotion_type` and `promotion_status` enums. Server actions live in `src/features/promotions/admin-actions.ts`. The form handles all four promotion types with a value field whose label adapts based on the selected type. The promotion list page uses `AdminDataTable` with status chip and type badge.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + JS client), TypeScript, Zod, React `useActionState`, Tailwind CSS, Vitest

## Global Constraints
- Use `createServerClient()` from `@/src/lib/supabase/server` for all DB access
- Use `requireAdminPermission(client, "promotions:update")` for every admin action
- Form components must use `useActionState` hook pattern
- All Zod validation errors surface as `{ error: string }` return from server actions
- Tests use vitest, mock the Supabase client as a plain JS object (no real DB)
- Run tests with `pnpm vitest run <path>`
- CSS: use existing INPUT_CLASS pattern, `bg-teal-700 text-white` for primary buttons
- `export const dynamic = "force-dynamic"` on all admin page components

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/202606220016_promotions.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `promotions` table, `promotion_type` enum, `promotion_status` enum

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/202606220016_promotions.sql

create type promotion_type as enum (
  'percentage_off',
  'fixed_off',
  'free_shipping',
  'buy_x_get_y'
);

create type promotion_status as enum (
  'draft',
  'active',
  'expired',
  'disabled'
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  type promotion_type not null,
  value numeric(12,2) not null default 0,
  min_order_amount numeric(12,2),
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  status promotion_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_promotions_code on promotions(code);
create index idx_promotions_status on promotions(status);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```
Expected: migration applied with no errors. If running locally: `npx supabase migration up`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/202606220016_promotions.sql
git commit -m "feat(db): add promotions table and enums"
```

---

### Task 2: Promotions server actions + tests

**Files:**
- Create: `src/features/promotions/admin-actions.ts`
- Create: `src/features/promotions/admin-actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `PromotionState`, `createPromotion`, `updatePromotion`, `deletePromotion`

- [ ] **Step 1: Write the tests**

```ts
// src/features/promotions/admin-actions.test.ts
import { describe, it, expect } from "vitest";
import { createPromotion, updatePromotion } from "./admin-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const validPromoFields = {
  code: "SAVE10",
  name: "10% Off",
  description: "",
  type: "percentage_off",
  value: "10",
  minOrderAmount: "",
  maxUses: "",
  startsAt: "",
  endsAt: "",
  status: "draft",
};

describe("createPromotion (validation)", () => {
  it("returns error when code is empty", async () => {
    const fd = makeFormData({ ...validPromoFields, code: "" });
    const result = await createPromotion(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when code has lowercase letters", async () => {
    const fd = makeFormData({ ...validPromoFields, code: "save10" });
    const result = await createPromotion(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("uppercase") });
  });

  it("returns error when name is empty", async () => {
    const fd = makeFormData({ ...validPromoFields, name: "" });
    const result = await createPromotion(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when value is negative", async () => {
    const fd = makeFormData({ ...validPromoFields, value: "-5" });
    const result = await createPromotion(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("returns error when ends_at is before starts_at", async () => {
    const fd = makeFormData({
      ...validPromoFields,
      startsAt: "2026-12-01T00:00",
      endsAt: "2026-11-01T00:00",
    });
    const result = await createPromotion(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("after") });
  });
});

describe("updatePromotion (validation)", () => {
  it("returns error when id is not a uuid", async () => {
    const fd = makeFormData({ ...validPromoFields, id: "not-a-uuid" });
    const result = await updatePromotion(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm vitest run src/features/promotions/admin-actions.test.ts
```
Expected: FAIL — "Cannot find module './admin-actions'"

- [ ] **Step 3: Create admin-actions.ts**

```ts
// src/features/promotions/admin-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type PromotionState = { error: string } | null;

const PROMOTION_TYPES = ["percentage_off", "fixed_off", "free_shipping", "buy_x_get_y"] as const;
const PROMOTION_STATUSES = ["draft", "active", "expired", "disabled"] as const;

const promotionSchema = z
  .object({
    code: z
      .string()
      .min(1, "Code is required")
      .regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, digits, and hyphens only"),
    name: z.string().min(1, "Name is required"),
    description: z.string(),
    type: z.enum(PROMOTION_TYPES),
    value: z.coerce.number().min(0, "Value cannot be negative"),
    minOrderAmount: z.coerce.number().min(0).nullable(),
    maxUses: z.coerce.number().int().min(1).nullable(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    status: z.enum(PROMOTION_STATUSES),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["endsAt"] },
  );

const promotionUpdateSchema = promotionSchema.extend({ id: z.string().uuid() });

function parseNullableNumber(val: FormDataEntryValue | null): number | null {
  if (!val || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseNullableString(val: FormDataEntryValue | null): string | null {
  if (!val || val === "") return null;
  return String(val);
}

export async function createPromotion(
  _prev: PromotionState,
  formData: FormData,
): Promise<PromotionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "promotions:update");

  const result = promotionSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    value: formData.get("value") ?? 0,
    minOrderAmount: parseNullableNumber(formData.get("minOrderAmount")),
    maxUses: parseNullableNumber(formData.get("maxUses")),
    startsAt: parseNullableString(formData.get("startsAt")),
    endsAt: parseNullableString(formData.get("endsAt")),
    status: formData.get("status"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("promotions").insert({
    code: result.data.code,
    name: result.data.name,
    description: result.data.description || null,
    type: result.data.type,
    value: result.data.value,
    min_order_amount: result.data.minOrderAmount,
    max_uses: result.data.maxUses,
    starts_at: result.data.startsAt ? new Date(result.data.startsAt).toISOString() : null,
    ends_at: result.data.endsAt ? new Date(result.data.endsAt).toISOString() : null,
    status: result.data.status,
  });

  if (error) {
    if (error.code === "23505") return { error: "A promotion with this code already exists." };
    throw error;
  }

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function updatePromotion(
  _prev: PromotionState,
  formData: FormData,
): Promise<PromotionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "promotions:update");

  const result = promotionUpdateSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    value: formData.get("value") ?? 0,
    minOrderAmount: parseNullableNumber(formData.get("minOrderAmount")),
    maxUses: parseNullableNumber(formData.get("maxUses")),
    startsAt: parseNullableString(formData.get("startsAt")),
    endsAt: parseNullableString(formData.get("endsAt")),
    status: formData.get("status"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("promotions")
    .update({
      code: result.data.code,
      name: result.data.name,
      description: result.data.description || null,
      type: result.data.type,
      value: result.data.value,
      min_order_amount: result.data.minOrderAmount,
      max_uses: result.data.maxUses,
      starts_at: result.data.startsAt ? new Date(result.data.startsAt).toISOString() : null,
      ends_at: result.data.endsAt ? new Date(result.data.endsAt).toISOString() : null,
      status: result.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function deletePromotion(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid promotion id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "promotions:update");

  const { error } = await client.from("promotions").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/promotions");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/promotions/admin-actions.test.ts
```
Expected: PASS (all 5 validation tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/features/promotions/admin-actions.ts src/features/promotions/admin-actions.test.ts
git commit -m "feat(admin): add promotion server actions with date validation"
```

---

### Task 3: Promotion list page

**Files:**
- Create: `app/admin/promotions/page.tsx`
- Create: `components/admin/promotion-row-actions.tsx`

**Interfaces:**
- Consumes: `deletePromotion` from `@/src/features/promotions/admin-actions`
- Produces: `/admin/promotions` route

- [ ] **Step 1: Create row actions**

```tsx
// components/admin/promotion-row-actions.tsx
"use client";

import Link from "next/link";
import { deletePromotion } from "@/src/features/promotions/admin-actions";

export function PromotionRowActions({ id, code }: { id: string; code: string }) {
  async function handleDelete() {
    if (!confirm(`Delete promotion "${code}"? This cannot be undone.`)) return;
    await deletePromotion(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/promotions/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create list page**

```tsx
// app/admin/promotions/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { PromotionRowActions } from "@/components/admin/promotion-row-actions";

export const dynamic = "force-dynamic";

type PromotionRow = {
  id: string; code: string; name: string; type: string;
  status: string; used_count: number; ends_at: string | null;
};
type PageData = { access: "allowed"; promotions: PromotionRow[] } | { access: "denied" };

function getStatusTone(status: string): StatusChipTone {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "expired" || status === "disabled") return "neutral";
  return "neutral";
}

const TYPE_LABELS: Record<string, string> = {
  percentage_off: "% Off",
  fixed_off: "Fixed off",
  free_shipping: "Free shipping",
  buy_x_get_y: "Buy X get Y",
};

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", promotions: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "promotions:update");
    const { data, error } = await client
      .from("promotions")
      .select("id, code, name, type, status, used_count, ends_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { access: "allowed", promotions: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminPromotionsPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Promotions" />
        <p className="text-sm text-slate-600">You do not have access to promotions.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Promotions"
        description="Create and manage discount codes and promotional campaigns."
        action={
          <Link
            href="/admin/promotions/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New promotion
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          {
            key: "type",
            label: "Type",
            render: (row) => <span className="text-sm">{TYPE_LABELS[row.type] ?? row.type}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusChip value={row.status} tone={getStatusTone(row.status)} />,
          },
          { key: "used_count", label: "Uses" },
          {
            key: "ends_at",
            label: "Expires",
            render: (row) => (
              <span className="text-sm text-slate-500">
                {row.ends_at ? new Date(row.ends_at).toLocaleDateString("vi-VN") : "—"}
              </span>
            ),
          },
        ]}
        rows={pageData.promotions}
        emptyMessage="No promotions yet."
        actionsSlot={(row) => <PromotionRowActions id={row.id} code={row.code} />}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/promotions/page.tsx components/admin/promotion-row-actions.tsx
git commit -m "feat(admin): add promotion list page"
```

---

### Task 4: Promotion form component

**Files:**
- Create: `components/admin/promotion-form.tsx`

**Interfaces:**
- Consumes: `PromotionState` from `@/src/features/promotions/admin-actions`
- Produces: `PromotionForm` component used in Tasks 5 & 6

- [ ] **Step 1: Create promotion-form.tsx**

```tsx
// components/admin/promotion-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { PromotionState } from "@/src/features/promotions/admin-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const VALUE_LABEL: Record<string, string> = {
  percentage_off: "Discount percentage (e.g. 10 for 10% off)",
  fixed_off: "Fixed amount off (VND)",
  free_shipping: "Value (set to 0 — shipping is free regardless)",
  buy_x_get_y: "Number of items customer must buy (X)",
};

type PromotionFormProps = {
  action: (prev: PromotionState, formData: FormData) => Promise<PromotionState>;
  initialValues?: {
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    value: number;
    minOrderAmount: number | null;
    maxUses: number | null;
    startsAt: string | null;
    endsAt: string | null;
    status: string;
  };
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function PromotionForm({ action, initialValues }: PromotionFormProps) {
  const [state, formAction, isPending] = useActionState<PromotionState, FormData>(action, null);
  const isEdit = Boolean(initialValues);
  const [promoType, setPromoType] = useState(initialValues?.type ?? "percentage_off");

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="code">
        <span className="font-medium text-slate-700">Promo code</span>
        <span className="ml-1 text-xs text-slate-400">(uppercase, e.g. SUMMER20)</span>
        <input
          id="code"
          name="code"
          required
          defaultValue={initialValues?.code}
          className={INPUT_CLASS}
          style={{ textTransform: "uppercase" }}
        />
      </label>

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Internal name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="description">
        <span className="font-medium text-slate-700">Description</span>
        <textarea id="description" name="description" rows={2} defaultValue={initialValues?.description} className={`${INPUT_CLASS} py-2`} />
      </label>

      <label className="block text-sm" htmlFor="type">
        <span className="font-medium text-slate-700">Promotion type</span>
        <select
          id="type"
          name="type"
          defaultValue={initialValues?.type ?? "percentage_off"}
          onChange={(e) => setPromoType(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="percentage_off">Percentage off</option>
          <option value="fixed_off">Fixed amount off</option>
          <option value="free_shipping">Free shipping</option>
          <option value="buy_x_get_y">Buy X get Y</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="value">
        <span className="font-medium text-slate-700">{VALUE_LABEL[promoType] ?? "Value"}</span>
        <input
          id="value"
          name="value"
          type="number"
          min={0}
          step={promoType === "percentage_off" ? "0.01" : "1"}
          required
          defaultValue={initialValues?.value ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="minOrderAmount">
        <span className="font-medium text-slate-700">Minimum order amount (VND)</span>
        <span className="ml-1 text-xs text-slate-400">(leave empty for no minimum)</span>
        <input
          id="minOrderAmount"
          name="minOrderAmount"
          type="number"
          min={0}
          defaultValue={initialValues?.minOrderAmount ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="maxUses">
        <span className="font-medium text-slate-700">Maximum uses</span>
        <span className="ml-1 text-xs text-slate-400">(leave empty for unlimited)</span>
        <input
          id="maxUses"
          name="maxUses"
          type="number"
          min={1}
          defaultValue={initialValues?.maxUses ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm" htmlFor="startsAt">
          <span className="font-medium text-slate-700">Starts at</span>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(initialValues?.startsAt)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm" htmlFor="endsAt">
          <span className="font-medium text-slate-700">Ends at</span>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(initialValues?.endsAt)}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Status</span>
        <select id="status" name="status" defaultValue={initialValues?.status ?? "draft"} className={INPUT_CLASS}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="expired">Expired</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create promotion"}
        </button>
        <Link
          href="/admin/promotions"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/promotion-form.tsx
git commit -m "feat(admin): add promotion form component"
```

---

### Task 5: Promotion create page

**Files:**
- Create: `app/admin/promotions/new/page.tsx`

**Interfaces:**
- Consumes: `createPromotion` from `@/src/features/promotions/admin-actions`; `PromotionForm` from `@/components/admin/promotion-form`

- [ ] **Step 1: Create the new promotion page**

```tsx
// app/admin/promotions/new/page.tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PromotionForm } from "@/components/admin/promotion-form";
import { createPromotion } from "@/src/features/promotions/admin-actions";

export const dynamic = "force-dynamic";

export default function NewPromotionPage() {
  return (
    <div>
      <AdminPageHeader title="New promotion" />
      <PromotionForm action={createPromotion} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/promotions/new/page.tsx
git commit -m "feat(admin): add promotion create page"
```

---

### Task 6: Promotion edit page

**Files:**
- Create: `app/admin/promotions/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `updatePromotion` from `@/src/features/promotions/admin-actions`; `PromotionForm` from `@/components/admin/promotion-form`

- [ ] **Step 1: Create the edit page**

```tsx
// app/admin/promotions/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PromotionForm } from "@/components/admin/promotion-form";
import { updatePromotion } from "@/src/features/promotions/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const { data, error } = await client
    .from("promotions")
    .select("id, code, name, description, type, value, min_order_amount, max_uses, starts_at, ends_at, status")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.code}`} />
      <PromotionForm
        action={updatePromotion}
        initialValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          description: data.description ?? "",
          type: data.type,
          value: Number(data.value),
          minOrderAmount: data.min_order_amount != null ? Number(data.min_order_amount) : null,
          maxUses: data.max_uses,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          status: data.status,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/promotions/[id]/edit/page.tsx
git commit -m "feat(admin): add promotion edit page"
```

---

### Task 7: Update admin navigation

**Files:**
- Modify: `components/admin/admin-nav.tsx`

- [ ] **Step 1: Add Promotions to nav**

Replace the `adminLinks` array in `components/admin/admin-nav.tsx` (add after Content, before Customers):

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
git commit -m "feat(admin): add promotions to admin nav"
```
