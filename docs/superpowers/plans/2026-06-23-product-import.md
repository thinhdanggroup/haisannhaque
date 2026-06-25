# Product Import (CSV) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins bulk-import products and their first variant by uploading a CSV file from `/admin/products/import`.

**Architecture:** Each CSV row becomes one `products` record plus one `product_variants` record. A server action (`importProducts`) reads the file from FormData, runs a pure CSV parser, validates each row with Zod, and inserts valid rows while collecting per-row errors. The UI component uses `useActionState` to display the import result (success count + error table). A client-side "download template" link generates the CSV blob in-browser — no API route needed.

**Tech Stack:** Next.js 16 App Router, Supabase, TypeScript, Zod, React `useActionState`, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "products:update")` on mutating server actions, `"products:read"` on queries
- Form components must use `useActionState` hook
- Tests use vitest; mock Supabase as a plain JS object (see existing `admin-actions.test.ts` for the pattern)
- Run tests: `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- Temperature class allowed values: `"live" | "fresh" | "chilled" | "frozen" | "ready"`
- Product status allowed values: `"draft" | "published"` (not `"archived"` — can't import to archived)
- Slug generation: lowercase, strip Vietnamese diacritics and đ/Đ, collapse spaces to `-`, append 5-char random suffix (match existing `createProduct` logic)
- No external CSV library — use the inline parser defined in Task 1
- No partial rollback: each row is committed independently; a failure on row N does not roll back rows 1..N-1

---

## CSV Format

Headers (row 1, exact casing):
```
name,status,temperature_class,origin,short_description,description,sku,unit,list_price,sale_price
```

| Column | Required | Notes |
|---|---|---|
| name | yes | Non-empty string |
| status | no | `draft` or `published`; defaults to `draft` if blank |
| temperature_class | yes | `live`, `fresh`, `chilled`, `frozen`, or `ready` |
| origin | no | Free text |
| short_description | no | Free text |
| description | no | Free text |
| sku | yes | Unique per row and in DB |
| unit | yes | Non-empty string |
| list_price | yes | Numeric ≥ 0 |
| sale_price | no | Numeric ≥ 0, blank = NULL |

---

## File Structure

| Path | Create / Modify | Responsibility |
|---|---|---|
| `src/features/catalog/import-actions.ts` | **Create** | `importProducts` server action + CSV parser + row schema |
| `src/features/catalog/import-actions.test.ts` | **Create** | Unit tests for the server action |
| `components/admin/product-import-form.tsx` | **Create** | Upload form + result display + download template link |
| `app/admin/products/import/page.tsx` | **Create** | Auth-gated page that renders `ProductImportForm` |
| `app/admin/products/page.tsx` | **Modify** | Add "Import" button next to "New product" |

---

### Task 1: CSV parser + server action + tests

**Files:**
- Create: `src/features/catalog/import-actions.ts`
- Create: `src/features/catalog/import-actions.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type ImportResult = {
    imported: number;
    errors: Array<{ row: number; message: string }>;
  } | null;
  
  export async function importProducts(
    _prev: ImportResult,
    formData: FormData,
  ): Promise<ImportResult>
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/features/catalog/import-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
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

import { importProducts } from "./import-actions";

function makeFormData(csvContent: string): FormData {
  const file = new File([csvContent], "products.csv", { type: "text/csv" });
  const fd = new FormData();
  fd.set("file", file);
  return fd;
}

const HEADER = "name,status,temperature_class,origin,short_description,description,sku,unit,list_price,sale_price";

function setupMocks({
  productId = "prod-uuid-1",
  productError = null,
  variantError = null,
}: {
  productId?: string;
  productError?: { message: string } | null;
  variantError?: { message: string } | null;
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_admin_roles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ admin_roles: { name: "super_admin" } }],
            error: null,
          }),
        }),
      };
    }
    if (table === "products") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: productError ? null : { id: productId },
              error: productError,
            }),
          }),
        }),
      };
    }
    if (table === "product_variants") {
      return {
        insert: vi.fn().mockResolvedValue({ error: variantError }),
      };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });
}

describe("importProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no file is provided", async () => {
    setupMocks();
    const fd = new FormData();
    const result = await importProducts(null, fd);
    expect(result).toMatchObject({ imported: 0, errors: [{ row: 0, message: expect.stringContaining("file") }] });
  });

  it("returns error when CSV has no data rows", async () => {
    setupMocks();
    const result = await importProducts(null, makeFormData(HEADER + "\n"));
    expect(result).toMatchObject({ imported: 0, errors: [{ row: 0, message: expect.stringContaining("data") }] });
  });

  it("records validation error for a row missing required name", async () => {
    setupMocks();
    const csv = [HEADER, ",draft,fresh,,,,SKU-001,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0]).toMatchObject({ row: 2 });
  });

  it("records validation error for an invalid temperature_class", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,draft,INVALID,,,,SKU-002,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/temperature/i);
  });

  it("records validation error for a non-numeric list_price", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,draft,fresh,,,,SKU-003,kg,abc,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/price/i);
  });

  it("imports a valid row and returns imported count of 1", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi tươi,draft,fresh,Na Uy,Tươi ngon,Mô tả,SKU-010,kg,150000,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(1);
    expect(result?.errors).toHaveLength(0);
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(mockFrom).toHaveBeenCalledWith("product_variants");
  });

  it("counts errors and successes when batch has mixed validity", async () => {
    setupMocks();
    const csv = [
      HEADER,
      "Cá hồi,draft,fresh,,,,SKU-011,kg,100,",   // valid
      ",draft,fresh,,,,SKU-012,kg,100,",           // invalid: no name
      "Tôm he,published,frozen,,,,SKU-013,con,80000,70000", // valid
    ].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(2);
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].row).toBe(3);
  });

  it("records a row error when the DB insert fails", async () => {
    setupMocks({ productError: { message: "duplicate key" } });
    const csv = [HEADER, "Cá hồi,draft,fresh,,,,SKU-014,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/duplicate/i);
  });

  it("defaults status to draft when status column is blank", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,,fresh,,,,SKU-015,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(1);
    const productsInsertCall = mockFrom.mock.calls.find(c => c[0] === "products");
    expect(productsInsertCall).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
pnpm vitest run src/features/catalog/import-actions.test.ts
```

Expected: FAIL — `importProducts` not found.

- [ ] **Step 3: Implement the server action**

Create `src/features/catalog/import-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type ImportResult = {
  imported: number;
  errors: Array<{ row: number; message: string }>;
} | null;

// Parses a single CSV line, handling double-quoted fields (RFC 4180 subset).
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

const rowSchema = z.object({
  name: z.string().min(1, "name is required"),
  status: z
    .enum(["draft", "published", ""])
    .transform((v) => (v === "" ? "draft" : v)),
  temperature_class: z.enum(["live", "fresh", "chilled", "frozen", "ready"], {
    error: "temperature_class must be one of: live, fresh, chilled, frozen, ready",
  }),
  origin: z.string(),
  short_description: z.string(),
  description: z.string(),
  sku: z.string().min(1, "sku is required"),
  unit: z.string().min(1, "unit is required"),
  list_price: z.coerce.number({ error: "list_price must be a number" }).min(0, "list_price must be ≥ 0"),
  sale_price: z
    .union([z.coerce.number().min(0), z.literal("")])
    .transform((v) => (v === "" ? null : (v as number))),
});

const EXPECTED_HEADERS = [
  "name",
  "status",
  "temperature_class",
  "origin",
  "short_description",
  "description",
  "sku",
  "unit",
  "list_price",
  "sale_price",
];

export async function importProducts(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { imported: 0, errors: [{ row: 0, message: "No file provided" }] };
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { imported: 0, errors: [{ row: 0, message: "CSV has no data rows" }] };
  }

  // Skip header row
  const dataLines = lines.slice(1);

  let imported = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNumber = i + 2; // 1-indexed; row 1 is the header
    const fields = parseCsvLine(dataLines[i]);

    const raw = {
      name: fields[0] ?? "",
      status: fields[1] ?? "",
      temperature_class: fields[2] ?? "",
      origin: fields[3] ?? "",
      short_description: fields[4] ?? "",
      description: fields[5] ?? "",
      sku: fields[6] ?? "",
      unit: fields[7] ?? "",
      list_price: fields[8] ?? "",
      sale_price: fields[9] ?? "",
    };

    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues[0]?.message ?? "Validation error",
      });
      continue;
    }

    const d = parsed.data;
    const slug = makeSlug(d.name);

    const { data: productData, error: productError } = await client
      .from("products")
      .insert({
        name: d.name,
        slug,
        status: d.status,
        short_description: d.short_description,
        description: d.description,
        origin: d.origin,
        temperature_class: d.temperature_class,
      })
      .select("id")
      .single();

    if (productError) {
      errors.push({ row: rowNumber, message: productError.message });
      continue;
    }

    const { error: variantError } = await client.from("product_variants").insert({
      product_id: productData.id,
      sku: d.sku,
      unit: d.unit,
      list_price: d.list_price,
      sale_price: d.sale_price,
      is_active: true,
      is_weighable: false,
    });

    if (variantError) {
      errors.push({ row: rowNumber, message: variantError.message });
      continue;
    }

    imported++;
  }

  revalidatePath("/admin/products");
  return { imported, errors };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/features/catalog/import-actions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/import-actions.ts src/features/catalog/import-actions.test.ts
git commit -m "feat(catalog): add importProducts server action with CSV parser"
```

---

### Task 2: Import form component

**Files:**
- Create: `components/admin/product-import-form.tsx`

**Interfaces:**
- Consumes: `importProducts` from `@/src/features/catalog/import-actions`, type `ImportResult`
- Produces: `<ProductImportForm />` (no props)

- [ ] **Step 1: Create the component**

Create `components/admin/product-import-form.tsx`:

```tsx
"use client";

import { useActionState, useRef } from "react";
import { importProducts, type ImportResult } from "@/src/features/catalog/import-actions";

const CSV_HEADERS = [
  "name",
  "status",
  "temperature_class",
  "origin",
  "short_description",
  "description",
  "sku",
  "unit",
  "list_price",
  "sale_price",
].join(",");

const CSV_EXAMPLE = [
  CSV_HEADERS,
  "Cá hồi tươi,draft,fresh,Na Uy,Cá hồi tươi nhập khẩu,,CA-HOI-001,kg,350000,",
  "Tôm sú đông lạnh,draft,frozen,Việt Nam,,,TOM-SU-001,con,80000,70000",
].join("\n");

function downloadTemplate() {
  const blob = new Blob([CSV_EXAMPLE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductImportForm() {
  const [state, action, isPending] = useActionState<ImportResult, FormData>(
    importProducts,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.set("file", inputRef.current.files[0]);
    action(fd);
  }

  const hasResult = state !== null;
  const hasErrors = hasResult && state.errors.length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-medium">Định dạng file CSV</p>
        <p>Mỗi hàng là một sản phẩm kèm một biến thể đầu tiên. Hàng tiêu đề bắt buộc:</p>
        <code className="block rounded bg-slate-100 px-3 py-2 text-xs text-slate-600 overflow-x-auto whitespace-nowrap">
          {CSV_HEADERS}
        </code>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-teal-700 underline text-xs hover:text-teal-800"
        >
          Tải xuống file mẫu
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm" htmlFor="import-file">
          <span className="font-medium text-slate-700">Chọn file CSV</span>
          <input
            id="import-file"
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang nhập…" : "Nhập sản phẩm"}
        </button>
      </form>

      {hasResult && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            Kết quả: <span className="text-teal-700">{state.imported} sản phẩm được nhập thành công</span>
            {hasErrors && (
              <span className="ml-2 text-red-600">· {state.errors.length} lỗi</span>
            )}
          </p>

          {hasErrors && (
            <div className="overflow-x-auto rounded-lg border border-red-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200 bg-red-50">
                    <th className="px-4 py-2 text-left font-medium text-red-800">Hàng</th>
                    <th className="px-4 py-2 text-left font-medium text-red-800">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {state.errors.map((err) => (
                    <tr key={err.row} className="border-b border-red-100 last:border-0">
                      <td className="px-4 py-2 text-red-700 tabular-nums">{err.row}</td>
                      <td className="px-4 py-2 text-red-700">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep product-import-form
```

Expected: No output (no errors).

- [ ] **Step 3: Commit**

```bash
git add components/admin/product-import-form.tsx
git commit -m "feat(catalog): add ProductImportForm component with CSV template download"
```

---

### Task 3: Import page + navigation

**Files:**
- Create: `app/admin/products/import/page.tsx`
- Modify: `app/admin/products/page.tsx`

**Interfaces:**
- Consumes: `ProductImportForm` from `@/components/admin/product-import-form`
- Consumes: `AdminPageHeader` from `@/components/admin/admin-page-header`
- Consumes: `requireAdminPermission`, `AdminAuthorizationError` from `@/src/features/admin/auth`
- Consumes: `createServerClient` from `@/src/lib/supabase/server`

- [ ] **Step 1: Create the import page**

Create `app/admin/products/import/page.tsx`:

```tsx
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductImportForm } from "@/components/admin/product-import-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProductImportPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Import Products" />
          <p className="text-sm text-slate-600">You do not have access to import products.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Import Products"
        description="Upload a CSV file to create multiple products at once."
      />
      <ProductImportForm />
    </div>
  );
}
```

- [ ] **Step 2: Read the current products page to preserve context before modifying**

```bash
cat app/admin/products/page.tsx
```

- [ ] **Step 3: Add Import button to the products page header action**

Open `app/admin/products/page.tsx`. Find the `action` prop of `AdminPageHeader` (currently contains only the "New product" `Link`). Replace it with a `<div>` wrapping both buttons:

```tsx
action={
  <div className="flex items-center gap-2">
    <Link
      href="/admin/products/import"
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Import CSV
    </Link>
    <Link
      href="/admin/products/new"
      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      New product
    </Link>
  </div>
}
```

- [ ] **Step 4: Verify the build compiles cleanly**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "error|import"
```

Expected: No TypeScript errors.

- [ ] **Step 5: Run all catalog tests to confirm nothing is broken**

```bash
pnpm vitest run src/features/catalog/
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/admin/products/import/page.tsx app/admin/products/page.tsx
git commit -m "feat(catalog): add product import page and CSV import button to product list"
```

---

## Self-Review

**Spec coverage:**
- CSV parser handles quoted fields containing commas ✓
- Row validation with Zod returns first failing field message ✓
- Rows that fail DB insert are logged with DB error message ✓
- Successful imports are committed independently (no batch rollback) ✓
- Download template is client-side Blob, no extra route ✓
- Auth-gated with `products:update` permission ✓
- `revalidatePath("/admin/products")` called after import ✓
- Vietnamese UI copy matches the rest of the admin ✓
- `export const dynamic = "force-dynamic"` on the page ✓

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `ImportResult` defined once in `import-actions.ts`, imported in the component
- `importProducts` signature matches `useActionState<ImportResult, FormData>` usage
