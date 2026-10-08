"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import {
  collectTabProductIds,
  recommendationTabsInputSchema,
} from "@/src/features/cms/recommendation-tabs";

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
    .update({
      title: result.data.title,
      status: result.data.status,
      updated_at: new Date().toISOString(),
    })
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

// ── Recommendation tabs ("Gợi ý cho bạn") ──────────────────────────────────

export type RecommendationTabsState = { error: string } | { success: true } | null;

export async function saveRecommendationTabs(
  _prev: RecommendationTabsState,
  formData: FormData,
): Promise<RecommendationTabsState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const sectionId = z.string().uuid().safeParse(formData.get("sectionId"));
  if (!sectionId.success) return { error: "Phần không hợp lệ." };

  let rawTabs: unknown;
  try {
    rawTabs = JSON.parse(String(formData.get("tabs") ?? "[]"));
  } catch {
    return { error: "Dữ liệu tab không hợp lệ." };
  }

  const tabs = recommendationTabsInputSchema.safeParse(rawTabs);
  if (!tabs.success) return { error: tabs.error.issues[0]?.message ?? "Dữ liệu tab không hợp lệ." };

  const { data: section, error: sectionError } = await client
    .from("cms_sections")
    .select("id, section_type, metadata")
    .eq("id", sectionId.data)
    .single();

  if (sectionError || !section) return { error: "Không tìm thấy phần." };
  if (section.section_type !== "recommendation_tabs")
    return { error: "Phần này không phải loại recommendation_tabs." };

  const metadata =
    section.metadata && typeof section.metadata === "object" && !Array.isArray(section.metadata)
      ? (section.metadata as Record<string, unknown>)
      : {};

  const { error: updateError } = await client
    .from("cms_sections")
    .update({
      metadata: {
        ...metadata,
        tabs: tabs.data.map((tab) => ({
          key: tab.key,
          label: tab.label,
          ...(tab.href ? { href: tab.href } : {}),
          productIds: tab.productIds,
        })),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", sectionId.data);

  if (updateError) throw updateError;

  const productIds = collectTabProductIds(tabs.data);

  const { error: deleteError } = await client
    .from("cms_section_products")
    .delete()
    .eq("section_id", sectionId.data);

  if (deleteError) throw deleteError;

  if (productIds.length > 0) {
    const { error: insertError } = await client.from("cms_section_products").insert(
      productIds.map((productId, index) => ({
        section_id: sectionId.data,
        product_id: productId,
        sort_order: index,
      })),
    );

    if (insertError) throw insertError;
  }

  revalidatePath("/");
  revalidatePath(`/admin/content/sections/${sectionId.data}/tabs`);
  return { success: true };
}

// ── Product rail products ("Bán chạy", …) ─────────────────────────────────

export type SectionProductsState = { error: string } | { success: true } | null;

const sectionProductIdsSchema = z
  .array(z.string().uuid())
  .max(40, "Tối đa 40 sản phẩm.")
  .refine((ids) => new Set(ids).size === ids.length, "Sản phẩm bị trùng.");

export async function saveSectionProducts(
  _prev: SectionProductsState,
  formData: FormData,
): Promise<SectionProductsState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const sectionId = z.string().uuid().safeParse(formData.get("sectionId"));
  if (!sectionId.success) return { error: "Phần không hợp lệ." };

  let rawIds: unknown;
  try {
    rawIds = JSON.parse(String(formData.get("productIds") ?? "[]"));
  } catch {
    return { error: "Danh sách sản phẩm không hợp lệ." };
  }

  const productIds = sectionProductIdsSchema.safeParse(rawIds);
  if (!productIds.success)
    return { error: productIds.error.issues[0]?.message ?? "Danh sách sản phẩm không hợp lệ." };

  const { data: section, error: sectionError } = await client
    .from("cms_sections")
    .select("id, section_type")
    .eq("id", sectionId.data)
    .single();

  if (sectionError || !section) return { error: "Không tìm thấy phần." };
  if (section.section_type !== "product_rail" && section.section_type !== "flash_sale")
    return { error: "Chỉ phần danh sách sản phẩm mới chọn được sản phẩm ở đây." };

  // Keep badges ("Hot", "-20%"…) of products that stay in the list.
  const { data: existing, error: existingError } = await client
    .from("cms_section_products")
    .select("product_id, badge_text")
    .eq("section_id", sectionId.data);

  if (existingError) throw existingError;

  const badges = new Map(
    (existing ?? []).map((row) => [row.product_id as string, row.badge_text as string | null]),
  );

  const { error: deleteError } = await client
    .from("cms_section_products")
    .delete()
    .eq("section_id", sectionId.data);

  if (deleteError) throw deleteError;

  if (productIds.data.length > 0) {
    const { error: insertError } = await client.from("cms_section_products").insert(
      productIds.data.map((productId, index) => ({
        section_id: sectionId.data,
        product_id: productId,
        sort_order: index,
        badge_text: badges.get(productId) ?? null,
      })),
    );

    if (insertError) throw insertError;
  }

  revalidatePath("/");
  revalidatePath(`/admin/content/sections/${sectionId.data}/products`);
  return { success: true };
}

export async function searchProductsForRecommendations(
  query: string,
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const term = query.trim();
  if (!term) return [];

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { data, error } = await client
    .from("products")
    .select("id, name, slug")
    .ilike("name", `%${term.replace(/[%_\\]/g, "\\$&")}%`)
    .eq("status", "published")
    .order("name")
    .limit(15);

  if (error) throw error;

  return data ?? [];
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

  revalidatePath("/admin/content/banners");
  redirect("/admin/content/banners");
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

  revalidatePath("/admin/content/banners");
  redirect("/admin/content/banners");
}

export async function deleteCmsBanner(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid banner id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_banners").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/content/banners");
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
      return {
        error: "A navigation item with this placement, label, and href already exists.",
      };
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

const BRAND_PLACEMENTS = [
  "partner",
  "payment",
  "trust",
  "brand",
  "bank_account",
  "order_app",
] as const;

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
