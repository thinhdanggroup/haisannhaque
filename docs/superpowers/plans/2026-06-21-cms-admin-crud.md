# CMS Admin CRUD Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire full create/edit/delete flows for all six CMS entities (pages, sections, banners, navigation items, footer links, brand assets) in the `/admin/content` dashboard.

**Architecture:** Server actions (`"use server"`) in `src/features/cms/admin-actions.ts` handle all mutations with Zod validation and `requireAdminPermission("cms:update")`; client form components use `useActionState` and receive the server action as a prop so create and edit share the same JSX; a shared `CmsRowActions` client component receives a bound delete server action and an `editHref` from the server component that renders the table.

**Tech Stack:** Next.js 16 App Router, Supabase JS client, Zod v3, React 19 `useActionState`, Tailwind CSS, Lucide React icons.

## Global Constraints

- Permission guard: always call `requireAdminPermission(client, "cms:update")` before every mutation.
- All pages are server components with `export const dynamic = "force-dynamic"`.
- `params` and `searchParams` are `Promise<…>` in Next 16 — always `await` them.
- Supabase client: `createServerClient()` from `@/src/lib/supabase/server`.
- Auth error handling: catch `AdminAuthorizationError`, render a denied message — don't throw.
- Revalidate `/admin/content` after every mutation; redirect there afterward.
- No new dependencies — only packages already in `package.json`.
- Commits go directly to `main`.

---

## File Map

| File | Action |
|------|--------|
| `src/features/cms/admin-actions.ts` | **Create** — 18 server actions (create/update/delete × 6 entities) |
| `src/features/cms/admin-actions.test.ts` | **Create** — unit tests for server actions |
| `components/admin/cms-row-actions.tsx` | **Create** — shared Edit + Delete row actions client component |
| `app/admin/content/page.tsx` | **Modify** — add `id` to queries, wire `actionsSlot` + New links |
| `components/admin/cms-page-form.tsx` | **Create** — create/edit form for CMS pages |
| `app/admin/content/pages/new/page.tsx` | **Create** — new page route |
| `app/admin/content/pages/[pageKey]/edit/page.tsx` | **Create** — edit page route |
| `components/admin/cms-section-form.tsx` | **Create** — create/edit form for CMS sections |
| `app/admin/content/sections/new/page.tsx` | **Create** — new section route |
| `app/admin/content/sections/[id]/edit/page.tsx` | **Create** — edit section route |
| `components/admin/cms-banner-form.tsx` | **Create** — create/edit form for banners |
| `app/admin/content/banners/new/page.tsx` | **Create** — new banner route |
| `app/admin/content/banners/[id]/edit/page.tsx` | **Create** — edit banner route |
| `components/admin/cms-nav-item-form.tsx` | **Create** — create/edit form for nav items |
| `app/admin/content/navigation/new/page.tsx` | **Create** — new nav item route |
| `app/admin/content/navigation/[id]/edit/page.tsx` | **Create** — edit nav item route |
| `components/admin/cms-footer-link-form.tsx` | **Create** — create/edit form for footer links |
| `app/admin/content/footer-links/new/page.tsx` | **Create** — new footer link route |
| `app/admin/content/footer-links/[id]/edit/page.tsx` | **Create** — edit footer link route |
| `components/admin/cms-brand-asset-form.tsx` | **Create** — create/edit form for brand assets |
| `app/admin/content/brand-assets/new/page.tsx` | **Create** — new brand asset route |
| `app/admin/content/brand-assets/[id]/edit/page.tsx` | **Create** — edit brand asset route |

---

## Task 1: Server Actions for All Six CMS Entities

**Files:**
- Create: `src/features/cms/admin-actions.ts`
- Create: `src/features/cms/admin-actions.test.ts`

**Interfaces:**
- Produces: `createCmsPage`, `updateCmsPage`, `deleteCmsPage`, `createCmsSection`, `updateCmsSection`, `deleteCmsSection`, `createCmsBanner`, `updateCmsBanner`, `deleteCmsBanner`, `createCmsNavItem`, `updateCmsNavItem`, `deleteCmsNavItem`, `createCmsFooterLink`, `updateCmsFooterLink`, `deleteCmsFooterLink`, `createCmsBrandAsset`, `updateCmsBrandAsset`, `deleteCmsBrandAsset`
- Produces types: `CmsPageState`, `CmsSectionState`, `CmsBannerState`, `CmsNavItemState`, `CmsFooterLinkState`, `CmsBrandAssetState` (all `{ error: string } | null`)

- [ ] **Step 1: Write the failing tests**

Create `src/features/cms/admin-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
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

import {
  createCmsPage,
  deleteCmsPage,
  createCmsNavItem,
  deleteCmsNavItem,
} from "./admin-actions";

function makeAdminChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ admin_roles: { name: "super_admin" } }],
        error: null,
      }),
    }),
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };
}

describe("createCmsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const insertChain = { error: null };
    mockInsert.mockResolvedValue(insertChain);
    mockFrom.mockReturnValue(makeAdminChain());
  });

  it("returns error when pageKey is empty", async () => {
    const fd = new FormData();
    fd.set("pageKey", "");
    fd.set("title", "Home");
    fd.set("status", "published");
    const result = await createCmsPage(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when pageKey contains uppercase", async () => {
    const fd = new FormData();
    fd.set("pageKey", "Home-Page");
    fd.set("title", "Home");
    fd.set("status", "published");
    const result = await createCmsPage(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("lowercase") });
  });

  it("inserts and redirects on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("pageKey", "home");
    fd.set("title", "Home");
    fd.set("status", "published");
    await createCmsPage(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("cms_pages");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ page_key: "home", title: "Home", status: "published" }),
    );
    expect(redirect).toHaveBeenCalledWith("/admin/content");
  });
});

describe("deleteCmsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    mockDelete.mockReturnValue(deleteChain);
    mockFrom.mockReturnValue({ ...makeAdminChain(), delete: mockDelete });
  });

  it("throws for an empty page key", async () => {
    await expect(deleteCmsPage("")).rejects.toThrow("Invalid page key.");
  });

  it("deletes by page_key for a valid key", async () => {
    await deleteCmsPage("home");
    expect(mockFrom).toHaveBeenCalledWith("cms_pages");
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("createCmsNavItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(makeAdminChain());
  });

  it("returns error when label is empty", async () => {
    const fd = new FormData();
    fd.set("placement", "header");
    fd.set("label", "");
    fd.set("href", "/");
    fd.set("iconKey", "");
    fd.set("sortOrder", "0");
    fd.set("isActive", "true");
    const result = await createCmsNavItem(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("Label") });
  });

  it("inserts on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("placement", "header");
    fd.set("label", "Home");
    fd.set("href", "/");
    fd.set("iconKey", "");
    fd.set("sortOrder", "10");
    fd.set("isActive", "true");
    await createCmsNavItem(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("cms_navigation_items");
    expect(redirect).toHaveBeenCalledWith("/admin/content");
  });
});

describe("deleteCmsNavItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    mockDelete.mockReturnValue(deleteChain);
    mockFrom.mockReturnValue({ ...makeAdminChain(), delete: mockDelete });
  });

  it("throws for a non-UUID id", async () => {
    await expect(deleteCmsNavItem("not-a-uuid")).rejects.toThrow("Invalid nav item id.");
  });

  it("deletes by id for a valid UUID", async () => {
    await deleteCmsNavItem("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(mockFrom).toHaveBeenCalledWith("cms_navigation_items");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test src/features/cms/admin-actions.test.ts
```

Expected: all tests fail with `Cannot find module './admin-actions'`.

- [ ] **Step 3: Implement `src/features/cms/admin-actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

// ── Types ──────────────────────────────────────────────────────────────────

export type CmsPageState = { error: string } | null;
export type CmsSectionState = { error: string } | null;
export type CmsBannerState = { error: string } | null;
export type CmsNavItemState = { error: string } | null;
export type CmsFooterLinkState = { error: string } | null;
export type CmsBrandAssetState = { error: string } | null;

// ── CMS Pages ──────────────────────────────────────────────────────────────

const cmsPageCreateSchema = z.object({
  pageKey: z
    .string()
    .min(1, "Page key is required")
    .regex(/^[a-z0-9-]+$/, "Page key must be lowercase letters, digits, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["draft", "published", "archived"]),
});

const cmsPageUpdateSchema = z.object({
  pageKey: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["draft", "published", "archived"]),
});

export async function createCmsPage(
  _prev: CmsPageState,
  formData: FormData,
): Promise<CmsPageState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsPageCreateSchema.safeParse({
    pageKey: formData.get("pageKey"),
    title: formData.get("title"),
    status: formData.get("status"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_pages").insert({
    page_key: result.data.pageKey,
    title: result.data.title,
    status: result.data.status,
  });

  if (error) {
    if (error.code === "23505") return { error: "A page with this key already exists." };
    throw error;
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsPage(
  _prev: CmsPageState,
  formData: FormData,
): Promise<CmsPageState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsPageUpdateSchema.safeParse({
    pageKey: formData.get("pageKey"),
    title: formData.get("title"),
    status: formData.get("status"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_pages")
    .update({ title: result.data.title, status: result.data.status, updated_at: new Date().toISOString() })
    .eq("page_key", result.data.pageKey);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsPage(pageKey: string): Promise<void> {
  const parsed = z.string().min(1).safeParse(pageKey);
  if (!parsed.success) throw new Error("Invalid page key.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_pages").delete().eq("page_key", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}

// ── CMS Sections ───────────────────────────────────────────────────────────

const SECTION_TYPES = [
  "hero",
  "service_strip",
  "category_shortcuts",
  "product_rail",
  "flash_sale",
  "promo_band",
  "recommendation_tabs",
  "partner_strip",
  "content_highlights",
  "footer",
] as const;

const cmsSectionCreateSchema = z.object({
  pageKey: z.string().min(1, "Page is required"),
  sectionKey: z
    .string()
    .min(1, "Section key is required")
    .regex(/^[a-z0-9-]+$/, "Section key must be lowercase letters, digits, and hyphens"),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string(),
  subtitle: z.string(),
  layout: z.string().min(1, "Layout is required"),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const cmsSectionUpdateSchema = z.object({
  id: z.string().uuid(),
  sectionKey: z.string().min(1, "Section key is required"),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string(),
  subtitle: z.string(),
  layout: z.string().min(1, "Layout is required"),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function createCmsSection(
  _prev: CmsSectionState,
  formData: FormData,
): Promise<CmsSectionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsSectionCreateSchema.safeParse({
    pageKey: formData.get("pageKey"),
    sectionKey: formData.get("sectionKey"),
    sectionType: formData.get("sectionType"),
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    layout: formData.get("layout") || "default",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_sections").insert({
    page_key: result.data.pageKey,
    section_key: result.data.sectionKey,
    section_type: result.data.sectionType,
    title: result.data.title || null,
    subtitle: result.data.subtitle || null,
    layout: result.data.layout,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "A section with this key already exists on that page." };
    throw error;
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsSection(
  _prev: CmsSectionState,
  formData: FormData,
): Promise<CmsSectionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsSectionUpdateSchema.safeParse({
    id: formData.get("id"),
    sectionKey: formData.get("sectionKey"),
    sectionType: formData.get("sectionType"),
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    layout: formData.get("layout") || "default",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_sections")
    .update({
      section_key: result.data.sectionKey,
      section_type: result.data.sectionType,
      title: result.data.title || null,
      subtitle: result.data.subtitle || null,
      layout: result.data.layout,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsSection(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid section id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_sections").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}

// ── CMS Banners ────────────────────────────────────────────────────────────

const cmsBannerCreateSchema = z.object({
  sectionId: z.string().uuid("Section is required"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string(),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  mobileImageUrl: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const cmsBannerUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string(),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  mobileImageUrl: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function createCmsBanner(
  _prev: CmsBannerState,
  formData: FormData,
): Promise<CmsBannerState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsBannerCreateSchema.safeParse({
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle") ?? "",
    imageUrl: formData.get("imageUrl"),
    mobileImageUrl: formData.get("mobileImageUrl") ?? "",
    ctaLabel: formData.get("ctaLabel") ?? "",
    ctaHref: formData.get("ctaHref") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_banners").insert({
    section_id: result.data.sectionId,
    title: result.data.title,
    subtitle: result.data.subtitle || null,
    image_url: result.data.imageUrl,
    mobile_image_url: result.data.mobileImageUrl || null,
    cta_label: result.data.ctaLabel || null,
    cta_href: result.data.ctaHref || null,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsBanner(
  _prev: CmsBannerState,
  formData: FormData,
): Promise<CmsBannerState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsBannerUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle") ?? "",
    imageUrl: formData.get("imageUrl"),
    mobileImageUrl: formData.get("mobileImageUrl") ?? "",
    ctaLabel: formData.get("ctaLabel") ?? "",
    ctaHref: formData.get("ctaHref") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_banners")
    .update({
      title: result.data.title,
      subtitle: result.data.subtitle || null,
      image_url: result.data.imageUrl,
      mobile_image_url: result.data.mobileImageUrl || null,
      cta_label: result.data.ctaLabel || null,
      cta_href: result.data.ctaHref || null,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsBanner(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid banner id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_banners").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}

// ── CMS Navigation Items ───────────────────────────────────────────────────

const NAV_PLACEMENTS = ["header", "sidebar", "mobile_dock", "footer"] as const;

const cmsNavItemCreateSchema = z.object({
  placement: z.enum(NAV_PLACEMENTS),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  iconKey: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const cmsNavItemUpdateSchema = z.object({
  id: z.string().uuid(),
  placement: z.enum(NAV_PLACEMENTS),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  iconKey: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function createCmsNavItem(
  _prev: CmsNavItemState,
  formData: FormData,
): Promise<CmsNavItemState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsNavItemCreateSchema.safeParse({
    placement: formData.get("placement"),
    label: formData.get("label"),
    href: formData.get("href"),
    iconKey: formData.get("iconKey") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_navigation_items").insert({
    placement: result.data.placement,
    label: result.data.label,
    href: result.data.href,
    icon_key: result.data.iconKey || null,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "A navigation item with this placement, label, and href already exists." };
    throw error;
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsNavItem(
  _prev: CmsNavItemState,
  formData: FormData,
): Promise<CmsNavItemState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsNavItemUpdateSchema.safeParse({
    id: formData.get("id"),
    placement: formData.get("placement"),
    label: formData.get("label"),
    href: formData.get("href"),
    iconKey: formData.get("iconKey") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_navigation_items")
    .update({
      placement: result.data.placement,
      label: result.data.label,
      href: result.data.href,
      icon_key: result.data.iconKey || null,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsNavItem(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid nav item id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_navigation_items").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}

// ── CMS Footer Links ───────────────────────────────────────────────────────

const cmsFooterLinkCreateSchema = z.object({
  groupLabel: z.string().min(1, "Group is required"),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const cmsFooterLinkUpdateSchema = z.object({
  id: z.string().uuid(),
  groupLabel: z.string().min(1, "Group is required"),
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function createCmsFooterLink(
  _prev: CmsFooterLinkState,
  formData: FormData,
): Promise<CmsFooterLinkState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsFooterLinkCreateSchema.safeParse({
    groupLabel: formData.get("groupLabel"),
    label: formData.get("label"),
    href: formData.get("href"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_footer_links").insert({
    group_label: result.data.groupLabel,
    label: result.data.label,
    href: result.data.href,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "A footer link with this group, label, and href already exists." };
    throw error;
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsFooterLink(
  _prev: CmsFooterLinkState,
  formData: FormData,
): Promise<CmsFooterLinkState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsFooterLinkUpdateSchema.safeParse({
    id: formData.get("id"),
    groupLabel: formData.get("groupLabel"),
    label: formData.get("label"),
    href: formData.get("href"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_footer_links")
    .update({
      group_label: result.data.groupLabel,
      label: result.data.label,
      href: result.data.href,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsFooterLink(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid footer link id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_footer_links").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}

// ── CMS Brand Assets ───────────────────────────────────────────────────────

const BRAND_PLACEMENTS = ["partner", "payment", "trust", "brand"] as const;

const cmsBrandAssetCreateSchema = z.object({
  assetKey: z.string().min(1, "Asset key is required"),
  placement: z.enum(BRAND_PLACEMENTS),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  altText: z.string().min(1, "Alt text is required"),
  href: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

const cmsBrandAssetUpdateSchema = z.object({
  id: z.string().uuid(),
  assetKey: z.string().min(1, "Asset key is required"),
  placement: z.enum(BRAND_PLACEMENTS),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  altText: z.string().min(1, "Alt text is required"),
  href: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function createCmsBrandAsset(
  _prev: CmsBrandAssetState,
  formData: FormData,
): Promise<CmsBrandAssetState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsBrandAssetCreateSchema.safeParse({
    assetKey: formData.get("assetKey"),
    placement: formData.get("placement"),
    imageUrl: formData.get("imageUrl"),
    altText: formData.get("altText"),
    href: formData.get("href") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client.from("cms_brand_assets").insert({
    asset_key: result.data.assetKey,
    placement: result.data.placement,
    image_url: result.data.imageUrl,
    alt_text: result.data.altText,
    href: result.data.href || null,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "A brand asset with this placement and key already exists." };
    throw error;
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function updateCmsBrandAsset(
  _prev: CmsBrandAssetState,
  formData: FormData,
): Promise<CmsBrandAssetState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = cmsBrandAssetUpdateSchema.safeParse({
    id: formData.get("id"),
    assetKey: formData.get("assetKey"),
    placement: formData.get("placement"),
    imageUrl: formData.get("imageUrl"),
    altText: formData.get("altText"),
    href: formData.get("href") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await client
    .from("cms_brand_assets")
    .update({
      asset_key: result.data.assetKey,
      placement: result.data.placement,
      image_url: result.data.imageUrl,
      alt_text: result.data.altText,
      href: result.data.href || null,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteCmsBrandAsset(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid brand asset id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_brand_assets").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content");
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
pnpm test src/features/cms/admin-actions.test.ts
```

Expected: 8 tests pass, 0 fail.

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/cms/admin-actions.ts src/features/cms/admin-actions.test.ts
git commit -m "feat(cms): add server actions for CMS entity CRUD (pages, sections, banners, nav, footer links, brand assets)"
```

---

## Task 2: Shared Row Actions + Rewire Content Page

**Files:**
- Create: `components/admin/cms-row-actions.tsx`
- Modify: `app/admin/content/page.tsx`

**Interfaces:**
- Consumes: `deleteCmsPage`, `deleteCmsSection`, `deleteCmsBanner`, `deleteCmsNavItem`, `deleteCmsFooterLink`, `deleteCmsBrandAsset` from `src/features/cms/admin-actions`
- `CmsRowActions` props: `{ editHref: string; deleteAction: () => Promise<void>; label: string }`

- [ ] **Step 1: Create `components/admin/cms-row-actions.tsx`**

```typescript
"use client";

import Link from "next/link";

type CmsRowActionsProps = {
  editHref: string;
  deleteAction: () => Promise<void>;
  label: string;
};

export function CmsRowActions({ editHref, deleteAction, label }: CmsRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={editHref}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm(`Delete "${label}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/admin/content/page.tsx`**

Replace the entire file with the version below. Key changes vs. the original:
1. All row types now carry `id` (or `pageKey`) for routing.
2. Queries include `id` for entities that need UUID-based routes.
3. `CmsTableSection` accepts `newHref` and `actionsSlot`.
4. The header "New page" `<button>` becomes a `<Link>`.

```typescript
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsRowActions } from "@/components/admin/cms-row-actions";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import {
  deleteCmsBanner,
  deleteCmsBrandAsset,
  deleteCmsFooterLink,
  deleteCmsNavItem,
  deleteCmsPage,
  deleteCmsSection,
} from "@/src/features/cms/admin-actions";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type CmsPageRow = { pageKey: string; title: string; status: string; updatedAt: string };
type CmsSectionRow = { id: string; pageKey: string; sectionKey: string; type: string; title: string; status: string };
type CmsBannerRow = { id: string; title: string; section: string; cta: string; status: string };
type CmsNavigationRow = { id: string; placement: string; label: string; href: string; status: string };
type CmsFooterLinkRow = { id: string; group: string; label: string; href: string; status: string };
type CmsBrandAssetRow = { id: string; assetKey: string; placement: string; altText: string; status: string };

type CmsContentRows = {
  pages: CmsPageRow[];
  sections: CmsSectionRow[];
  banners: CmsBannerRow[];
  navigation: CmsNavigationRow[];
  footerLinks: CmsFooterLinkRow[];
  brandAssets: CmsBrandAssetRow[];
};

type CmsPageRecord = { page_key: string; title: string; status: string; updated_at: string };
type CmsSectionRecord = { id: string; page_key: string; section_key: string; section_type: string; title: string | null; is_active: boolean };
type CmsBannerRecord = { id: string; title: string; cta_label: string | null; is_active: boolean; cms_sections: { section_key: string } | Array<{ section_key: string }> | null };
type CmsNavigationRecord = { id: string; placement: string; label: string; href: string; is_active: boolean };
type CmsFooterLinkRecord = { id: string; group_label: string; label: string; href: string; is_active: boolean };
type CmsBrandAssetRecord = { id: string; asset_key: string; placement: string; alt_text: string; is_active: boolean };

type ContentPageData = { access: "allowed"; rows: CmsContentRows } | { access: "denied" };

type CmsTableSectionProps<T extends object> = {
  title: string;
  columns: Array<AdminDataTableColumn<T>>;
  rows: T[];
  emptyMessage: string;
  newHref?: string;
  actionsSlot?: (row: T) => ReactNode;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function createEmptyCmsContentRows(): CmsContentRows {
  return { pages: [], sections: [], banners: [], navigation: [], footerLinks: [], brandAssets: [] };
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

function formatActiveStatus(isActive: boolean): string {
  return isActive ? "active" : "inactive";
}

function getPublicationStatusTone(status: string): StatusChipTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function getActiveStatusTone(status: string): StatusChipTone {
  return status === "active" ? "success" : "neutral";
}

function CmsTableSection<T extends object>({
  title,
  columns,
  rows,
  emptyMessage,
  newHref,
  actionsSlot,
}: CmsTableSectionProps<T>) {
  return (
    <section className="min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {newHref && (
          <Link
            href={newHref}
            className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            New
          </Link>
        )}
      </div>
      <AdminDataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        actionsSlot={actionsSlot}
      />
    </section>
  );
}

async function getCmsContentRows(): Promise<CmsContentRows> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const [
    pagesResult,
    sectionsResult,
    bannersResult,
    navigationResult,
    footerLinksResult,
    brandAssetsResult,
  ] = await Promise.all([
    client
      .from("cms_pages")
      .select("page_key, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    client
      .from("cms_sections")
      .select("id, page_key, section_key, section_type, title, is_active, sort_order")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_banners")
      .select("id, title, cta_label, is_active, sort_order, cms_sections(section_key)")
      .order("sort_order", { ascending: true })
      .limit(50),
    client
      .from("cms_navigation_items")
      .select("id, placement, label, href, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_footer_links")
      .select("id, group_label, label, href, is_active, sort_order")
      .order("group_label", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_brand_assets")
      .select("id, asset_key, placement, alt_text, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(50),
  ]);

  if (pagesResult.error) throw pagesResult.error;
  if (sectionsResult.error) throw sectionsResult.error;
  if (bannersResult.error) throw bannersResult.error;
  if (navigationResult.error) throw navigationResult.error;
  if (footerLinksResult.error) throw footerLinksResult.error;
  if (brandAssetsResult.error) throw brandAssetsResult.error;

  return {
    pages: ((pagesResult.data ?? []) as CmsPageRecord[]).map((p) => ({
      pageKey: p.page_key,
      title: p.title,
      status: p.status,
      updatedAt: formatDate(p.updated_at),
    })),
    sections: ((sectionsResult.data ?? []) as CmsSectionRecord[]).map((s) => ({
      id: s.id,
      pageKey: s.page_key,
      sectionKey: s.section_key,
      type: s.section_type,
      title: s.title ?? "",
      status: formatActiveStatus(s.is_active),
    })),
    banners: ((bannersResult.data ?? []) as CmsBannerRecord[]).map((b) => {
      const section = firstRelation(b.cms_sections);
      return {
        id: b.id,
        title: b.title,
        section: section?.section_key ?? "",
        cta: b.cta_label ?? "",
        status: formatActiveStatus(b.is_active),
      };
    }),
    navigation: ((navigationResult.data ?? []) as CmsNavigationRecord[]).map((n) => ({
      id: n.id,
      placement: n.placement,
      label: n.label,
      href: n.href,
      status: formatActiveStatus(n.is_active),
    })),
    footerLinks: ((footerLinksResult.data ?? []) as CmsFooterLinkRecord[]).map((l) => ({
      id: l.id,
      group: l.group_label,
      label: l.label,
      href: l.href,
      status: formatActiveStatus(l.is_active),
    })),
    brandAssets: ((brandAssetsResult.data ?? []) as CmsBrandAssetRecord[]).map((a) => ({
      id: a.id,
      assetKey: a.asset_key,
      placement: a.placement,
      altText: a.alt_text,
      status: formatActiveStatus(a.is_active),
    })),
  };
}

async function getContentPageData(): Promise<ContentPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: createEmptyCmsContentRows() };
  }

  try {
    const rows = await getCmsContentRows();
    return { access: "allowed", rows };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" };
    throw error;
  }
}

export default async function AdminContentPage() {
  const pageData = await getContentPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Content" />
        <p className="text-sm text-slate-600">You do not have access to content management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Content"
        description="Review and manage storefront CMS records, navigation, footer links, and brand assets."
        action={
          <Link
            href="/admin/content/pages/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New page
          </Link>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <CmsTableSection
          title="CMS pages"
          newHref="/admin/content/pages/new"
          columns={[
            { key: "pageKey", label: "Page" },
            { key: "title", label: "Title" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getPublicationStatusTone(row.status)} />
              ),
            },
            { key: "updatedAt", label: "Updated" },
          ]}
          rows={pageData.rows.pages}
          emptyMessage="No CMS pages yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/pages/${row.pageKey}/edit`}
              deleteAction={deleteCmsPage.bind(null, row.pageKey)}
              label={row.title}
            />
          )}
        />
        <CmsTableSection
          title="CMS sections"
          newHref="/admin/content/sections/new"
          columns={[
            { key: "pageKey", label: "Page" },
            { key: "sectionKey", label: "Section" },
            { key: "type", label: "Type" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.sections}
          emptyMessage="No CMS sections yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/sections/${row.id}/edit`}
              deleteAction={deleteCmsSection.bind(null, row.id)}
              label={row.sectionKey}
            />
          )}
        />
        <CmsTableSection
          title="Banners"
          newHref="/admin/content/banners/new"
          columns={[
            { key: "title", label: "Title" },
            { key: "section", label: "Section" },
            { key: "cta", label: "CTA" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.banners}
          emptyMessage="No banners yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/banners/${row.id}/edit`}
              deleteAction={deleteCmsBanner.bind(null, row.id)}
              label={row.title}
            />
          )}
        />
        <CmsTableSection
          title="Navigation"
          newHref="/admin/content/navigation/new"
          columns={[
            { key: "placement", label: "Placement" },
            { key: "label", label: "Label" },
            { key: "href", label: "Href" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.navigation}
          emptyMessage="No navigation items yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/navigation/${row.id}/edit`}
              deleteAction={deleteCmsNavItem.bind(null, row.id)}
              label={row.label}
            />
          )}
        />
        <CmsTableSection
          title="Footer links"
          newHref="/admin/content/footer-links/new"
          columns={[
            { key: "group", label: "Group" },
            { key: "label", label: "Label" },
            { key: "href", label: "Href" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.footerLinks}
          emptyMessage="No footer links yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/footer-links/${row.id}/edit`}
              deleteAction={deleteCmsFooterLink.bind(null, row.id)}
              label={row.label}
            />
          )}
        />
        <CmsTableSection
          title="Brand assets"
          newHref="/admin/content/brand-assets/new"
          columns={[
            { key: "assetKey", label: "Asset" },
            { key: "placement", label: "Placement" },
            { key: "altText", label: "Alt text" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.brandAssets}
          emptyMessage="No brand assets yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/brand-assets/${row.id}/edit`}
              deleteAction={deleteCmsBrandAsset.bind(null, row.id)}
              label={row.altText}
            />
          )}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/cms-row-actions.tsx app/admin/content/page.tsx
git commit -m "feat(cms): wire CMS content page with row actions and New links"
```

---

## Task 3: CMS Pages — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-page-form.tsx`
- Create: `app/admin/content/pages/new/page.tsx`
- Create: `app/admin/content/pages/[pageKey]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsPage`, `updateCmsPage`, `CmsPageState` from `src/features/cms/admin-actions`

- [ ] **Step 1: Create `components/admin/cms-page-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsPageState } from "@/src/features/cms/admin-actions";

type CmsPageFormProps = {
  action: (prev: CmsPageState, formData: FormData) => Promise<CmsPageState>;
  initialValues?: { pageKey: string; title: string; status: string };
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsPageForm({ action, initialValues }: CmsPageFormProps) {
  const [state, formAction, isPending] = useActionState<CmsPageState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && (
        <input type="hidden" name="pageKey" value={initialValues!.pageKey} />
      )}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {!isEdit && (
        <label className="block text-sm" htmlFor="pageKey">
          <span className="font-medium text-slate-700">Page key</span>
          <span className="ml-1 text-slate-400 text-xs">(lowercase, hyphens only — e.g. home)</span>
          <input
            id="pageKey"
            name="pageKey"
            required
            placeholder="home"
            className={INPUT_CLASS}
          />
        </label>
      )}

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Title</span>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="status"
          name="status"
          defaultValue={initialValues?.status ?? "draft"}
          className={INPUT_CLASS}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create page"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/pages/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsPageForm } from "@/components/admin/cms-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsPage } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsPageNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New page" />
          <p className="text-sm text-slate-600">You do not have access to create pages.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New page" description="Create a new CMS page." />
      <CmsPageForm action={createCmsPage} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/pages/[pageKey]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsPageForm } from "@/components/admin/cms-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsPage } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pageKey: string }> };

export default async function CmsPageEditPage({ params }: Props) {
  const { pageKey } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit page" />
          <p className="text-sm text-slate-600">You do not have access to edit pages.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_pages")
    .select("page_key, title, status")
    .eq("page_key", pageKey)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit page" description={data.title} />
      <CmsPageForm
        action={updateCmsPage}
        initialValues={{ pageKey: data.page_key, title: data.title, status: data.status }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/cms-page-form.tsx app/admin/content/pages/
git commit -m "feat(cms): add create and edit routes for CMS pages"
```

---

## Task 4: CMS Sections — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-section-form.tsx`
- Create: `app/admin/content/sections/new/page.tsx`
- Create: `app/admin/content/sections/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsSection`, `updateCmsSection`, `CmsSectionState` from `src/features/cms/admin-actions`
- New page fetches all `cms_pages` to populate the page selector; passes them as `pages` prop.
- Edit page fetches section by UUID from `cms_sections`.

- [ ] **Step 1: Create `components/admin/cms-section-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsSectionState } from "@/src/features/cms/admin-actions";

type PageOption = { pageKey: string; title: string };

type InitialValues = {
  id: string;
  pageKey: string;
  sectionKey: string;
  sectionType: string;
  title: string;
  subtitle: string;
  layout: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsSectionFormProps = {
  action: (prev: CmsSectionState, formData: FormData) => Promise<CmsSectionState>;
  pages: PageOption[];
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const SECTION_TYPES = [
  "hero",
  "service_strip",
  "category_shortcuts",
  "product_rail",
  "flash_sale",
  "promo_band",
  "recommendation_tabs",
  "partner_strip",
  "content_highlights",
  "footer",
] as const;

export function CmsSectionForm({ action, pages, initialValues }: CmsSectionFormProps) {
  const [state, formAction, isPending] = useActionState<CmsSectionState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {!isEdit && (
        <label className="block text-sm" htmlFor="pageKey">
          <span className="font-medium text-slate-700">Page</span>
          <select id="pageKey" name="pageKey" required className={INPUT_CLASS}>
            <option value="">Select a page…</option>
            {pages.map((p) => (
              <option key={p.pageKey} value={p.pageKey}>
                {p.title} ({p.pageKey})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm" htmlFor="sectionKey">
        <span className="font-medium text-slate-700">Section key</span>
        <span className="ml-1 text-xs text-slate-400">(lowercase, hyphens only)</span>
        <input
          id="sectionKey"
          name="sectionKey"
          required
          defaultValue={initialValues?.sectionKey}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sectionType">
        <span className="font-medium text-slate-700">Section type</span>
        <select
          id="sectionType"
          name="sectionType"
          defaultValue={initialValues?.sectionType ?? "product_rail"}
          className={INPUT_CLASS}
        >
          {SECTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Title (optional)</span>
        <input
          id="title"
          name="title"
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="subtitle">
        <span className="font-medium text-slate-700">Subtitle (optional)</span>
        <input
          id="subtitle"
          name="subtitle"
          defaultValue={initialValues?.subtitle}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="layout">
        <span className="font-medium text-slate-700">Layout</span>
        <input
          id="layout"
          name="layout"
          defaultValue={initialValues?.layout ?? "default"}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create section"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/sections/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsSectionForm } from "@/components/admin/cms-section-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsSection } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsSectionNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New section" />
          <p className="text-sm text-slate-600">You do not have access to create sections.</p>
        </div>
      );
    }
    throw error;
  }

  const { data } = await client
    .from("cms_pages")
    .select("page_key, title")
    .order("title", { ascending: true });

  const pages = (data ?? []).map((p) => ({ pageKey: p.page_key, title: p.title }));

  return (
    <div>
      <AdminPageHeader title="New section" description="Add a section to a CMS page." />
      <CmsSectionForm action={createCmsSection} pages={pages} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/sections/[id]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsSectionForm } from "@/components/admin/cms-section-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsSection } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsSectionEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit section" />
          <p className="text-sm text-slate-600">You do not have access to edit sections.</p>
        </div>
      );
    }
    throw error;
  }

  const [sectionResult, pagesResult] = await Promise.all([
    client
      .from("cms_sections")
      .select("id, page_key, section_key, section_type, title, subtitle, layout, sort_order, is_active")
      .eq("id", id)
      .single(),
    client.from("cms_pages").select("page_key, title").order("title", { ascending: true }),
  ]);

  if (sectionResult.error || !sectionResult.data) notFound();

  const s = sectionResult.data;

  return (
    <div>
      <AdminPageHeader title="Edit section" description={s.section_key} />
      <CmsSectionForm
        action={updateCmsSection}
        pages={(pagesResult.data ?? []).map((p) => ({ pageKey: p.page_key, title: p.title }))}
        initialValues={{
          id: s.id,
          pageKey: s.page_key,
          sectionKey: s.section_key,
          sectionType: s.section_type,
          title: s.title ?? "",
          subtitle: (s as { subtitle?: string | null }).subtitle ?? "",
          layout: s.layout,
          sortOrder: s.sort_order,
          isActive: s.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/cms-section-form.tsx app/admin/content/sections/
git commit -m "feat(cms): add create and edit routes for CMS sections"
```

---

## Task 5: CMS Banners — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-banner-form.tsx`
- Create: `app/admin/content/banners/new/page.tsx`
- Create: `app/admin/content/banners/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsBanner`, `updateCmsBanner`, `CmsBannerState`
- New page fetches all `cms_sections` to populate the section selector.

- [ ] **Step 1: Create `components/admin/cms-banner-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsBannerState } from "@/src/features/cms/admin-actions";

type SectionOption = { id: string; sectionKey: string; pageKey: string };

type InitialValues = {
  id: string;
  sectionId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsBannerFormProps = {
  action: (prev: CmsBannerState, formData: FormData) => Promise<CmsBannerState>;
  sections: SectionOption[];
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsBannerForm({ action, sections, initialValues }: CmsBannerFormProps) {
  const [state, formAction, isPending] = useActionState<CmsBannerState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="sectionId">
        <span className="font-medium text-slate-700">Section</span>
        <select
          id="sectionId"
          name="sectionId"
          required
          defaultValue={initialValues?.sectionId ?? ""}
          className={INPUT_CLASS}
        >
          <option value="">Select a section…</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.pageKey} / {s.sectionKey}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Title</span>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="subtitle">
        <span className="font-medium text-slate-700">Subtitle (optional)</span>
        <input
          id="subtitle"
          name="subtitle"
          defaultValue={initialValues?.subtitle}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="imageUrl">
        <span className="font-medium text-slate-700">Image URL</span>
        <input
          id="imageUrl"
          name="imageUrl"
          required
          type="url"
          defaultValue={initialValues?.imageUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="mobileImageUrl">
        <span className="font-medium text-slate-700">Mobile image URL (optional)</span>
        <input
          id="mobileImageUrl"
          name="mobileImageUrl"
          type="url"
          defaultValue={initialValues?.mobileImageUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="ctaLabel">
        <span className="font-medium text-slate-700">CTA label (optional)</span>
        <input
          id="ctaLabel"
          name="ctaLabel"
          defaultValue={initialValues?.ctaLabel}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="ctaHref">
        <span className="font-medium text-slate-700">CTA href (optional)</span>
        <input
          id="ctaHref"
          name="ctaHref"
          defaultValue={initialValues?.ctaHref}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create banner"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/banners/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBannerForm } from "@/components/admin/cms-banner-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsBanner } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsBannerNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New banner" />
          <p className="text-sm text-slate-600">You do not have access to create banners.</p>
        </div>
      );
    }
    throw error;
  }

  const { data } = await client
    .from("cms_sections")
    .select("id, section_key, page_key")
    .order("page_key", { ascending: true })
    .order("sort_order", { ascending: true });

  const sections = (data ?? []).map((s) => ({
    id: s.id,
    sectionKey: s.section_key,
    pageKey: s.page_key,
  }));

  return (
    <div>
      <AdminPageHeader title="New banner" description="Add a promotional banner to a section." />
      <CmsBannerForm action={createCmsBanner} sections={sections} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/banners/[id]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBannerForm } from "@/components/admin/cms-banner-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsBanner } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsBannerEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit banner" />
          <p className="text-sm text-slate-600">You do not have access to edit banners.</p>
        </div>
      );
    }
    throw error;
  }

  const [bannerResult, sectionsResult] = await Promise.all([
    client
      .from("cms_banners")
      .select("id, section_id, title, subtitle, image_url, mobile_image_url, cta_label, cta_href, sort_order, is_active")
      .eq("id", id)
      .single(),
    client
      .from("cms_sections")
      .select("id, section_key, page_key")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  if (bannerResult.error || !bannerResult.data) notFound();

  const b = bannerResult.data;

  return (
    <div>
      <AdminPageHeader title="Edit banner" description={b.title} />
      <CmsBannerForm
        action={updateCmsBanner}
        sections={(sectionsResult.data ?? []).map((s) => ({
          id: s.id,
          sectionKey: s.section_key,
          pageKey: s.page_key,
        }))}
        initialValues={{
          id: b.id,
          sectionId: b.section_id,
          title: b.title,
          subtitle: b.subtitle ?? "",
          imageUrl: b.image_url,
          mobileImageUrl: b.mobile_image_url ?? "",
          ctaLabel: b.cta_label ?? "",
          ctaHref: b.cta_href ?? "",
          sortOrder: b.sort_order,
          isActive: b.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lint + commit**

```bash
pnpm lint
git add components/admin/cms-banner-form.tsx app/admin/content/banners/
git commit -m "feat(cms): add create and edit routes for CMS banners"
```

---

## Task 6: CMS Navigation Items — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-nav-item-form.tsx`
- Create: `app/admin/content/navigation/new/page.tsx`
- Create: `app/admin/content/navigation/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsNavItem`, `updateCmsNavItem`, `CmsNavItemState`

- [ ] **Step 1: Create `components/admin/cms-nav-item-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsNavItemState } from "@/src/features/cms/admin-actions";

type InitialValues = {
  id: string;
  placement: string;
  label: string;
  href: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsNavItemFormProps = {
  action: (prev: CmsNavItemState, formData: FormData) => Promise<CmsNavItemState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsNavItemForm({ action, initialValues }: CmsNavItemFormProps) {
  const [state, formAction, isPending] = useActionState<CmsNavItemState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="placement">
        <span className="font-medium text-slate-700">Placement</span>
        <select
          id="placement"
          name="placement"
          defaultValue={initialValues?.placement ?? "header"}
          className={INPUT_CLASS}
        >
          <option value="header">Header</option>
          <option value="sidebar">Sidebar</option>
          <option value="mobile_dock">Mobile dock</option>
          <option value="footer">Footer</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="label">
        <span className="font-medium text-slate-700">Label</span>
        <input
          id="label"
          name="label"
          required
          defaultValue={initialValues?.label}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">Href</span>
        <input
          id="href"
          name="href"
          required
          defaultValue={initialValues?.href}
          placeholder="/category/ca-tuoi"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="iconKey">
        <span className="font-medium text-slate-700">Icon key (optional)</span>
        <input
          id="iconKey"
          name="iconKey"
          defaultValue={initialValues?.iconKey}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create nav item"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/navigation/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsNavItemForm } from "@/components/admin/cms-nav-item-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsNavItem } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsNavItemNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New navigation item" />
          <p className="text-sm text-slate-600">You do not have access to create navigation items.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New navigation item" description="Add a link to the storefront navigation." />
      <CmsNavItemForm action={createCmsNavItem} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/navigation/[id]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsNavItemForm } from "@/components/admin/cms-nav-item-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsNavItem } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsNavItemEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit navigation item" />
          <p className="text-sm text-slate-600">You do not have access to edit navigation items.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_navigation_items")
    .select("id, placement, label, href, icon_key, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit navigation item" description={data.label} />
      <CmsNavItemForm
        action={updateCmsNavItem}
        initialValues={{
          id: data.id,
          placement: data.placement,
          label: data.label,
          href: data.href,
          iconKey: data.icon_key ?? "",
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lint + commit**

```bash
pnpm lint
git add components/admin/cms-nav-item-form.tsx app/admin/content/navigation/
git commit -m "feat(cms): add create and edit routes for CMS navigation items"
```

---

## Task 7: CMS Footer Links — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-footer-link-form.tsx`
- Create: `app/admin/content/footer-links/new/page.tsx`
- Create: `app/admin/content/footer-links/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsFooterLink`, `updateCmsFooterLink`, `CmsFooterLinkState`

- [ ] **Step 1: Create `components/admin/cms-footer-link-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsFooterLinkState } from "@/src/features/cms/admin-actions";

type InitialValues = {
  id: string;
  groupLabel: string;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsFooterLinkFormProps = {
  action: (prev: CmsFooterLinkState, formData: FormData) => Promise<CmsFooterLinkState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsFooterLinkForm({ action, initialValues }: CmsFooterLinkFormProps) {
  const [state, formAction, isPending] = useActionState<CmsFooterLinkState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="groupLabel">
        <span className="font-medium text-slate-700">Group</span>
        <input
          id="groupLabel"
          name="groupLabel"
          required
          defaultValue={initialValues?.groupLabel}
          placeholder="Về chúng tôi"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="label">
        <span className="font-medium text-slate-700">Label</span>
        <input
          id="label"
          name="label"
          required
          defaultValue={initialValues?.label}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">Href</span>
        <input
          id="href"
          name="href"
          required
          defaultValue={initialValues?.href}
          placeholder="/about"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create footer link"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/footer-links/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsFooterLinkForm } from "@/components/admin/cms-footer-link-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsFooterLink } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsFooterLinkNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New footer link" />
          <p className="text-sm text-slate-600">You do not have access to create footer links.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New footer link" description="Add a link to a footer group." />
      <CmsFooterLinkForm action={createCmsFooterLink} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/footer-links/[id]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsFooterLinkForm } from "@/components/admin/cms-footer-link-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsFooterLink } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsFooterLinkEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit footer link" />
          <p className="text-sm text-slate-600">You do not have access to edit footer links.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_footer_links")
    .select("id, group_label, label, href, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit footer link" description={data.label} />
      <CmsFooterLinkForm
        action={updateCmsFooterLink}
        initialValues={{
          id: data.id,
          groupLabel: data.group_label,
          label: data.label,
          href: data.href,
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lint + commit**

```bash
pnpm lint
git add components/admin/cms-footer-link-form.tsx app/admin/content/footer-links/
git commit -m "feat(cms): add create and edit routes for CMS footer links"
```

---

## Task 8: CMS Brand Assets — Form + Create/Edit Routes

**Files:**
- Create: `components/admin/cms-brand-asset-form.tsx`
- Create: `app/admin/content/brand-assets/new/page.tsx`
- Create: `app/admin/content/brand-assets/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createCmsBrandAsset`, `updateCmsBrandAsset`, `CmsBrandAssetState`

- [ ] **Step 1: Create `components/admin/cms-brand-asset-form.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsBrandAssetState } from "@/src/features/cms/admin-actions";

type InitialValues = {
  id: string;
  assetKey: string;
  placement: string;
  imageUrl: string;
  altText: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsBrandAssetFormProps = {
  action: (prev: CmsBrandAssetState, formData: FormData) => Promise<CmsBrandAssetState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsBrandAssetForm({ action, initialValues }: CmsBrandAssetFormProps) {
  const [state, formAction, isPending] = useActionState<CmsBrandAssetState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="assetKey">
        <span className="font-medium text-slate-700">Asset key</span>
        <input
          id="assetKey"
          name="assetKey"
          required
          defaultValue={initialValues?.assetKey}
          placeholder="momo"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="placement">
        <span className="font-medium text-slate-700">Placement</span>
        <select
          id="placement"
          name="placement"
          defaultValue={initialValues?.placement ?? "partner"}
          className={INPUT_CLASS}
        >
          <option value="partner">Partner</option>
          <option value="payment">Payment</option>
          <option value="trust">Trust</option>
          <option value="brand">Brand</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="imageUrl">
        <span className="font-medium text-slate-700">Image URL</span>
        <input
          id="imageUrl"
          name="imageUrl"
          required
          type="url"
          defaultValue={initialValues?.imageUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="altText">
        <span className="font-medium text-slate-700">Alt text</span>
        <input
          id="altText"
          name="altText"
          required
          defaultValue={initialValues?.altText}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">Link href (optional)</span>
        <input
          id="href"
          name="href"
          defaultValue={initialValues?.href}
          placeholder="https://momo.vn"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create brand asset"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/brand-assets/new/page.tsx`**

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBrandAssetForm } from "@/components/admin/cms-brand-asset-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsBrandAsset } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsBrandAssetNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New brand asset" />
          <p className="text-sm text-slate-600">You do not have access to create brand assets.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New brand asset" description="Add a partner, payment, or trust logo." />
      <CmsBrandAssetForm action={createCmsBrandAsset} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/content/brand-assets/[id]/edit/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBrandAssetForm } from "@/components/admin/cms-brand-asset-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsBrandAsset } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsBrandAssetEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit brand asset" />
          <p className="text-sm text-slate-600">You do not have access to edit brand assets.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_brand_assets")
    .select("id, asset_key, placement, image_url, alt_text, href, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit brand asset" description={data.alt_text} />
      <CmsBrandAssetForm
        action={updateCmsBrandAsset}
        initialValues={{
          id: data.id,
          assetKey: data.asset_key,
          placement: data.placement,
          imageUrl: data.image_url,
          altText: data.alt_text,
          href: data.href ?? "",
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Final lint + full test run + commit**

```bash
pnpm lint
pnpm test
git add components/admin/cms-brand-asset-form.tsx app/admin/content/brand-assets/
git commit -m "feat(cms): add create and edit routes for CMS brand assets"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Create/edit/delete CMS pages | Tasks 1, 3 |
| Create/edit/delete CMS sections | Tasks 1, 4 |
| Create/edit/delete CMS banners | Tasks 1, 5 |
| Create/edit/delete navigation items | Tasks 1, 6 |
| Create/edit/delete footer links | Tasks 1, 7 |
| Create/edit/delete brand assets | Tasks 1, 8 |
| Permission guard `cms:update` on all mutations | Task 1 (all actions) |
| Row actions (Edit + Delete) wired in main page | Task 2 |
| New buttons per content type | Task 2 |
| Unit tests for validation + success paths | Task 1 |

**Placeholder scan:** no TBDs, TODOs, or "similar to above" references found.

**Type consistency:** `CmsPageState`, `CmsSectionState`, `CmsBannerState`, `CmsNavItemState`, `CmsFooterLinkState`, `CmsBrandAssetState` all defined in Task 1 and consumed identically in Tasks 3–8. `InitialValues` types in form components match the fields fetched by their edit pages.
