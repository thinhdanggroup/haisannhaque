import { z } from "zod";

/**
 * A tab of the homepage "Gợi ý cho bạn" section. Tabs live in
 * `cms_sections.metadata.tabs`; each one lists the products it shows, and the
 * section's `cms_section_products` rows hold the union of those products so the
 * homepage query loads every card in one round trip.
 */
export type RecommendationTab = {
  key: string;
  label: string;
  href: string | null;
  productIds: string[];
};

export const MAX_RECOMMENDATION_TABS = 12;
export const MAX_PRODUCTS_PER_TAB = 40;

export function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
}

function normalizeTab(value: unknown, index: number): RecommendationTab | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
  const href = typeof candidate.href === "string" ? candidate.href.trim() : "";
  const productIds = Array.isArray(candidate.productIds)
    ? candidate.productIds.filter((id): id is string => typeof id === "string")
    : [];

  if (label.length === 0) {
    return null;
  }

  return {
    key: key.length > 0 ? key : `tab-${index + 1}`,
    label,
    href: href.length > 0 && isSafeHref(href) ? href : null,
    productIds,
  };
}

export function parseRecommendationTabs(metadata: Record<string, unknown>): RecommendationTab[] {
  const tabs = metadata.tabs;

  if (!Array.isArray(tabs)) {
    return [];
  }

  return tabs
    .map(normalizeTab)
    .filter((tab): tab is RecommendationTab => tab !== null);
}

/**
 * Products for one tab, in the tab's own order. A tab that has never been given
 * products falls back to every product in the section, so sections created
 * before tabs carried product lists keep rendering.
 */
export function selectTabProducts<T extends { id: string }>(
  tab: Pick<RecommendationTab, "productIds">,
  products: T[],
): T[] {
  if (tab.productIds.length === 0) {
    return products;
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  return tab.productIds
    .map((id) => byId.get(id))
    .filter((product): product is T => product !== undefined);
}

export const recommendationTabsInputSchema = z
  .array(
    z.object({
      key: z
        .string()
        .trim()
        .min(1, "Khóa tab là bắt buộc")
        .regex(/^[a-z0-9-]+$/, "Khóa tab chỉ gồm chữ thường, số và gạch ngang"),
      label: z.string().trim().min(1, "Tên tab là bắt buộc").max(60, "Tên tab tối đa 60 ký tự"),
      href: z
        .string()
        .trim()
        .refine((href) => href === "" || isSafeHref(href), "Liên kết phải bắt đầu bằng / hoặc #"),
      productIds: z
        .array(z.string().uuid("Sản phẩm không hợp lệ"))
        .max(MAX_PRODUCTS_PER_TAB, `Mỗi tab tối đa ${MAX_PRODUCTS_PER_TAB} sản phẩm`),
    }),
  )
  .max(MAX_RECOMMENDATION_TABS, `Tối đa ${MAX_RECOMMENDATION_TABS} tab`)
  .refine(
    (tabs) => new Set(tabs.map((tab) => tab.key)).size === tabs.length,
    "Khóa tab không được trùng nhau",
  );

export type RecommendationTabsInput = z.infer<typeof recommendationTabsInputSchema>;

/** Every product referenced by any tab, first occurrence wins the sort order. */
export function collectTabProductIds(tabs: Array<Pick<RecommendationTab, "productIds">>): string[] {
  return [...new Set(tabs.flatMap((tab) => tab.productIds))];
}
