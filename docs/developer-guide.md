# Developer Guide

This guide explains how to write code for this repository. Read it before adding any feature.

---

## Table of Contents

1. [Stack and Tools](#1-stack-and-tools)
2. [Local Setup](#2-local-setup)
3. [Architecture Overview](#3-architecture-overview)
4. [Directory Structure](#4-directory-structure)
5. [The Request Lifecycle](#5-the-request-lifecycle)
6. [Feature Module Pattern](#6-feature-module-pattern)
7. [Supabase Clients — Which One to Use](#7-supabase-clients--which-one-to-use)
8. [Server Actions](#8-server-actions)
9. [Database Conventions](#9-database-conventions)
10. [Admin Feature Pattern](#10-admin-feature-pattern)
11. [Storefront Feature Pattern](#11-storefront-feature-pattern)
12. [Testing Conventions](#12-testing-conventions)
13. [Image Handling](#13-image-handling)
14. [Common Gotchas](#14-common-gotchas)

---

## 1. Stack and Tools

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (SSR cookie-based) |
| Styling | Tailwind CSS |
| Validation | Zod v4 |
| Testing | Vitest (unit), Playwright (e2e) |
| Package manager | pnpm |

> **Important:** This is Next.js 16, not 14 or 15. Some APIs differ from older docs. Always check `node_modules/next/dist/docs/` for the version you're running on. Route params are `Promise<{ id: string }>` and must be `await`ed.

---

## 2. Local Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Start dev server (Turbopack)
pnpm dev

# Run all tests
pnpm test

# Run a single test file
pnpm test src/features/catalog/queries.test.ts

# Lint
pnpm lint

# Full Docker stack (app + local Supabase)
docker compose up --build
```

### Creating the first admin user

```bash
node scripts/create-user.mjs       # creates admin@dao-seafood.vn / Admin@123456
node scripts/assign-admin.mjs      # grants super_admin role
```

---

## 3. Architecture Overview

```
Browser
  │
  ├── Storefront  app/(storefront)/     Public-facing shop
  ├── Account     app/account/          Customer account pages
  └── Admin       app/admin/            Operations dashboard
        │
        ├── Server Components (data fetching)
        ├── Client Components (interactivity)
        └── Server Actions (mutations)
              │
              └── Supabase (PostgreSQL + Auth + RLS)
```

The app is a **modular monolith**:
- All domain logic lives in `src/features/<domain>/`
- All UI lives in `components/`
- All pages live in `app/`
- The database is the single source of truth

There are no background jobs, queues, or caches beyond Next.js route cache. Keep mutations synchronous.

---

## 4. Directory Structure

```
app/
  (storefront)/          # Public storefront (route group, no layout prefix)
    page.tsx             # Homepage
    products/[slug]/     # Product detail
    cart/                # Cart
    search/              # Search
  (admin-auth)/
    admin/login/         # Admin login (OUTSIDE the admin layout)
  account/               # Customer account (authenticated)
  admin/                 # Admin dashboard (authenticated)
    products/
      page.tsx           # Product list
      [id]/edit/
        page.tsx         # Product edit
  api/
    admin/images/        # Upload endpoint (admin-only)
    images/[filename]/   # Serve locally uploaded images (public)
    orders/              # Checkout order creation
    payments/            # Payment intents + webhooks

components/
  admin/                 # Admin UI components
  storefront/            # Storefront UI components

src/
  features/
    account/             # Session helpers
    admin/               # RBAC: permissions, auth guard
    cart/                # Cart actions, schema, types, pricing
    catalog/             # Product queries, admin actions, image actions
    checkout/            # Checkout schema + RPC wrapper
    cms/                 # Homepage content queries + types
    inventory/           # Stock adjustment
    loyalty/             # Points calculation
    orders/              # Order status model
    payments/            # Payment normalization + webhooks
    procurement/         # Purchase orders
    refunds/             # Refund schema
    complaints/          # Complaint schema
    reports/             # Report RPC wrappers
    wishlist/            # Wishlist actions
  lib/
    supabase/
      server.ts          # Cookie-based client (use in Server Components + Actions)
      admin.ts           # Service-role client (bypasses RLS — server-only)
      browser.ts         # Browser client (Client Components)
      url.ts             # Internal URL helper
    env.ts               # Validated environment variables
    format.ts            # formatVnd, calculateDiscountPercent, etc.
    seo/                 # JSON-LD generation

supabase/
  migrations/            # Ordered, append-only SQL migrations
  seed.sql               # Default roles + HCM-01 warehouse

docs/                    # Project documentation (you are here)
tests/
  e2e/                   # Playwright smoke tests
  integration/           # SQL integration tests
```

---

## 5. The Request Lifecycle

### Reading data (Server Component)

```ts
// app/admin/products/page.tsx
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export default async function ProductsPage() {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:read");

  const { data, error } = await client
    .from("products")
    .select("id, name, status")
    .order("created_at", { ascending: false });

  if (error) throw error;
  // render...
}
```

### Mutating data (Server Action)

```ts
// src/features/catalog/admin-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const schema = z.object({ id: z.string().uuid(), name: z.string().min(1) });

export async function updateProduct(_prev: State, formData: FormData): Promise<State> {
  // 1. Auth first — before any validation
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  // 2. Then validate
  const result = schema.safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  // 3. Then mutate
  const { error } = await client.from("products").update({ name: result.data.name }).eq("id", result.data.id);
  if (error) throw error;

  // 4. Revalidate affected routes
  revalidatePath("/admin/products");
  redirect("/admin/products"); // throws internally — do NOT put inside try/catch
}
```

### Calling a Server Action from a Client Component

```tsx
"use client";
import { useActionState } from "react";
import { updateProduct } from "@/src/features/catalog/admin-actions";

export function MyForm() {
  const [state, action, isPending] = useActionState(updateProduct, null);
  return <form action={action}>...</form>;
}
```

---

## 6. Feature Module Pattern

Each feature module in `src/features/<domain>/` contains:

```
src/features/catalog/
  types.ts           # Domain types (pure TS, no Supabase)
  schema.ts          # Zod schemas for inputs
  queries.ts         # Read functions (take a Supabase client, return domain types)
  actions.ts         # "use server" mutation functions
  admin-actions.ts   # Admin-only mutations (requires permission check)
  *.test.ts          # Co-located Vitest tests
```

**Rules:**
- `types.ts` has zero imports from Supabase or Next.js — just TypeScript types.
- `queries.ts` functions accept a `SupabaseClient` argument (don't create the client inside). This makes them testable.
- `actions.ts` is a `"use server"` file. It creates the client itself.
- Never import from `admin.ts` (service-role client) in storefront code.

---

## 7. Supabase Clients — Which One to Use

| Client | File | When to use |
|--------|------|-------------|
| `createServerClient()` | `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers — respects RLS |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Service-role operations that bypass RLS (cart, admin scripts) — **server-only** |
| `createBrowserClient()` | `src/lib/supabase/browser.ts` | Client Components that need Supabase directly |

> **Never** import `createAdminClient` from a Client Component or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

The server client uses cookies for token refresh. Always run `middleware.ts` — without it, expired tokens cause redirect loops.

---

## 8. Server Actions

### Rules

1. **Auth before validation.** Call `requireAdminPermission` (or check user session) before parsing input. Don't let unauthenticated callers learn your schema shape from validation errors.

2. **Zod v4 API.** Access errors via `.issues`, not `.errors`:
   ```ts
   result.error.issues[0]?.message  // ✓ correct
   result.error.errors[0]?.message  // ✗ removed in Zod v4
   ```

3. **`redirect()` must not be inside try/catch.** It throws internally. Wrap only the Supabase error, not the redirect:
   ```ts
   const { error } = await client.from("products").update(...);
   if (error) throw error;       // ← only this can throw normally
   revalidatePath("/admin/products");
   redirect("/admin/products");  // ← must be outside try/catch
   ```

4. **Validate IDs as UUIDs.** Never pass raw string IDs to the DB without a `z.string().uuid()` check:
   ```ts
   const parsed = z.string().uuid().safeParse(id);
   if (!parsed.success) throw new Error("Invalid id");
   ```

5. **Revalidate after mutations.** Call `revalidatePath()` with the affected route before redirecting.

### State type pattern

```ts
export type MyActionState = { error: string } | null;

export async function myAction(_prev: MyActionState, formData: FormData): Promise<MyActionState> {
  // ...
  return null; // success
}
```

---

## 9. Database Conventions

### Migrations

- Files go in `supabase/migrations/` with name format `YYYYMMDDNNNN_description.sql`
- They are **append-only** — never edit a migration that has been applied
- New schema changes always go in a new file

### Soft-delete

| Table | Mechanism |
|-------|-----------|
| `products` | `status = 'archived'` (enum: `draft \| published \| archived`) |
| `product_variants` | `is_active = false` |
| `categories` | `is_active = false` |
| `warehouses` | `is_active = false` |

Archive a product by setting `status = 'archived'` — catalog RPCs already filter archived products from public results.

### RLS

Every table has RLS enabled. Three tiers of policies:

- **Public** — anonymous read (e.g. published products, categories)
- **Customer** — read/write own data (orders, cart, wishlist) — tied to `auth.uid()`
- **Admin** — full access via `user_admin_roles` join

For operations that need to bypass RLS (e.g. anonymous cart creation), use `createAdminClient()` from a server-only context.

### Permissions (RBAC)

Permissions are defined in `src/features/admin/permissions.ts`:

```ts
const rolePermissions = {
  super_admin: ["*"],
  catalog_manager: ["products:read", "products:create", "products:update", "products:delete", "categories:update"],
  // ...
};
```

Enforce in server actions:
```ts
await requireAdminPermission(client, "products:update");
// throws AdminAuthorizationError if user lacks the permission
```

Enforce in pages (soft — show message, don't throw):
```ts
try {
  await requireAdminPermission(client, "products:read");
} catch (error) {
  if (error instanceof AdminAuthorizationError) return <AccessDenied />;
  throw error;
}
```

---

## 10. Admin Feature Pattern

Follow this pattern when adding a new admin entity (e.g. "Suppliers").

### Step 1 — Add permission

```ts
// src/features/admin/permissions.ts
procurement: ["purchase_orders:read", "purchase_orders:update", "suppliers:update", "suppliers:delete"],
```

### Step 2 — Create server actions

```ts
// src/features/procurement/admin-actions.ts
"use server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type UpdateSupplierState = { error: string } | null;

export async function updateSupplier(_prev: UpdateSupplierState, formData: FormData): Promise<UpdateSupplierState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update"); // auth first

  const result = z.object({ id: z.string().uuid(), name: z.string().min(1) })
    .safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid." };

  const { error } = await client.from("suppliers").update({ name: result.data.name }).eq("id", result.data.id);
  if (error) throw error;

  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function archiveSupplier(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid supplier id");

  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:delete");

  const { error } = await client.from("suppliers").update({ is_active: false }).eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/suppliers");
}
```

### Step 3 — Create the list page

```tsx
// app/admin/suppliers/page.tsx
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierRowActions } from "@/components/admin/supplier-row-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return <div><AdminPageHeader title="Suppliers" /><p>No access.</p></div>;
    }
    throw error;
  }

  const { data, error } = await client
    .from("suppliers")
    .select("id, name, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return (
    <div>
      <AdminPageHeader title="Suppliers" />
      <AdminDataTable
        columns={[{ key: "name", label: "Name" }]}
        rows={data ?? []}
        actionsSlot={(row) => <SupplierRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
```

### Step 4 — Create the row actions client component

```tsx
// components/admin/supplier-row-actions.tsx
"use client";
import Link from "next/link";
import { archiveSupplier } from "@/src/features/procurement/admin-actions";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/admin/suppliers/${id}/edit`} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Edit
      </Link>
      <form action={archiveSupplier.bind(null, id)} onSubmit={(e) => { if (!confirm(`Archive "${name}"?`)) e.preventDefault(); }}>
        <button type="submit" className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
          Archive
        </button>
      </form>
    </div>
  );
}
```

### Step 5 — Create the edit page

Split into server page (data fetch + auth) + client form (useActionState):

```tsx
// app/admin/suppliers/[id]/edit/page.tsx  ← server component
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierEditForm } from "@/components/admin/supplier-edit-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function SupplierEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "suppliers:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return <div><AdminPageHeader title="Edit Supplier" /><p>No access.</p></div>;
    }
    throw error;
  }

  const { data: supplier, error } = await client.from("suppliers").select("id, name").eq("id", id).single();
  if (error || !supplier) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit Supplier" description={supplier.name} />
      <SupplierEditForm id={supplier.id} name={supplier.name} />
    </div>
  );
}
```

```tsx
// components/admin/supplier-edit-form.tsx  ← client component
"use client";
import { useActionState } from "react";
import { updateSupplier, type UpdateSupplierState } from "@/src/features/procurement/admin-actions";

export function SupplierEditForm({ id, name }: { id: string; name: string }) {
  const [state, action, isPending] = useActionState<UpdateSupplierState, FormData>(updateSupplier, null);

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="id" value={id} />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Tên</span>
        <input name="name" defaultValue={name} required className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600" />
      </label>
      <button type="submit" disabled={isPending} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {isPending ? "Đang lưu…" : "Lưu"}
      </button>
    </form>
  );
}
```

---

## 11. Storefront Feature Pattern

### Reading data in a Server Component

Query functions live in `src/features/<domain>/queries.ts` and accept a Supabase client:

```ts
// src/features/catalog/queries.ts
export async function getProductBySlug(client: SupabaseClient, slug: string): Promise<ProductDetail | null> {
  const { data, error } = await client
    .from("products")
    .select("id, slug, name, ...product_images(url, alt_text, sort_order), ...product_variants(...)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) return null;
  return mapProductDetailRow(data);
}
```

Call it from the page:

```ts
// app/(storefront)/products/[slug]/page.tsx
const client = await createServerClient();
const product = await getProductBySlug(client, slug);
```

### Row mapping pattern

Always define explicit row types (what comes from Supabase) and domain types (what the app uses), and map between them:

```ts
// Row type — matches DB column names (snake_case)
type ProductDetailRow = { id: string; short_description: string | null; ... };

// Domain type — matches TypeScript conventions (camelCase)
export type ProductDetail = { id: string; shortDescription: string | null; ... };

// Mapper
function mapProductDetailRow(row: ProductDetailRow): ProductDetail {
  return { id: row.id, shortDescription: row.short_description, ... };
}
```

Never return raw Supabase row objects from query functions. Always map to domain types.

### Interactive storefront components

Keep pages as Server Components. Extract only the interactive parts into Client Components:

```
app/(storefront)/products/[slug]/page.tsx     ← Server Component (fetch data)
components/storefront/product-detail-view.tsx ← Server Component (layout)
components/storefront/add-to-cart-controls.tsx ← Client Component (variant select, quantity, button)
```

Pass only serialisable data (strings, numbers, plain objects) across the server/client boundary.

---

## 12. Testing Conventions

### Unit tests (Vitest)

Co-locate test files next to the code they test:

```
src/features/catalog/queries.ts
src/features/catalog/catalog.test.ts    ← tests for queries.ts
src/features/catalog/admin-actions.ts
src/features/catalog/admin-actions.test.ts
```

Mock Supabase and Next.js modules at the top of the test file before imports:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { myAction } from "./actions"; // import after mocks
```

When mocking `requireAdminPermission` (inside `from("user_admin_roles")`), make `mockFrom` return an object with both `update` (for the entity table) and `select` (for the roles lookup):

```ts
mockFrom.mockReturnValue({
  update: mockUpdate,
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
  }),
});
```

### What to test

| What | How |
|------|-----|
| Query mappers | Unit test with plain objects, no Supabase mock needed |
| Server actions | Mock Supabase, assert which table was called and with what args |
| Zod schemas | Test valid and invalid inputs with `.safeParse()` |
| Pricing / calculation logic | Pure function tests, no mocks needed |

### Running tests

```bash
pnpm test                                    # all tests
pnpm test src/features/catalog               # filter by path
pnpm test:watch                              # watch mode
```

---

## 13. Image Handling

### Product images (database)

Images are stored in `product_images` table: `(id, product_id, url, alt_text, sort_order)`.

The `url` field is a plain text URL — it can be:
- An external URL (`https://example.com/img.jpg`)
- A local upload URL (`/api/images/uuid.jpg`)

### Local image upload (temp solution)

For development, images can be uploaded via the admin product edit page:

- **Upload:** `POST /api/admin/images` with `multipart/form-data` (`file` + `productId`) — admin only, saves to `./uploads/` directory, inserts into `product_images`
- **Serve:** `GET /api/images/[filename]` — public, reads from `./uploads/`

The `uploads/` directory is gitignored. Images are lost if the server is restarted in a fresh environment.

### Using `next/image`

All `<Image>` components use `unoptimized` since local images are served from our own API (not a CDN):

```tsx
<Image src={product.imageUrl} alt={product.name} fill className="object-cover" unoptimized />
```

For external images from known CDNs, add the hostname to `next.config.ts` `remotePatterns` and remove `unoptimized`.

---

## 14. Common Gotchas

### `redirect()` must not be inside try/catch

`redirect()` from `next/navigation` throws a special internal error. Wrapping it in try/catch swallows the redirect:

```ts
// ✗ Wrong — redirect is swallowed
try {
  const { error } = await client.from("products").update(...);
  if (error) throw error;
  redirect("/admin/products"); // this throws, caught by catch
} catch (e) {
  return { error: "failed" }; // always runs!
}

// ✓ Correct
const { error } = await client.from("products").update(...);
if (error) throw error;
revalidatePath("/admin/products");
redirect("/admin/products"); // outside try/catch
```

### Route params are async in Next.js 16

```ts
// ✗ Wrong
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id; // TypeError in Next.js 16
}

// ✓ Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Supabase nested relation shape

Supabase returns nested relations as `T | T[] | null` depending on cardinality. Always normalise before using:

```ts
const variant = Array.isArray(row.product_variants) ? row.product_variants[0] : row.product_variants;
```

Or use the `asArray` / `firstRelation` helper in `src/features/cms/queries.ts`.

### Zod v4 uses `.issues` not `.errors`

```ts
result.error.issues[0]?.message  // ✓
result.error.errors[0]?.message  // ✗ removed in Zod v4
```

### Turbopack requires `root` in `next.config.ts`

The `turbopack.root: process.cwd()` line in `next.config.ts` is required. Removing it causes Turbopack to panic with "Next.js package not found".

### Admin login page is in a route group

`/admin/login` lives at `app/(admin-auth)/admin/login/` — **not** inside `app/admin/`. This prevents the admin layout's auth redirect from catching the login page itself and causing an infinite loop.

### `createAdminClient()` must never be called from client code

The service-role key bypasses all RLS. Only call it from:
- Server Actions (`"use server"` files)
- Route Handlers (`app/api/*/route.ts`)
- Server Components

Never import it in any file that could be bundled for the browser.

### Cookie-based cart

The cart is identified by a `cart_id` cookie (30 days, httpOnly). It is created automatically on the first "Add to cart" action. The `carts` table has RLS that only allows customer-owned carts, so cart operations use `createAdminClient()` to bypass RLS for session-based (anonymous) carts.

### Soft-delete vs hard delete

Never hard-delete products, variants, categories, or suppliers. Use the soft-delete mechanism (set `status = 'archived'` or `is_active = false`). Hard-delete breaks referential integrity with existing orders and cart items.
