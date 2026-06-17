# Admin Edit & Soft-Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row-level Edit and soft-delete (Archive) actions to the admin Products table, establishing the pattern all other admin entities can follow.

**Architecture:** Edit opens a dedicated server-rendered page at `/admin/products/[id]/edit` with a plain HTML form + Server Action (`updateProduct`). Archive is a second Server Action (`archiveProduct`) bound to the product ID and rendered as an inline form button in the table row — no client JS required. Soft-delete sets `products.status = 'archived'`; the existing status filter in `getAdminProductRows` already hides archived products from public catalog RPCs.

**Tech Stack:** Next.js App Router Server Components, Server Actions, Supabase JS, Zod v4, Tailwind CSS, Vitest.

---

## File Map

| File | Change |
|------|--------|
| `src/features/admin/permissions.ts` | Add `products:delete` to `catalog_manager` |
| `src/features/catalog/admin-actions.ts` | **Create** — `updateProduct` and `archiveProduct` Server Actions |
| `components/admin/admin-data-table.tsx` | Add optional `actionsSlot` render prop |
| `app/admin/products/page.tsx` | Include `id` in rows, add `actionsSlot` with Edit link + Archive form |
| `app/admin/products/[id]/edit/page.tsx` | **Create** — product edit page |
| `src/features/catalog/admin-actions.test.ts` | **Create** — unit tests for server actions |

---

## Tasks

### Task 1: Add `products:delete` permission

**Files:**
- Modify: `src/features/admin/permissions.ts`

- [ ] **Step 1: Add the permission**

Open `src/features/admin/permissions.ts` and update the `catalog_manager` array:

```ts
catalog_manager: [
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
  "categories:update",
],
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/permissions.ts
git commit -m "feat: add products:delete permission to catalog_manager"
```

---

### Task 2: Create catalog admin server actions

**Files:**
- Create: `src/features/catalog/admin-actions.ts`
- Create: `src/features/catalog/admin-actions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/catalog/admin-actions.test.ts`:

```ts
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
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { archiveProduct } from "./admin-actions";

describe("archiveProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const chain = { eq: mockEq };
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue(chain);
    mockFrom.mockReturnValue({ update: mockUpdate, select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ admin_roles: { name: "super_admin" } }], error: null }) }) });
  });

  it("sets status to archived for the given product id", async () => {
    await archiveProduct("prod-uuid-123");
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
    expect(mockEq).toHaveBeenCalledWith("id", "prod-uuid-123");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test src/features/catalog/admin-actions.test.ts
```

Expected: FAIL — `Cannot find module './admin-actions'`.

- [ ] **Step 3: Implement `src/features/catalog/admin-actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  status: z.enum(["draft", "published"]),
  shortDescription: z.string(),
  origin: z.string(),
});

export type UpdateProductState = { error: string } | null;

export async function updateProduct(
  _prev: UpdateProductState,
  formData: FormData,
): Promise<UpdateProductState> {
  const result = updateProductSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    shortDescription: formData.get("shortDescription"),
    origin: formData.get("origin"),
  });

  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input." };
  }

  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client
    .from("products")
    .update({
      name: result.data.name,
      status: result.data.status,
      short_description: result.data.shortDescription,
      origin: result.data.origin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function archiveProduct(id: string): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:delete");

  const { error } = await client
    .from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/products");
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test src/features/catalog/admin-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/catalog/admin-actions.ts src/features/catalog/admin-actions.test.ts
git commit -m "feat: add updateProduct and archiveProduct server actions"
```

---

### Task 3: Add `actionsSlot` prop to `AdminDataTable`

**Files:**
- Modify: `components/admin/admin-data-table.tsx`

- [ ] **Step 1: Update the component**

Replace the contents of `components/admin/admin-data-table.tsx` with:

```tsx
import type { ReactNode } from "react";

type AdminDataTableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
};

type AdminDataTableProps<T extends object> = {
  columns: Array<AdminDataTableColumn<T>>;
  rows: T[];
  emptyMessage?: string;
  actionsSlot?: (row: T) => ReactNode;
};

function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function AdminDataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No records found.",
  actionsSlot,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-3 py-2 font-semibold">
                {column.label}
              </th>
            ))}
            {actionsSlot ? (
              <th className="px-3 py-2 font-semibold text-right">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-3 py-2 text-slate-700">
                  {column.render ? column.render(row) : formatCellValue(row[column.key])}
                </td>
              ))}
              {actionsSlot ? (
                <td className="px-3 py-2 text-right">{actionsSlot(row)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { AdminDataTable as DataTable };
export type { AdminDataTableColumn, AdminDataTableProps };
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-data-table.tsx
git commit -m "feat: add actionsSlot prop to AdminDataTable"
```

---

### Task 4: Create the product edit page

**Files:**
- Create: `app/admin/products/[id]/edit/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/admin/products/\[id\]/edit
```

- [ ] **Step 2: Implement the page**

Create `app/admin/products/[id]/edit/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateProduct, type UpdateProductState } from "@/src/features/catalog/admin-actions";

type ProductEditFormProps = {
  id: string;
  name: string;
  status: string;
  shortDescription: string;
  origin: string;
};

function ProductEditForm({ id, name, status, shortDescription, origin }: ProductEditFormProps) {
  const [state, action, isPending] = useActionState<UpdateProductState, FormData>(
    updateProduct,
    null,
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="id" value={id} />

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
          defaultValue={name}
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="status"
          name="status"
          defaultValue={status === "archived" ? "draft" : status}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="shortDescription">
        <span className="font-medium text-slate-700">Mô tả ngắn</span>
        <textarea
          id="shortDescription"
          name="shortDescription"
          defaultValue={shortDescription}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="origin">
        <span className="font-medium text-slate-700">Xuất xứ</span>
        <input
          id="origin"
          name="origin"
          defaultValue={origin}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu"}
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

Wait — `useActionState` requires `"use client"`. But the page also needs to fetch data server-side. Split into a server page + client form component:

- [ ] **Step 2 (revised): Create the client form component**

Create `components/admin/product-edit-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateProduct, type UpdateProductState } from "@/src/features/catalog/admin-actions";

type ProductEditFormProps = {
  id: string;
  name: string;
  status: string;
  shortDescription: string;
  origin: string;
};

export function ProductEditForm({ id, name, status, shortDescription, origin }: ProductEditFormProps) {
  const [state, action, isPending] = useActionState<UpdateProductState, FormData>(
    updateProduct,
    null,
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="id" value={id} />

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
          defaultValue={name}
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="status"
          name="status"
          defaultValue={status === "archived" ? "draft" : status}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="shortDescription">
        <span className="font-medium text-slate-700">Mô tả ngắn</span>
        <textarea
          id="shortDescription"
          name="shortDescription"
          defaultValue={shortDescription}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="origin">
        <span className="font-medium text-slate-700">Xuất xứ</span>
        <input
          id="origin"
          name="origin"
          defaultValue={origin}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu"}
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

- [ ] **Step 3: Create the server page**

Create `app/admin/products/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

type ProductEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit Product" />
          <p className="text-sm text-slate-600">You do not have access to edit products.</p>
        </div>
      );
    }
    throw error;
  }

  const { data: product, error } = await client
    .from("products")
    .select("id, name, status, short_description, origin")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div>
      <AdminPageHeader
        title="Edit Product"
        description={product.name}
      />
      <ProductEditForm
        id={product.id}
        name={product.name}
        status={product.status}
        shortDescription={product.short_description ?? ""}
        origin={product.origin ?? ""}
      />
    </div>
  );
}
```

- [ ] **Step 4: Build to verify types**

```bash
pnpm build
```

Expected: exits 0, `/admin/products/[id]/edit` appears in the route table.

- [ ] **Step 5: Commit**

```bash
git add components/admin/product-edit-form.tsx app/admin/products/\[id\]/edit/page.tsx
git commit -m "feat: add product edit page"
```

---

### Task 5: Wire actions column into the products list

**Files:**
- Modify: `app/admin/products/page.tsx`

- [ ] **Step 1: Add `id` to `AdminProductRow` and the Supabase query**

In `app/admin/products/page.tsx`, update the type and query:

```ts
// Add id to the row type
type AdminProductRow = {
  id: string;   // ← add this
  name: string;
  status: string;
  variants: number;
};

// Add id to the select query
const { data, error } = await client
  .from("products")
  .select("id, name, status, product_variants(id)")   // ← add "id,"
  .order("created_at", { ascending: false })
  .limit(50);

// Add id to the map
return ((data ?? []) as ProductRecord[]).map((product) => ({
  id: product.id,   // ← add this
  name: product.name,
  status: product.status,
  variants: product.product_variants?.length ?? 0,
}));
```

Also update `ProductRecord`:
```ts
type ProductRecord = {
  id: string;   // ← add this
  name: string;
  status: string;
  product_variants: Array<{ id: string }> | null;
};
```

- [ ] **Step 2: Add `actionsSlot` to `AdminDataTable` in the page**

Import `archiveProduct` and add `actionsSlot`:

```tsx
import Link from "next/link";
import { archiveProduct } from "@/src/features/catalog/admin-actions";

// Inside AdminProductsPage return:
<AdminDataTable
  columns={[
    { key: "name", label: "Name" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusChip value={row.status} tone={getProductStatusTone(row.status)} />
      ),
    },
    { key: "variants", label: "Variants" },
  ]}
  rows={pageData.products}
  emptyMessage="No products created yet."
  actionsSlot={(row) => (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/products/${row.id}/edit`}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <form
        action={archiveProduct.bind(null, row.id)}
        onSubmit={(e) => {
          if (!confirm(`Archive "${row.name}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Archive
        </button>
      </form>
    </div>
  )}
/>
```

> Note: `confirm()` requires the form to be a Client Component or use a small wrapper. If keeping the page as a Server Component, replace `onSubmit` with a `data-confirm` attribute and a minimal global JS snippet, or split the actions cell into a `"use client"` component. The simplest approach: extract just the action buttons into `components/admin/product-row-actions.tsx` as a Client Component (see step 3).

- [ ] **Step 3: Create `components/admin/product-row-actions.tsx`**

```tsx
"use client";

import Link from "next/link";
import { archiveProduct } from "@/src/features/catalog/admin-actions";

type ProductRowActionsProps = {
  id: string;
  name: string;
};

export function ProductRowActions({ id, name }: ProductRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/products/${id}/edit`}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <form
        action={archiveProduct.bind(null, id)}
        onSubmit={(e) => {
          if (!confirm(`Archive "${name}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Archive
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Use `ProductRowActions` in the products page**

Update the `actionsSlot` in `app/admin/products/page.tsx`:

```tsx
import { ProductRowActions } from "@/components/admin/product-row-actions";

actionsSlot={(row) => <ProductRowActions id={row.id} name={row.name} />}
```

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

Expected: exits 0, no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/admin/products/page.tsx components/admin/product-row-actions.tsx
git commit -m "feat: wire edit and archive actions into products table"
```

---

### Task 6: Run full test suite and lint

- [ ] **Step 1: Run tests**

```bash
pnpm test
```

Expected: all tests pass including `admin-actions.test.ts`.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address lint and test feedback for edit/archive feature"
```

---

## Applying the Pattern to Other Entities

The same structure applies to every other admin table. Checklist per entity:

| Entity | Soft-delete mechanism | Edit fields | Permission needed |
|--------|----------------------|-------------|-------------------|
| Categories | `is_active = false` | name, description, is_active | `categories:update` |
| Product variants | `is_active = false` | unit, list_price, sale_price, is_active | `products:update` |
| Suppliers | `is_active = false` | name, contact | `suppliers:update` |
| CMS sections | `is_active = false` | title, subtitle | `cms:update` |

For each: (1) add `id` to the row type, (2) create a server action file under the owning feature, (3) add a `*RowActions` client component, (4) wire `actionsSlot`.
