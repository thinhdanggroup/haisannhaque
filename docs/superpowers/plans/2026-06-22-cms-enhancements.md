# CMS Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CMS section–product linking UI, section scheduling (starts_at/ends_at), image upload for banners, and hierarchical navigation parent_id support.

**Architecture:** Each enhancement extends the existing CMS server actions in `src/features/cms/admin-actions.ts` and form components in `components/admin/`. Section-product linking gets its own actions file. Banner image upload uses a Supabase Storage bucket (`cms-images`) via the same client-side upload pattern as product images. No new routing pattern is introduced — new sub-pages follow the `[id]/products/page.tsx` pattern already used in the codebase.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React useActionState, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "cms:update")` on every mutating server action
- Tests mock Supabase as plain JS object, run with `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components

---

### Task 1: Section → Products Linking — Server Actions

**Files:**
- Create: `src/features/cms/section-products-actions.ts`
- Test: `src/features/cms/section-products-actions.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/cms/section-products-actions.test.ts
import { describe, it, expect } from "vitest";
import {
  getSectionProducts,
  addSectionProduct,
  removeSectionProduct,
} from "./section-products-actions";

describe("getSectionProducts", () => {
  it("queries cms_section_products joined with products", async () => {
    const queries: string[] = [];
    const mockClient = {
      from: (table: string) => {
        queries.push(table);
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: string) => ({
              order: (_col: string, _opts: object) => ({
                data: [
                  {
                    id: "sp-1",
                    product_id: "p-1",
                    sort_order: 0,
                    products: { name: "Apple" },
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      },
    };

    const result = await getSectionProducts(mockClient as never, "section-uuid");
    expect(result).toEqual([
      { id: "sp-1", productId: "p-1", productName: "Apple", sortOrder: 0 },
    ]);
    expect(queries[0]).toBe("cms_section_products");
  });
});

describe("addSectionProduct validation", () => {
  it("rejects non-uuid sectionId", async () => {
    const formData = new FormData();
    formData.set("sectionId", "not-a-uuid");
    formData.set("productId", "00000000-0000-0000-0000-000000000001");
    const mockClient = {
      rpc: async () => ({ data: [{ roles: ["marketing"] }], error: null }),
      from: () => ({ insert: async () => ({ error: null }) }),
    };
    const result = await addSectionProduct(null, formData);
    expect(result?.error).toBeTruthy();
  });

  it("rejects non-uuid productId", async () => {
    const formData = new FormData();
    formData.set("sectionId", "00000000-0000-0000-0000-000000000001");
    formData.set("productId", "not-a-uuid");
    const mockClient = {};
    const result = await addSectionProduct(null, formData);
    expect(result?.error).toBeTruthy();
  });
});

describe("removeSectionProduct validation", () => {
  it("throws on invalid uuid", async () => {
    const mockClient = {
      rpc: async () => ({ data: [{ roles: ["marketing"] }], error: null }),
      from: () => ({ delete: () => ({ eq: async () => ({ error: null }) }) }),
    };
    await expect(removeSectionProduct(mockClient as never, "bad-id")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/cms/section-products-actions.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create the server actions file**

```ts
// src/features/cms/section-products-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type SectionProductState = { error: string } | null;

export type SectionProduct = {
  id: string;
  productId: string;
  productName: string;
  sortOrder: number;
};

export async function getSectionProducts(
  client: Pick<SupabaseClient, "from">,
  sectionId: string,
): Promise<SectionProduct[]> {
  const { data, error } = await client
    .from("cms_section_products")
    .select("id, product_id, sort_order, products(name)")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    product_id: string;
    sort_order: number;
    products: { name: string } | null;
  }>).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name ?? "",
    sortOrder: row.sort_order,
  }));
}

const addSchema = z.object({
  sectionId: z.string().uuid("Section ID must be a valid UUID"),
  productId: z.string().uuid("Product ID must be a valid UUID"),
});

export async function addSectionProduct(
  _prev: SectionProductState,
  formData: FormData,
): Promise<SectionProductState> {
  const result = addSchema.safeParse({
    sectionId: formData.get("sectionId"),
    productId: formData.get("productId"),
  });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_section_products").insert({
    section_id: result.data.sectionId,
    product_id: result.data.productId,
    sort_order: 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "This product is already in the section." };
    throw error;
  }

  revalidatePath("/admin/content");
}

export async function removeSectionProduct(
  client: Pick<SupabaseClient, "from" | "rpc">,
  sectionProductId: string,
): Promise<void> {
  const parsed = z.string().uuid().safeParse(sectionProductId);
  if (!parsed.success) throw new Error("Invalid section product ID.");

  await requireAdminPermission(client as never, "cms:update");

  const { error } = await client
    .from("cms_section_products")
    .delete()
    .eq("id", parsed.data);

  if (error) throw error;
  revalidatePath("/admin/content");
}

export async function removeSectionProductAction(sectionProductId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(sectionProductId);
  if (!parsed.success) throw new Error("Invalid section product ID.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client
    .from("cms_section_products")
    .delete()
    .eq("id", parsed.data);

  if (error) throw error;
  revalidatePath("/admin/content");
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/cms/section-products-actions.test.ts
```
Expected: PASS (validation tests pass; getSectionProducts test passes with mock)

- [ ] **Step 5: Commit**

```bash
git add src/features/cms/section-products-actions.ts src/features/cms/section-products-actions.test.ts
git commit -m "feat(cms): add section-products server actions"
```

---

### Task 2: Section → Products — UI Components and Page

**Files:**
- Create: `components/admin/section-products-manager.tsx`
- Create: `app/admin/content/sections/[id]/products/page.tsx`

- [ ] **Step 1: Create the section products manager component**

```tsx
// components/admin/section-products-manager.tsx
"use client";

import { useActionState, useState } from "react";
import type { SectionProduct, SectionProductState } from "@/src/features/cms/section-products-actions";
import { addSectionProduct, removeSectionProductAction } from "@/src/features/cms/section-products-actions";

type ProductOption = { id: string; name: string };

type Props = {
  sectionId: string;
  initialProducts: SectionProduct[];
  availableProducts: ProductOption[];
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function SectionProductsManager({ sectionId, initialProducts, availableProducts }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [addState, addAction, isAdding] = useActionState<SectionProductState, FormData>(
    addSectionProduct,
    null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Products in this section</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No products linked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-800">{p.productName}</span>
                <form
                  action={async () => {
                    await removeSectionProductAction(p.id);
                    setProducts((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={addAction} className="space-y-3">
        <input type="hidden" name="sectionId" value={sectionId} />
        {addState?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {addState.error}
          </p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Add product
          <select name="productId" className={INPUT_CLASS}>
            <option value="">Select a product…</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isAdding}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isAdding ? "Adding…" : "Add to section"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create the section products page**

```tsx
// app/admin/content/sections/[id]/products/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SectionProductsManager } from "@/components/admin/section-products-manager";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getSectionProducts } from "@/src/features/cms/section-products-actions";
import { createServerClient } from "@/src/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function SectionProductsPage({ params }: PageProps) {
  const { id: sectionId } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return <div>Section products (fixture mode)</div>;
  }

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return <p className="text-sm text-slate-600">Access denied.</p>;
    }
    throw e;
  }

  const [sectionResult, linkedProducts, allProductsResult] = await Promise.all([
    client.from("cms_sections").select("section_key, page_key").eq("id", sectionId).single(),
    getSectionProducts(client, sectionId),
    client.from("products").select("id, name").eq("status", "published").order("name").limit(200),
  ]);

  if (sectionResult.error || !sectionResult.data) {
    return <p className="text-sm text-slate-600">Section not found.</p>;
  }

  const section = sectionResult.data;
  const availableProducts = (allProductsResult.data ?? []) as { id: string; name: string }[];

  return (
    <div>
      <AdminPageHeader
        title={`Products — ${section.section_key}`}
        description={`Manage products linked to this section on page "${section.page_key}".`}
        action={
          <Link
            href="/admin/content"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to content
          </Link>
        }
      />
      <SectionProductsManager
        sectionId={sectionId}
        initialProducts={linkedProducts}
        availableProducts={availableProducts}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add "Manage products" link to the sections table in `app/admin/content/page.tsx`**

Find the section where sections rows are rendered in `app/admin/content/page.tsx`. Add a link column for sections rows:

```tsx
// In the sections AdminDataTable, add to actionsSlot or columns:
actionsSlot={(row) => (
  <Link
    href={`/admin/content/sections/${row.id}/products`}
    className="text-xs font-medium text-teal-700 hover:text-teal-900"
  >
    Products
  </Link>
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/section-products-manager.tsx \
        app/admin/content/sections/\[id\]/products/page.tsx \
        app/admin/content/page.tsx
git commit -m "feat(cms): add section-product linking UI and page"
```

---

### Task 3: Section Scheduling (starts_at / ends_at)

**Files:**
- Modify: `components/admin/cms-section-form.tsx`
- Modify: `src/features/cms/admin-actions.ts`
- Test: `src/features/cms/admin-actions.test.ts`

- [ ] **Step 1: Write the failing validation test**

```ts
// src/features/cms/admin-actions.test.ts
import { describe, it, expect } from "vitest";

// We test the validation logic directly via the server action.
// The action calls requireAdminPermission which requires a real client —
// so we test only the Zod schema validation path (which runs before the DB call).

describe("updateCmsSection scheduling validation", () => {
  it("rejects endsAt before startsAt", async () => {
    const { updateCmsSection } = await import("./admin-actions");
    const formData = new FormData();
    formData.set("id", "00000000-0000-0000-0000-000000000001");
    formData.set("sectionKey", "hero");
    formData.set("sectionType", "hero");
    formData.set("layout", "default");
    formData.set("sortOrder", "0");
    formData.set("isActive", "true");
    formData.set("startsAt", "2026-08-01T00:00:00.000Z");
    formData.set("endsAt", "2026-07-01T00:00:00.000Z"); // before startsAt

    const result = await updateCmsSection(null, formData);
    expect(result?.error).toMatch(/end/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/features/cms/admin-actions.test.ts
```
Expected: FAIL

- [ ] **Step 3: Update `updateCmsSection` in `src/features/cms/admin-actions.ts`**

In the `cmsSectionUpdateSchema`, add optional scheduling fields:

```ts
const cmsSectionUpdateSchema = z.object({
  id: z.string().uuid(),
  sectionKey: z.string().min(1, "Section key is required"),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string(),
  subtitle: z.string(),
  layout: z.string().min(1, "Layout is required"),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    if (data.startsAt && data.endsAt) {
      return new Date(data.endsAt) > new Date(data.startsAt);
    }
    return true;
  },
  { message: "End date must be after start date.", path: ["endsAt"] },
);
```

In `updateCmsSection`, parse the new fields from formData and write them to DB:

```ts
// In the safeParse call, add:
startsAt: formData.get("startsAt") || null,
endsAt: formData.get("endsAt") || null,

// In the client.from("cms_sections").update() call, add:
starts_at: result.data.startsAt ?? null,
ends_at: result.data.endsAt ?? null,
```

- [ ] **Step 4: Update `components/admin/cms-section-form.tsx`**

Add scheduling inputs below the `isActive` field:

```tsx
<fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
  <legend className="px-1 text-xs font-semibold text-slate-500">Schedule (optional)</legend>

  <label className="block text-sm" htmlFor="startsAt">
    <span className="font-medium text-slate-700">Active from</span>
    <input
      id="startsAt"
      name="startsAt"
      type="datetime-local"
      defaultValue={initialValues?.startsAt?.slice(0, 16) ?? ""}
      className={INPUT_CLASS}
    />
  </label>

  <label className="block text-sm" htmlFor="endsAt">
    <span className="font-medium text-slate-700">Active until</span>
    <input
      id="endsAt"
      name="endsAt"
      type="datetime-local"
      defaultValue={initialValues?.endsAt?.slice(0, 16) ?? ""}
      className={INPUT_CLASS}
    />
  </label>
</fieldset>
```

Also update `CmsSectionFormProps` to include optional scheduling in `initialValues`:

```ts
type CmsSectionFormProps = {
  action: (prev: CmsSectionState, formData: FormData) => Promise<CmsSectionState>;
  initialValues?: {
    id?: string;
    sectionKey: string;
    sectionType: string;
    title: string;
    subtitle: string;
    layout: string;
    sortOrder: number;
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  pageKey?: string;
  pages?: { page_key: string; title: string }[];
};
```

Update the edit page (`app/admin/content/sections/[id]/edit/page.tsx`) to pass `startsAt` and `endsAt` from the DB row into `initialValues`.

- [ ] **Step 5: Run tests**

```bash
pnpm vitest run src/features/cms/admin-actions.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/cms/admin-actions.ts \
        src/features/cms/admin-actions.test.ts \
        components/admin/cms-section-form.tsx \
        app/admin/content/sections/\[id\]/edit/page.tsx
git commit -m "feat(cms): add section scheduling fields (starts_at, ends_at)"
```

---

### Task 4: Banner Image Upload

**Files:**
- Create: `supabase/migrations/202606220016_cms_storage.sql`
- Create: `components/admin/cms-image-upload.tsx`
- Modify: `components/admin/cms-banner-form.tsx`

- [ ] **Step 1: Create Supabase Storage migration for cms-images bucket**

```sql
-- supabase/migrations/202606220016_cms_storage.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-images',
  'cms-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Admins can upload cms images"
  on storage.objects for insert
  with check (bucket_id = 'cms-images');

create policy "Public can read cms images"
  on storage.objects for select
  using (bucket_id = 'cms-images');

create policy "Admins can delete cms images"
  on storage.objects for delete
  using (bucket_id = 'cms-images');
```

Apply via: `pnpm supabase db push` (or add to supabase migration queue).

- [ ] **Step 2: Create `components/admin/cms-image-upload.tsx`**

```tsx
// components/admin/cms-image-upload.tsx
"use client";

import { useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  name: string;           // hidden input name, e.g. "imageUrl"
  defaultValue?: string;  // existing URL for edit forms
  label?: string;
};

export function CmsImageUpload({ name, defaultValue, label = "Image" }: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const ext = file.name.split(".").pop();
      const path = `banners/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("cms-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("cms-images").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>

      {url && (
        <img
          src={url}
          alt="Preview"
          className="h-32 w-auto rounded-lg border border-slate-200 object-cover"
        />
      )}

      <input type="hidden" name={name} value={url} />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
      />

      {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Modify `components/admin/cms-banner-form.tsx`**

Replace the `imageUrl` text input and `mobileImageUrl` text input with `<CmsImageUpload>`:

```tsx
// At the top of the file, add:
import { CmsImageUpload } from "@/components/admin/cms-image-upload";

// Replace the imageUrl label+input block with:
<CmsImageUpload
  name="imageUrl"
  defaultValue={initialValues?.imageUrl}
  label="Banner image (desktop)"
/>

// Replace the mobileImageUrl label+input block with:
<CmsImageUpload
  name="mobileImageUrl"
  defaultValue={initialValues?.mobileImageUrl}
  label="Banner image (mobile, optional)"
/>
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606220016_cms_storage.sql \
        components/admin/cms-image-upload.tsx \
        components/admin/cms-banner-form.tsx
git commit -m "feat(cms): add image upload component and cms-images storage bucket"
```

---

### Task 5: Hierarchical Navigation (parent_id)

**Files:**
- Modify: `src/features/cms/admin-actions.ts`
- Modify: `components/admin/cms-nav-item-form.tsx`
- Modify: `app/admin/content/navigation/new/page.tsx`
- Modify: `app/admin/content/navigation/[id]/edit/page.tsx`

- [ ] **Step 1: Update `createCmsNavItem` and `updateCmsNavItem` schemas**

In `src/features/cms/admin-actions.ts`, add `parentId` to both schemas:

```ts
const cmsNavItemCreateSchema = z.object({
  placement: z.enum(NAV_PLACEMENTS),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  iconKey: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  parentId: z.string().uuid().optional().nullable(),
});

const cmsNavItemUpdateSchema = z.object({
  id: z.string().uuid(),
  placement: z.enum(NAV_PLACEMENTS),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  iconKey: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  parentId: z.string().uuid().optional().nullable(),
});
```

In both `createCmsNavItem` and `updateCmsNavItem`, parse and write `parentId`:

```ts
// In safeParse call, add:
parentId: formData.get("parentId") || null,

// In the insert/update call, add:
parent_id: result.data.parentId ?? null,
```

- [ ] **Step 2: Update `components/admin/cms-nav-item-form.tsx`**

Add `parentItems` prop and a Parent select dropdown:

```tsx
// Add to Props type:
type NavItemOption = { id: string; label: string; placement: string };

type CmsNavItemFormProps = {
  action: (prev: CmsNavItemState, formData: FormData) => Promise<CmsNavItemState>;
  initialValues?: {
    id?: string;
    placement: string;
    label: string;
    href: string;
    iconKey: string;
    sortOrder: number;
    isActive: boolean;
    parentId?: string | null;
  };
  navItems?: NavItemOption[];  // all existing nav items for parent selection
};

// In the form JSX, add after the placement select:
{props.navItems && props.navItems.length > 0 && (
  <label className="block text-sm" htmlFor="parentId">
    <span className="font-medium text-slate-700">Parent item</span>
    <span className="ml-1 text-xs text-slate-400">(optional — for nested menus)</span>
    <select
      id="parentId"
      name="parentId"
      defaultValue={initialValues?.parentId ?? ""}
      className={INPUT_CLASS}
    >
      <option value="">(none — top level)</option>
      {props.navItems
        .filter((item) => item.id !== initialValues?.id) // don't show self as parent
        .map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} ({item.placement})
          </option>
        ))}
    </select>
  </label>
)}
```

- [ ] **Step 3: Update the new and edit page components to fetch existing nav items**

In `app/admin/content/navigation/new/page.tsx`, fetch all nav items and pass to the form:

```tsx
const { data: navItems } = await client
  .from("cms_navigation_items")
  .select("id, label, placement")
  .order("placement")
  .order("sort_order");

// Pass to form:
<CmsNavItemForm action={createCmsNavItem} navItems={navItems ?? []} />
```

In `app/admin/content/navigation/[id]/edit/page.tsx`, do the same:

```tsx
const [navItemResult, allNavItemsResult] = await Promise.all([
  client.from("cms_navigation_items").select("*").eq("id", id).single(),
  client.from("cms_navigation_items").select("id, label, placement").order("placement"),
]);

// Pass to form:
<CmsNavItemForm
  action={updateCmsNavItem}
  initialValues={{
    id: navItemResult.data.id,
    placement: navItemResult.data.placement,
    label: navItemResult.data.label,
    href: navItemResult.data.href,
    iconKey: navItemResult.data.icon_key ?? "",
    sortOrder: navItemResult.data.sort_order,
    isActive: navItemResult.data.is_active,
    parentId: navItemResult.data.parent_id ?? null,
  }}
  navItems={allNavItemsResult.data ?? []}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/cms/admin-actions.ts \
        components/admin/cms-nav-item-form.tsx \
        app/admin/content/navigation/new/page.tsx \
        app/admin/content/navigation/\[id\]/edit/page.tsx
git commit -m "feat(cms): add hierarchical navigation support via parent_id"
```
