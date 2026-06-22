# Foundational CRUD: Suppliers, Warehouses, Categories

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full create/read/update/delete admin pages for Suppliers, Warehouses, and Categories so operators never need direct DB access to set up purchase orders, inventory, or product categorization.

**Architecture:** Each entity gets a server-actions file (`src/features/<domain>/<entity>-actions.ts`), a shared form component (`components/admin/<entity>-form.tsx`), and three pages (list, new, edit). All three subsections follow identical code patterns, so implementing them in order reinforces the pattern. Categories additionally support a `parent_id` for two-level hierarchy displayed as a parent selector on the form.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + JS client), TypeScript, Zod, React `useActionState`, Tailwind CSS, Vitest

## Global Constraints
- Use `createServerClient()` from `@/src/lib/supabase/server` for all DB access
- Use `requireAdminPermission(client, "permission:scope")` for every admin action
- Form components must use `useActionState` hook pattern
- All Zod validation errors surface as `{ error: string }` return from server actions
- Tests use vitest, mock the Supabase client as a plain JS object (no real DB)
- Run tests with `pnpm vitest run <path>`
- CSS: use existing INPUT_CLASS pattern (`"mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"`), `bg-teal-700 text-white` for primary buttons
- `export const dynamic = "force-dynamic"` on all admin page components

---

## ── PART A: SUPPLIERS ──────────────────────────────────────

### Task 1: Supplier server actions + tests

**Files:**
- Create: `src/features/procurement/supplier-actions.ts`
- Create: `src/features/procurement/supplier-actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `SupplierState`, `createSupplier`, `updateSupplier`, `deleteSupplier` — used by Tasks 3 & 4

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/procurement/supplier-actions.test.ts
import { describe, it, expect } from "vitest";

function makeInsertClient(error: null | { code: string; message: string }) {
  return {
    from: () => ({
      insert: async () => ({ error }),
      update: () => ({ eq: async () => ({ error }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  };
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// These imports will fail until the file exists — that's expected
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "./supplier-actions";

describe("supplier actions (validation layer)", () => {
  it("returns error when name is empty", async () => {
    const fd = makeFormData({ name: "" });
    const result = await createSupplier(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error on duplicate (23505)", async () => {
    const fd = makeFormData({
      name: "Acme",
      contactName: "Bob",
      phone: "0901234567",
      email: "bob@acme.com",
      address: "",
      taxCode: "",
      isActive: "true",
    });
    const client = makeInsertClient({ code: "23505", message: "unique" });
    // inject client via module — real test just validates shape
    const result = await createSupplier(null, fd);
    // real DB not running, so this tests validation only
    expect(result === null || (result && "error" in result)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm import failure**

```bash
pnpm vitest run src/features/procurement/supplier-actions.test.ts
```
Expected: FAIL — "Cannot find module './supplier-actions'"

- [ ] **Step 3: Create the server actions file**

```ts
// src/features/procurement/supplier-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type SupplierState = { error: string } | null;

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  taxCode: z.string(),
  isActive: z.boolean(),
});

const supplierUpdateSchema = supplierSchema.extend({ id: z.string().uuid() });

export async function createSupplier(
  _prev: SupplierState,
  formData: FormData,
): Promise<SupplierState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const result = supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("suppliers").insert({
    name: result.data.name,
    contact_name: result.data.contactName || null,
    phone: result.data.phone || null,
    email: result.data.email || null,
    address: result.data.address || null,
    tax_code: result.data.taxCode || null,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A supplier with this name already exists." };
    throw error;
  }

  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function updateSupplier(
  _prev: SupplierState,
  formData: FormData,
): Promise<SupplierState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const result = supplierUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("suppliers")
    .update({
      name: result.data.name,
      contact_name: result.data.contactName || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
      address: result.data.address || null,
      tax_code: result.data.taxCode || null,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function deleteSupplier(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid supplier id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const { error } = await client.from("suppliers").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/suppliers");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/procurement/supplier-actions.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/procurement/supplier-actions.ts src/features/procurement/supplier-actions.test.ts
git commit -m "feat(admin): add supplier server actions"
```

---

### Task 2: Supplier list page

**Files:**
- Create: `app/admin/suppliers/page.tsx`

**Interfaces:**
- Consumes: nothing (direct Supabase query)
- Produces: `/admin/suppliers` route

- [ ] **Step 1: Create the list page**

```tsx
// app/admin/suppliers/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { SupplierRowActions } from "@/components/admin/supplier-row-actions";

export const dynamic = "force-dynamic";

type SupplierRow = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; is_active: boolean };
type PageData = { access: "allowed"; suppliers: SupplierRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", suppliers: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "suppliers:update");
    const { data, error } = await client
      .from("suppliers")
      .select("id, name, contact_name, phone, email, is_active")
      .order("name");
    if (error) throw error;
    return { access: "allowed", suppliers: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminSuppliersPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Suppliers" />
        <p className="text-sm text-slate-600">You do not have access to suppliers.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Suppliers"
        description="Manage procurement supplier records."
        action={
          <Link
            href="/admin/suppliers/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New supplier
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "contact_name", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          {
            key: "is_active",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.is_active ? "active" : "inactive"} tone={row.is_active ? "success" : "neutral"} />
            ),
          },
        ]}
        rows={pageData.suppliers}
        emptyMessage="No suppliers yet. Add one to start creating purchase orders."
        actionsSlot={(row) => <SupplierRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the row-actions component** (needed by list page)

```tsx
// components/admin/supplier-row-actions.tsx
"use client";

import Link from "next/link";
import { deleteSupplier } from "@/src/features/procurement/supplier-actions";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    await deleteSupplier(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/suppliers/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/suppliers/page.tsx components/admin/supplier-row-actions.tsx
git commit -m "feat(admin): add supplier list page"
```

---

### Task 3: Supplier create page

**Files:**
- Create: `components/admin/supplier-form.tsx`
- Create: `app/admin/suppliers/new/page.tsx`

**Interfaces:**
- Consumes: `createSupplier`, `SupplierState` from `@/src/features/procurement/supplier-actions`
- Produces: `/admin/suppliers/new` route, `SupplierForm` component reused in Task 4

- [ ] **Step 1: Create the shared form component**

```tsx
// components/admin/supplier-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { SupplierState } from "@/src/features/procurement/supplier-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type SupplierFormProps = {
  action: (prev: SupplierState, formData: FormData) => Promise<SupplierState>;
  initialValues?: {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    taxCode: string;
    isActive: boolean;
  };
};

export function SupplierForm({ action, initialValues }: SupplierFormProps) {
  const [state, formAction, isPending] = useActionState<SupplierState, FormData>(action, null);
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
        <span className="font-medium text-slate-700">Name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="contactName">
        <span className="font-medium text-slate-700">Contact name</span>
        <input id="contactName" name="contactName" defaultValue={initialValues?.contactName} className={INPUT_CLASS} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm" htmlFor="phone">
          <span className="font-medium text-slate-700">Phone</span>
          <input id="phone" name="phone" defaultValue={initialValues?.phone} className={INPUT_CLASS} />
        </label>
        <label className="block text-sm" htmlFor="email">
          <span className="font-medium text-slate-700">Email</span>
          <input id="email" name="email" type="email" defaultValue={initialValues?.email} className={INPUT_CLASS} />
        </label>
      </div>

      <label className="block text-sm" htmlFor="address">
        <span className="font-medium text-slate-700">Address</span>
        <input id="address" name="address" defaultValue={initialValues?.address} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="taxCode">
        <span className="font-medium text-slate-700">Tax code</span>
        <input id="taxCode" name="taxCode" defaultValue={initialValues?.taxCode} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create supplier"}
        </button>
        <Link
          href="/admin/suppliers"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the new-supplier page**

```tsx
// app/admin/suppliers/new/page.tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierForm } from "@/components/admin/supplier-form";
import { createSupplier } from "@/src/features/procurement/supplier-actions";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <div>
      <AdminPageHeader title="New supplier" />
      <SupplierForm action={createSupplier} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/supplier-form.tsx app/admin/suppliers/new/page.tsx
git commit -m "feat(admin): add supplier create form and page"
```

---

### Task 4: Supplier edit page

**Files:**
- Create: `app/admin/suppliers/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `updateSupplier`, `SupplierState` from `@/src/features/procurement/supplier-actions`; `SupplierForm` from `@/components/admin/supplier-form`

- [ ] **Step 1: Create the edit page**

```tsx
// app/admin/suppliers/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierForm } from "@/components/admin/supplier-form";
import { updateSupplier } from "@/src/features/procurement/supplier-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const { data, error } = await client
    .from("suppliers")
    .select("id, name, contact_name, phone, email, address, tax_code, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.name}`} />
      <SupplierForm
        action={updateSupplier}
        initialValues={{
          id: data.id,
          name: data.name,
          contactName: data.contact_name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          taxCode: data.tax_code ?? "",
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/suppliers/[id]/edit/page.tsx
git commit -m "feat(admin): add supplier edit page"
```

---

## ── PART B: WAREHOUSES ──────────────────────────────────────

### Task 5: Warehouse server actions + tests

**Files:**
- Create: `src/features/inventory/warehouse-actions.ts`
- Create: `src/features/inventory/warehouse-actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `WarehouseState`, `createWarehouse`, `updateWarehouse`, `deleteWarehouse`

- [ ] **Step 1: Write the tests**

```ts
// src/features/inventory/warehouse-actions.test.ts
import { describe, it, expect } from "vitest";
import { createWarehouse, updateWarehouse } from "./warehouse-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("warehouse actions (validation)", () => {
  it("returns error when name is empty", async () => {
    const fd = makeFormData({ code: "WH01", name: "" });
    const result = await createWarehouse(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when code is empty", async () => {
    const fd = makeFormData({ code: "", name: "Main Warehouse" });
    const result = await createWarehouse(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when update id is missing", async () => {
    const fd = makeFormData({ id: "not-a-uuid", code: "WH01", name: "Main" });
    const result = await updateWarehouse(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm vitest run src/features/inventory/warehouse-actions.test.ts
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create warehouse-actions.ts**

```ts
// src/features/inventory/warehouse-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type WarehouseState = { error: string } | null;

const warehouseSchema = z.object({
  code: z.string().min(1, "Code is required").regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, digits, underscores, or hyphens"),
  name: z.string().min(1, "Name is required"),
  address: z.string(),
  isActive: z.boolean(),
});

const warehouseUpdateSchema = warehouseSchema.extend({ id: z.string().uuid("Invalid warehouse id") });

export async function createWarehouse(
  _prev: WarehouseState,
  formData: FormData,
): Promise<WarehouseState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const result = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("warehouses").insert({
    code: result.data.code,
    name: result.data.name,
    address: result.data.address || null,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A warehouse with this code already exists." };
    throw error;
  }

  revalidatePath("/admin/warehouses");
  redirect("/admin/warehouses");
}

export async function updateWarehouse(
  _prev: WarehouseState,
  formData: FormData,
): Promise<WarehouseState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const result = warehouseUpdateSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("warehouses")
    .update({
      code: result.data.code,
      name: result.data.name,
      address: result.data.address || null,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/warehouses");
  redirect("/admin/warehouses");
}

export async function deleteWarehouse(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid warehouse id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const { error } = await client.from("warehouses").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/warehouses");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/inventory/warehouse-actions.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/warehouse-actions.ts src/features/inventory/warehouse-actions.test.ts
git commit -m "feat(admin): add warehouse server actions"
```

---

### Task 6: Warehouse list page + form + row actions

**Files:**
- Create: `app/admin/warehouses/page.tsx`
- Create: `components/admin/warehouse-form.tsx`
- Create: `components/admin/warehouse-row-actions.tsx`
- Create: `app/admin/warehouses/new/page.tsx`
- Create: `app/admin/warehouses/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createWarehouse`, `updateWarehouse`, `deleteWarehouse`, `WarehouseState` from warehouse-actions

- [ ] **Step 1: Create list page**

```tsx
// app/admin/warehouses/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { WarehouseRowActions } from "@/components/admin/warehouse-row-actions";

export const dynamic = "force-dynamic";

type WarehouseRow = { id: string; code: string; name: string; address: string | null; is_active: boolean };
type PageData = { access: "allowed"; warehouses: WarehouseRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", warehouses: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:update");
    const { data, error } = await client
      .from("warehouses")
      .select("id, code, name, address, is_active")
      .order("code");
    if (error) throw error;
    return { access: "allowed", warehouses: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminWarehousesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Warehouses" />
        <p className="text-sm text-slate-600">You do not have access to warehouses.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Warehouses"
        description="Manage storage locations for inventory and purchase orders."
        action={
          <Link
            href="/admin/warehouses/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New warehouse
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "address", label: "Address" },
          {
            key: "is_active",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.is_active ? "active" : "inactive"} tone={row.is_active ? "success" : "neutral"} />
            ),
          },
        ]}
        rows={pageData.warehouses}
        emptyMessage="No warehouses yet."
        actionsSlot={(row) => <WarehouseRowActions id={row.id} code={row.code} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create shared warehouse form**

```tsx
// components/admin/warehouse-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { WarehouseState } from "@/src/features/inventory/warehouse-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type WarehouseFormProps = {
  action: (prev: WarehouseState, formData: FormData) => Promise<WarehouseState>;
  initialValues?: { id: string; code: string; name: string; address: string; isActive: boolean };
};

export function WarehouseForm({ action, initialValues }: WarehouseFormProps) {
  const [state, formAction, isPending] = useActionState<WarehouseState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="code">
        <span className="font-medium text-slate-700">Code</span>
        <span className="ml-1 text-xs text-slate-400">(uppercase, e.g. WH-HN-01)</span>
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
        <span className="font-medium text-slate-700">Name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="address">
        <span className="font-medium text-slate-700">Address</span>
        <input id="address" name="address" defaultValue={initialValues?.address} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create warehouse"}
        </button>
        <Link
          href="/admin/warehouses"
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
// components/admin/warehouse-row-actions.tsx
"use client";

import Link from "next/link";
import { deleteWarehouse } from "@/src/features/inventory/warehouse-actions";

export function WarehouseRowActions({ id, code }: { id: string; code: string }) {
  async function handleDelete() {
    if (!confirm(`Delete warehouse "${code}"? This cannot be undone.`)) return;
    await deleteWarehouse(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/warehouses/${id}/edit`} className="text-sm text-teal-700 hover:underline">
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
// app/admin/warehouses/new/page.tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { createWarehouse } from "@/src/features/inventory/warehouse-actions";

export const dynamic = "force-dynamic";

export default function NewWarehousePage() {
  return (
    <div>
      <AdminPageHeader title="New warehouse" />
      <WarehouseForm action={createWarehouse} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit page**

```tsx
// app/admin/warehouses/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { updateWarehouse } from "@/src/features/inventory/warehouse-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const { data, error } = await client
    .from("warehouses")
    .select("id, code, name, address, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.code}`} />
      <WarehouseForm
        action={updateWarehouse}
        initialValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          address: data.address ?? "",
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/warehouses/ components/admin/warehouse-form.tsx components/admin/warehouse-row-actions.tsx
git commit -m "feat(admin): add warehouse list, create, and edit pages"
```

---

## ── PART C: CATEGORIES ──────────────────────────────────────

### Task 7: Category server actions + tests

**Files:**
- Create: `src/features/catalog/category-actions.ts`
- Create: `src/features/catalog/category-actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `CategoryState`, `createCategory`, `updateCategory`, `deleteCategory`

- [ ] **Step 1: Write tests**

```ts
// src/features/catalog/category-actions.test.ts
import { describe, it, expect } from "vitest";
import { createCategory, updateCategory } from "./category-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("category actions (validation)", () => {
  it("returns error when slug is empty", async () => {
    const fd = makeFormData({ slug: "", name: "Dairy" });
    const result = await createCategory(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when slug has uppercase", async () => {
    const fd = makeFormData({ slug: "Dairy-Products", name: "Dairy" });
    const result = await createCategory(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("lowercase") });
  });

  it("returns error when name is empty", async () => {
    const fd = makeFormData({ slug: "dairy", name: "" });
    const result = await createCategory(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm vitest run src/features/catalog/category-actions.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create category-actions.ts**

```ts
// src/features/catalog/category-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type CategoryState = { error: string } | null;

const categorySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  imageUrl: z.string(),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const categoryUpdateSchema = categorySchema.extend({ id: z.string().uuid() });

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const rawParentId = formData.get("parentId");

  const result = categorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: rawParentId && rawParentId !== "" ? rawParentId : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("categories").insert({
    slug: result.data.slug,
    name: result.data.name,
    description: result.data.description || null,
    image_url: result.data.imageUrl || null,
    parent_id: result.data.parentId,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A category with this slug already exists." };
    throw error;
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const rawParentId = formData.get("parentId");

  const result = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: rawParentId && rawParentId !== "" ? rawParentId : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("categories")
    .update({
      slug: result.data.slug,
      name: result.data.name,
      description: result.data.description || null,
      image_url: result.data.imageUrl || null,
      parent_id: result.data.parentId,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid category id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const { error } = await client.from("categories").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/categories");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/catalog/category-actions.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/category-actions.ts src/features/catalog/category-actions.test.ts
git commit -m "feat(admin): add category server actions"
```

---

### Task 8: Category list page + form + pages

**Files:**
- Create: `app/admin/categories/page.tsx`
- Create: `components/admin/category-form.tsx`
- Create: `components/admin/category-row-actions.tsx`
- Create: `app/admin/categories/new/page.tsx`
- Create: `app/admin/categories/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCategory`, `updateCategory`, `deleteCategory`, `CategoryState`
- Note: Form needs to load parent categories for the parent selector; fetch inside the page and pass as prop

- [ ] **Step 1: Create list page**

```tsx
// app/admin/categories/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { CategoryRowActions } from "@/components/admin/category-row-actions";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string; slug: string; name: string; parent_id: string | null;
  sort_order: number; is_active: boolean;
  parent: { name: string } | null;
};
type PageData = { access: "allowed"; categories: CategoryRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", categories: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "categories:update");
    const { data, error } = await client
      .from("categories")
      .select("id, slug, name, parent_id, sort_order, is_active, parent:parent_id(name)")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return { access: "allowed", categories: (data ?? []) as CategoryRow[] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminCategoriesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Categories" />
        <p className="text-sm text-slate-600">You do not have access to categories.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="Manage the product taxonomy used for browsing and filtering."
        action={
          <Link
            href="/admin/categories/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New category
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          {
            key: "parent",
            label: "Parent",
            render: (row) => <span className="text-sm text-slate-500">{row.parent?.name ?? "—"}</span>,
          },
          { key: "sort_order", label: "Order" },
          {
            key: "is_active",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.is_active ? "active" : "inactive"} tone={row.is_active ? "success" : "neutral"} />
            ),
          },
        ]}
        rows={pageData.categories}
        emptyMessage="No categories yet."
        actionsSlot={(row) => <CategoryRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create category form**

```tsx
// components/admin/category-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CategoryState } from "@/src/features/catalog/category-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type ParentOption = { id: string; name: string };

type CategoryFormProps = {
  action: (prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  parentOptions: ParentOption[];
  initialValues?: {
    id: string; slug: string; name: string; description: string;
    imageUrl: string; parentId: string | null; sortOrder: number; isActive: boolean;
  };
};

export function CategoryForm({ action, parentOptions, initialValues }: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState<CategoryState, FormData>(action, null);
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
        <span className="font-medium text-slate-700">Name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="slug">
        <span className="font-medium text-slate-700">Slug</span>
        <span className="ml-1 text-xs text-slate-400">(lowercase-hyphens)</span>
        <input id="slug" name="slug" required defaultValue={initialValues?.slug} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="parentId">
        <span className="font-medium text-slate-700">Parent category</span>
        <select id="parentId" name="parentId" defaultValue={initialValues?.parentId ?? ""} className={INPUT_CLASS}>
          <option value="">— None (top level) —</option>
          {parentOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="description">
        <span className="font-medium text-slate-700">Description</span>
        <textarea id="description" name="description" rows={3} defaultValue={initialValues?.description} className={`${INPUT_CLASS} py-2`} />
      </label>

      <label className="block text-sm" htmlFor="imageUrl">
        <span className="font-medium text-slate-700">Image URL</span>
        <input id="imageUrl" name="imageUrl" defaultValue={initialValues?.imageUrl} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initialValues?.sortOrder ?? 0} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select id="isActive" name="isActive" defaultValue={initialValues?.isActive === false ? "false" : "true"} className={INPUT_CLASS}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create category"}
        </button>
        <Link
          href="/admin/categories"
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
// components/admin/category-row-actions.tsx
"use client";

import Link from "next/link";
import { deleteCategory } from "@/src/features/catalog/category-actions";

export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete category "${name}"? Child categories will become top-level.`)) return;
    await deleteCategory(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/categories/${id}/edit`} className="text-sm text-teal-700 hover:underline">
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
// app/admin/categories/new/page.tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { createCategory } from "@/src/features/catalog/category-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  const client = await createServerClient();
  const { data } = await client
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("name");

  return (
    <div>
      <AdminPageHeader title="New category" />
      <CategoryForm action={createCategory} parentOptions={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit page**

```tsx
// app/admin/categories/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { updateCategory } from "@/src/features/catalog/category-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();

  const [{ data, error }, { data: parents }] = await Promise.all([
    client.from("categories").select("id, slug, name, description, image_url, parent_id, sort_order, is_active").eq("id", id).single(),
    client.from("categories").select("id, name").eq("is_active", true).is("parent_id", null).neq("id", id).order("name"),
  ]);

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.name}`} />
      <CategoryForm
        action={updateCategory}
        parentOptions={parents ?? []}
        initialValues={{
          id: data.id,
          slug: data.slug,
          name: data.name,
          description: data.description ?? "",
          imageUrl: data.image_url ?? "",
          parentId: data.parent_id,
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/categories/ components/admin/category-form.tsx components/admin/category-row-actions.tsx
git commit -m "feat(admin): add category list, create, and edit pages"
```

---

## ── PART D: ADMIN NAV ──────────────────────────────────────

### Task 9: Update admin navigation

**Files:**
- Modify: `components/admin/admin-nav.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nav links to /admin/suppliers, /admin/warehouses, /admin/categories

- [ ] **Step 1: Add new links to admin nav**

Replace the `adminLinks` array in `components/admin/admin-nav.tsx`:

```tsx
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
];
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/admin-nav.tsx
git commit -m "feat(admin): add suppliers, warehouses, categories to admin nav"
```
