# Product Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the product catalog management UI by adding category assignment, SEO fields, missing variant fields (barcode, is_weighable, temperature_class, slug edit), search/filter/pagination, and bulk status actions.

**Architecture:** Each enhancement modifies the existing product form components and their corresponding server-action Zod schemas. Category assignment uses a delete-then-insert pattern against `product_categories`. Bulk status uses a multi-id server action. Pagination uses a `created_at` cursor. All changes are additive — no existing fields are removed.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React useActionState, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "products:update")` on mutating server actions, `"products:read"` on queries
- Form components must use `useActionState` hook
- Tests use vitest, mock Supabase as plain JS object
- Run tests: `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- `temperature_class` allowed values: `'ambient'`, `'chilled'`, `'frozen'`

---

### Task 1: Category assignment on product edit

**Files:**
- Modify: `components/admin/product-edit-form.tsx` (add `categories` prop and checkbox multi-select)
- Modify: `app/admin/products/[id]/edit/page.tsx` (fetch available categories + current assignment)
- Create: `src/features/catalog/category-assignment.ts`
- Create: `src/features/catalog/category-assignment.test.ts`
- Modify: relevant server action file that handles product update (find with `grep -r "updateProduct" src/`)

**Interfaces:**
- Produces: `updateProductCategories(client, productId: string, categoryIds: string[]): Promise<void>`
- Consumes: `CategoryOption = { id: string; name: string; slug: string }`

- [ ] **Step 1: Write failing test**

```ts
// src/features/catalog/category-assignment.test.ts
import { describe, expect, it } from "vitest";
import { updateProductCategories } from "./category-assignment";

describe("updateProductCategories", () => {
  it("deletes existing and inserts new categories", async () => {
    const deleted: unknown[] = [];
    const inserted: unknown[] = [];
    const client = {
      from: (table: string) => ({
        delete: () => ({
          eq: (col: string, val: string) => {
            deleted.push({ table, col, val });
            return { error: null };
          },
        }),
        insert: (vals: unknown) => {
          inserted.push(vals);
          return { error: null };
        },
      }),
    };

    await updateProductCategories(client as never, "prod-uuid", ["cat-1", "cat-2"]);

    expect(deleted[0]).toMatchObject({ table: "product_categories", col: "product_id", val: "prod-uuid" });
    expect(inserted[0]).toEqual([
      { product_id: "prod-uuid", category_id: "cat-1" },
      { product_id: "prod-uuid", category_id: "cat-2" },
    ]);
  });

  it("only deletes when no category ids provided", async () => {
    const deleted: unknown[] = [];
    const client = {
      from: () => ({
        delete: () => ({
          eq: (_col: string, _val: string) => {
            deleted.push(true);
            return { error: null };
          },
        }),
      }),
    };

    await updateProductCategories(client as never, "prod-uuid", []);
    expect(deleted).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/catalog/category-assignment.test.ts
```
Expected: FAIL — `updateProductCategories is not a function`

- [ ] **Step 3: Implement**

```ts
// src/features/catalog/category-assignment.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateProductCategories(
  client: Pick<SupabaseClient, "from">,
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const { error: deleteErr } = await client
    .from("product_categories")
    .delete()
    .eq("product_id", productId);
  if (deleteErr) throw deleteErr;

  if (categoryIds.length === 0) return;

  const { error: insertErr } = await client.from("product_categories").insert(
    categoryIds.map((categoryId) => ({ product_id: productId, category_id: categoryId })),
  );
  if (insertErr) throw insertErr;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/catalog/category-assignment.test.ts
```
Expected: PASS — 2 tests

- [ ] **Step 5: Call updateProductCategories from the product update server action**

Find the server action file that handles product updates:
```bash
grep -r "updateProduct\|update.*product" src/features/catalog/ --include="*.ts" -l
```

In that file, after the existing `.update()` call succeeds, add:
```ts
import { updateProductCategories } from "@/src/features/catalog/category-assignment";

// After the existing product update:
const rawIds = formData.getAll("categoryIds") as string[];
const categoryIds = rawIds.filter((id) => id.length > 0);
await updateProductCategories(client, productId, categoryIds);
```

- [ ] **Step 6: Update product edit page to fetch categories**

In `app/admin/products/[id]/edit/page.tsx`, add to the page data fetch:

```ts
const [{ data: productData }, { data: categoriesData }, { data: assignedData }] = await Promise.all([
  client.from("products").select("id, name, slug, ...").eq("id", params.id).single(),
  client.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
  client.from("product_categories").select("category_id").eq("product_id", params.id),
]);

const assignedIds = new Set((assignedData ?? []).map((r: { category_id: string }) => r.category_id));
```

Pass `categories={categoriesData ?? []}` and `assignedCategoryIds={[...assignedIds]}` to the form.

- [ ] **Step 7: Add category checkboxes to ProductEditForm**

In `components/admin/product-edit-form.tsx`, add props and render:

```tsx
// Add to Props type:
type Props = {
  // ...existing props...
  categories: { id: string; name: string; slug: string }[];
  assignedCategoryIds: string[];
};

// Add inside the form, after existing fields:
{categories.length > 0 && (
  <fieldset>
    <legend className="text-sm font-medium text-slate-700">Categories</legend>
    <div className="mt-2 flex flex-wrap gap-3">
      {categories.map((cat) => (
        <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="categoryIds"
            value={cat.id}
            defaultChecked={assignedCategoryIds.includes(cat.id)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          {cat.name}
        </label>
      ))}
    </div>
  </fieldset>
)}
```

- [ ] **Step 8: Commit**

```bash
git add src/features/catalog/category-assignment.ts src/features/catalog/category-assignment.test.ts \
  components/admin/product-edit-form.tsx app/admin/products/
git commit -m "feat(products): add category assignment to product edit form"
```

---

### Task 2: SEO fields on product edit

**Files:**
- Modify: `components/admin/product-edit-form.tsx`
- Modify: product update server action (same file found in Task 1 Step 5)

**Interfaces:**
- Consumes: `initialValues.seoTitle?: string`, `initialValues.seoDescription?: string`
- Produces: form fields `seo_title`, `seo_description` passed to server action

- [ ] **Step 1: Add SEO fields to ProductEditForm**

In `components/admin/product-edit-form.tsx`, add to Props `initialValues`:
```ts
seoTitle?: string;
seoDescription?: string;
```

Add below the existing description field:

```tsx
<details className="rounded-lg border border-slate-200 p-3">
  <summary className="cursor-pointer text-sm font-medium text-slate-700">SEO (optional)</summary>
  <div className="mt-3 space-y-3">
    <label className="block text-sm" htmlFor="seoTitle">
      <span className="font-medium text-slate-700">SEO title</span>
      <span className="ml-1 text-xs text-slate-400">(browser tab / search result title)</span>
      <input
        id="seoTitle"
        name="seoTitle"
        defaultValue={initialValues?.seoTitle ?? ""}
        maxLength={70}
        className={INPUT_CLASS}
      />
    </label>
    <label className="block text-sm" htmlFor="seoDescription">
      <span className="font-medium text-slate-700">SEO description</span>
      <span className="ml-1 text-xs text-slate-400">(max 160 chars)</span>
      <textarea
        id="seoDescription"
        name="seoDescription"
        defaultValue={initialValues?.seoDescription ?? ""}
        maxLength={160}
        rows={2}
        className={INPUT_CLASS}
      />
    </label>
  </div>
</details>
```

- [ ] **Step 2: Update server action Zod schema**

In the product update server action, add to the Zod schema:
```ts
seoTitle: z.string().max(70).optional().default(""),
seoDescription: z.string().max(160).optional().default(""),
```

And in the `.update()` call:
```ts
seo_title: result.data.seoTitle || null,
seo_description: result.data.seoDescription || null,
```

- [ ] **Step 3: Update page data fetch**

In `app/admin/products/[id]/edit/page.tsx`, add `seo_title, seo_description` to the select columns and pass them as `initialValues.seoTitle` and `initialValues.seoDescription` to the form.

- [ ] **Step 4: Commit**

```bash
git add components/admin/product-edit-form.tsx app/admin/products/[id]/edit/page.tsx
git commit -m "feat(products): add SEO title and description fields to product edit"
```

---

### Task 3: temperature_class on create, slug edit on edit

**Files:**
- Modify: `components/admin/product-create-form.tsx`
- Modify: `components/admin/product-edit-form.tsx`
- Modify: product create and update server actions

- [ ] **Step 1: Add temperature_class to create form**

In `components/admin/product-create-form.tsx`, add before the status field:

```tsx
<label className="block text-sm" htmlFor="temperatureClass">
  <span className="font-medium text-slate-700">Temperature class</span>
  <select id="temperatureClass" name="temperatureClass" required className={INPUT_CLASS}>
    <option value="">Select…</option>
    <option value="ambient">Ambient (room temperature)</option>
    <option value="chilled">Chilled (2–8°C)</option>
    <option value="frozen">Frozen (below −18°C)</option>
  </select>
</label>
```

In the product create server action Zod schema, ensure:
```ts
temperatureClass: z.enum(["ambient", "chilled", "frozen"]),
```
And in the insert: `temperature_class: result.data.temperatureClass`.

- [ ] **Step 2: Add slug field to edit form**

In `components/admin/product-edit-form.tsx`, add a slug field (editable in edit mode):

```tsx
<label className="block text-sm" htmlFor="slug">
  <span className="font-medium text-slate-700">Slug</span>
  <span className="ml-1 text-xs text-slate-400">(URL path — lowercase, hyphens only)</span>
  <input
    id="slug"
    name="slug"
    defaultValue={initialValues?.slug ?? ""}
    pattern="[a-z0-9-]+"
    title="Lowercase letters, digits, and hyphens only"
    required
    className={INPUT_CLASS}
  />
</label>
```

In the product update server action Zod schema add:
```ts
slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
```
And in the `.update()` call: `slug: result.data.slug`. Handle the unique-constraint error (code `23505`) with: `return { error: "A product with this slug already exists." }`.

Also add `temperature_class` select to the edit form with the same options as create.

- [ ] **Step 3: Commit**

```bash
git add components/admin/product-create-form.tsx components/admin/product-edit-form.tsx
git commit -m "feat(products): add temperature_class to create, slug edit to product edit form"
```

---

### Task 4: Variant fields — barcode and is_weighable

**Files:**
- Modify: `components/admin/product-variants-pricing.tsx`
- Modify: variant update server action (find with `grep -r "updateVariant\|variant" src/features/catalog/ -l`)

- [ ] **Step 1: Add fields to variant rows in ProductVariantsPricing**

In `components/admin/product-variants-pricing.tsx`, find the input row for each variant and add after the existing fields:

```tsx
{/* Barcode */}
<input
  name={`barcode_${variant.id}`}
  type="text"
  defaultValue={variant.barcode ?? ""}
  placeholder="Barcode (optional)"
  className="min-h-9 rounded border border-slate-300 px-2 text-sm focus:border-teal-600 focus:outline-none"
/>

{/* Is weighable */}
<label className="flex items-center gap-1 text-xs text-slate-600">
  <input
    type="checkbox"
    name={`isWeighable_${variant.id}`}
    value="true"
    defaultChecked={variant.is_weighable ?? false}
    className="rounded border-slate-300 text-teal-600"
  />
  Sold by weight
</label>
```

- [ ] **Step 2: Update server action to save barcode and is_weighable**

In the variant update server action, extend the Zod schema:
```ts
barcode: z.string().optional().default(""),
isWeighable: z.boolean().default(false),
```
Parse: `isWeighable: formData.get(`isWeighable_${variantId}`) === "true"`.
Add to `.update()`: `barcode: result.data.barcode || null, is_weighable: result.data.isWeighable`.

- [ ] **Step 3: Commit**

```bash
git add components/admin/product-variants-pricing.tsx
git commit -m "feat(products): add barcode and is_weighable fields to variant editor"
```

---

### Task 5: Product list search and pagination

**Files:**
- Modify: `app/admin/products/page.tsx`
- Modify: `src/features/catalog/admin-actions.ts` (or wherever `getAdminProductRows` lives)
- Create: `src/features/catalog/product-list-query.test.ts`

**Interfaces:**
- Produces: `getAdminProductRows(client, opts: { query?: string; after?: string; limit?: number }): Promise<{ rows: AdminProductRow[]; nextCursor: string | null }>`

- [ ] **Step 1: Write failing test**

```ts
// src/features/catalog/product-list-query.test.ts
import { describe, expect, it } from "vitest";
import { getAdminProductRows } from "./admin-actions"; // adjust path if different

describe("getAdminProductRows with opts", () => {
  it("returns rows and null cursor when fewer than limit", async () => {
    const rows = [
      { id: "p1", name: "Apple", status: "published", product_variants: [{ id: "v1" }], created_at: "2026-01-01T00:00:00Z" },
    ];
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    };
    const result = await getAdminProductRows(client as never, { limit: 25 });
    expect(result.rows).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when rows equal limit", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`, name: `Product ${i}`, status: "draft",
      product_variants: [], created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
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
    const result = await getAdminProductRows(client as never, { limit: 25 });
    expect(result.nextCursor).toBe(rows[24].created_at);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/catalog/product-list-query.test.ts
```
Expected: FAIL — signature mismatch

- [ ] **Step 3: Update getAdminProductRows signature**

Find the current `getAdminProductRows` function (in `app/admin/products/page.tsx` or `src/features/catalog/`). Move it to `src/features/catalog/admin-actions.ts` if it isn't already there, and update its signature:

```ts
export type AdminProductRow = {
  id: string;
  name: string;
  status: string;
  variants: number;
  created_at: string;
};

type ProductListOpts = { query?: string; after?: string; limit?: number };
type RawProductRecord = {
  id: string; name: string; status: string;
  product_variants: Array<{ id: string }>| null; created_at: string;
};

export async function getAdminProductRows(
  client: Pick<SupabaseClient, "from">,
  opts: ProductListOpts = {},
): Promise<{ rows: AdminProductRow[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 25;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client
    .from("products")
    .select("id, name, status, product_variants(id), created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.after) q = q.lt("created_at", opts.after);

  const { data, error } = await q;
  if (error) throw error;

  const rows: AdminProductRow[] = ((data ?? []) as RawProductRecord[]).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    variants: p.product_variants?.length ?? 0,
    created_at: p.created_at,
  }));

  // Client-side name filter (search_document tsvector used for production; ilike for admin simplicity)
  const filtered = opts.query
    ? rows.filter((r) => r.name.toLowerCase().includes(opts.query!.toLowerCase()))
    : rows;

  const nextCursor = data?.length === limit ? rows[rows.length - 1]?.created_at ?? null : null;

  return { rows: filtered, nextCursor };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/catalog/product-list-query.test.ts
```
Expected: PASS

- [ ] **Step 5: Update products list page**

Replace `app/admin/products/page.tsx` to use search params and pagination:

```tsx
// app/admin/products/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SearchParams } from "next/dist/server/request/search-params";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAdminProductRows, type AdminProductRow } from "@/src/features/catalog/admin-actions";

export const dynamic = "force-dynamic";

function getStatusTone(status: string): StatusChipTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

type PageData =
  | { access: "allowed"; rows: AdminProductRow[]; nextCursor: string | null; q: string }
  | { access: "denied" };

async function getPageData(searchParams: SearchParams): Promise<PageData> {
  const q = String(searchParams.q ?? "");
  const after = String(searchParams.after ?? "");

  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", rows: [], nextCursor: null, q };

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "products:read");
    const { rows, nextCursor } = await getAdminProductRows(client, { query: q, after });
    return { access: "allowed", rows, nextCursor, q };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const pageData = await getPageData(searchParams);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Products" />
        <p className="text-sm text-slate-600">You do not have access to products.</p>
      </div>
    );
  }

  const { rows, nextCursor, q } = pageData;

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Manage storefront product records and variant coverage."
        action={
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New product
          </Link>
        }
      />

      {/* Search bar */}
      <form method="GET" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        />
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/products"
            className="flex min-h-9 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusChip value={row.status} tone={getStatusTone(row.status)} />,
          },
          { key: "variants", label: "Variants" },
        ]}
        rows={rows}
        emptyMessage="No products found."
        actionsSlot={(row) => <ProductRowActions id={row.id} name={row.name} />}
      />

      {nextCursor && (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/admin/products?q=${q}&after=${encodeURIComponent(nextCursor)}`}
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

- [ ] **Step 6: Commit**

```bash
git add src/features/catalog/ app/admin/products/page.tsx
git commit -m "feat(products): add search and cursor pagination to product list"
```

---

### Task 6: Bulk status actions on product list

**Files:**
- Create: `components/admin/product-bulk-actions.tsx`
- Modify: `src/features/catalog/admin-actions.ts` (add `bulkUpdateProductStatus`)
- Create: `src/features/catalog/bulk-status.test.ts`
- Modify: `app/admin/products/page.tsx` (wrap table with bulk actions component)

**Interfaces:**
- Produces: `bulkUpdateProductStatus(ids: string[], status: string): Promise<void>` (server action)
- Produces: `<ProductBulkActions rows={AdminProductRow[]} />` — wraps list with checkboxes + toolbar

- [ ] **Step 1: Write failing test**

```ts
// src/features/catalog/bulk-status.test.ts
import { describe, expect, it } from "vitest";
import { bulkUpdateProductStatus } from "./admin-actions";

describe("bulkUpdateProductStatus", () => {
  it("updates status for all provided ids", async () => {
    const updates: unknown[] = [];
    const client = {
      from: () => ({
        update: (vals: unknown) => {
          updates.push(vals);
          return {
            in: async () => ({ error: null }),
          };
        },
      }),
    };
    await bulkUpdateProductStatus(client as never, ["id-1", "id-2"], "published");
    expect(updates[0]).toMatchObject({ status: "published" });
  });

  it("throws on invalid status", async () => {
    const client = { from: () => ({}) };
    await expect(bulkUpdateProductStatus(client as never, ["id-1"], "invalid")).rejects.toThrow();
  });

  it("does nothing when ids array is empty", async () => {
    const calls: number[] = [];
    const client = { from: () => { calls.push(1); return {}; } };
    await bulkUpdateProductStatus(client as never, [], "published");
    expect(calls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/features/catalog/bulk-status.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement bulkUpdateProductStatus**

In `src/features/catalog/admin-actions.ts`, append:

```ts
const VALID_PRODUCT_STATUSES = ["draft", "published", "archived"] as const;

export async function bulkUpdateProductStatus(
  client: Pick<SupabaseClient, "from">,
  ids: string[],
  status: string,
): Promise<void> {
  if (ids.length === 0) return;
  if (!VALID_PRODUCT_STATUSES.includes(status as typeof VALID_PRODUCT_STATUSES[number])) {
    throw new Error(`Invalid product status: ${status}`);
  }

  const { error } = await client
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw error;
}
```

Also add the server action wrapper:

```ts
export async function bulkUpdateProductStatusAction(ids: string[], status: string): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");
  await bulkUpdateProductStatus(client, ids, status);
  revalidatePath("/admin/products");
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/features/catalog/bulk-status.test.ts
```
Expected: PASS

- [ ] **Step 5: Create ProductBulkActions component**

```tsx
// components/admin/product-bulk-actions.tsx
"use client";

import { useTransition, useState } from "react";
import { bulkUpdateProductStatusAction } from "@/src/features/catalog/admin-actions";
import type { AdminProductRow } from "@/src/features/catalog/admin-actions";

type Props = { rows: AdminProductRow[] };

export function ProductBulkActions({ rows }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const apply = (status: string) => {
    startTransition(() => bulkUpdateProductStatusAction([...selected], status));
    setSelected(new Set());
  };

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2">
          <span className="text-sm text-teal-800">{selected.size} selected</span>
          <button
            disabled={isPending}
            onClick={() => apply("published")}
            className="rounded bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            disabled={isPending}
            onClick={() => apply("draft")}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            disabled={isPending}
            onClick={() => apply("archived")}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
            <th className="py-2 pr-3 w-8">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all"
              />
            </th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Variants</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={(e) => toggleOne(row.id, e.target.checked)}
                  aria-label={`Select ${row.name}`}
                />
              </td>
              <td className="py-2 pr-4 font-medium text-slate-800">{row.name}</td>
              <td className="py-2 pr-4 capitalize text-slate-600">{row.status}</td>
              <td className="py-2 pr-4 text-slate-600">{row.variants}</td>
              <td className="py-2">
                <a href={`/admin/products/${row.id}/edit`} className="text-teal-700 hover:underline">
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Use ProductBulkActions in the products page**

In `app/admin/products/page.tsx`, replace `<AdminDataTable ...>` with `<ProductBulkActions rows={rows} />`.

- [ ] **Step 7: Commit**

```bash
git add src/features/catalog/admin-actions.ts src/features/catalog/bulk-status.test.ts \
  components/admin/product-bulk-actions.tsx app/admin/products/page.tsx
git commit -m "feat(products): add bulk publish/unpublish/archive to product list"
```
