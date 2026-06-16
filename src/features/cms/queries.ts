import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CmsBanner,
  CmsBrandAsset,
  CmsFooterLink,
  CmsNavigationItem,
  CmsNavigationPlacement,
  CmsProductCard,
  CmsSection,
  CmsSectionType,
  HomePageContent,
  StorefrontChrome,
} from "./types";

type Relation<T> = T | T[] | null;

type CmsBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
};

type CmsProductImageRow = {
  url: string;
  alt_text: string | null;
  sort_order: number;
};

type CmsProductVariantRow = {
  id: string;
  sku: string;
  unit: string;
  option_summary: string | null;
  list_price: number;
  sale_price: number | null;
  is_active: boolean;
};

type CmsProductRow = {
  id: string;
  slug: string;
  name: string;
  is_available?: boolean | null;
  product_images: Relation<CmsProductImageRow>;
  product_variants: Relation<CmsProductVariantRow>;
};

type CmsSectionProductCardRow = {
  sort_order?: number;
  badge_text: string | null;
  products: Relation<CmsProductRow>;
};

type CmsSectionProductQueryRow = CmsSectionProductCardRow & {
  sort_order: number;
};

type CmsSectionRow = {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  layout: string;
  sort_order: number;
  metadata: unknown;
  cms_banners: Relation<CmsBannerRow>;
  cms_section_products: Relation<CmsSectionProductQueryRow>;
};

type CmsNavigationItemRow = {
  id: string;
  placement: string;
  label: string;
  href: string;
  icon_key: string | null;
  sort_order: number;
};

type CmsFooterLinkRow = {
  id: string;
  group_label: string;
  label: string;
  href: string;
  sort_order: number;
};

type CmsBrandAssetRow = {
  id: string;
  asset_key: string;
  placement: string;
  image_url: string;
  alt_text: string;
  href: string | null;
  sort_order: number;
};

function asArray<T>(value: Relation<T>): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstRelation<T>(value: Relation<T>): T | null {
  return asArray(value)[0] ?? null;
}

function toMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function sortBySortOrder<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.sort_order - right.sort_order);
}

function getDisplayVariant(
  variants: CmsProductVariantRow[],
): CmsProductVariantRow | null {
  const activeVariants = variants.filter((item) => item.is_active);

  if (activeVariants.length === 0) {
    return null;
  }

  return [...activeVariants].sort((left, right) => {
    const leftPrice = left.sale_price ?? left.list_price;
    const rightPrice = right.sale_price ?? right.list_price;

    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }

    const skuComparison = left.sku.localeCompare(right.sku);

    if (skuComparison !== 0) {
      return skuComparison;
    }

    return left.id.localeCompare(right.id);
  })[0];
}

function canMapCmsProductCardRow(row: CmsSectionProductCardRow): boolean {
  const product = firstRelation(row.products);

  if (!product) {
    return false;
  }

  return Boolean(getDisplayVariant(asArray(product.product_variants)));
}

export function mapCmsProductCardRow(row: CmsSectionProductCardRow): CmsProductCard {
  const product = firstRelation(row.products);

  if (!product) {
    throw new Error("CMS product row is missing a product relation.");
  }

  const image = sortBySortOrder(asArray(product.product_images))[0] ?? null;
  const variant = getDisplayVariant(asArray(product.product_variants));

  if (!variant) {
    throw new Error("CMS product row is missing a display variant.");
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: image?.url ?? null,
    price: variant.sale_price ?? variant.list_price,
    compareAtPrice: variant.sale_price == null ? null : variant.list_price,
    isAvailable: product.is_available ?? false,
    badgeText: row.badge_text,
    unitLabel: variant.unit,
    soldLabel: "",
  };
}

function mapCmsBannerRow(row: CmsBannerRow): CmsBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.image_url,
    mobileImageUrl: row.mobile_image_url,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    sortOrder: row.sort_order,
  };
}

function mapCmsSectionRow(row: CmsSectionRow): CmsSection {
  const products = sortBySortOrder(asArray(row.cms_section_products))
    .filter(canMapCmsProductCardRow)
    .map(mapCmsProductCardRow);

  return {
    id: row.id,
    key: row.section_key,
    type: row.section_type as CmsSectionType,
    title: row.title,
    subtitle: row.subtitle,
    layout: row.layout,
    sortOrder: row.sort_order,
    metadata: toMetadata(row.metadata),
    banners: sortBySortOrder(asArray(row.cms_banners)).map(mapCmsBannerRow),
    products,
  };
}

function mapCmsNavigationItemRow(row: CmsNavigationItemRow): CmsNavigationItem {
  return {
    id: row.id,
    placement: row.placement as CmsNavigationPlacement,
    label: row.label,
    href: row.href,
    iconKey: row.icon_key,
    sortOrder: row.sort_order,
  };
}

function mapCmsFooterLinkRow(row: CmsFooterLinkRow): CmsFooterLink {
  return {
    id: row.id,
    groupLabel: row.group_label,
    label: row.label,
    href: row.href,
    sortOrder: row.sort_order,
  };
}

function mapCmsBrandAssetRow(row: CmsBrandAssetRow): CmsBrandAsset {
  return {
    id: row.id,
    assetKey: row.asset_key,
    placement: row.placement as CmsBrandAsset["placement"],
    imageUrl: row.image_url,
    altText: row.alt_text,
    href: row.href,
    sortOrder: row.sort_order,
  };
}

export async function getHomePageContent(
  client: SupabaseClient,
): Promise<HomePageContent> {
  const { data, error } = await client
    .from("cms_sections")
    .select(
      `
        id,
        section_key,
        section_type,
        title,
        subtitle,
        layout,
        sort_order,
        metadata,
        cms_banners(
          id,
          title,
          subtitle,
          image_url,
          mobile_image_url,
          cta_label,
          cta_href,
          sort_order
        ),
        cms_section_products(
          sort_order,
          badge_text,
          products(
            id,
            slug,
            name,
            is_available,
            product_images(url, alt_text, sort_order),
            product_variants(
              id,
              sku,
              unit,
              option_summary,
              list_price,
              sale_price,
              is_active
            )
          )
        )
      `,
    )
    .eq("page_key", "home")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    sections: sortBySortOrder((data ?? []) as CmsSectionRow[]).map(mapCmsSectionRow),
  };
}

export async function getStorefrontChrome(
  client: SupabaseClient,
): Promise<StorefrontChrome> {
  const [navigationResult, footerResult, brandAssetResult] = await Promise.all([
    client
      .from("cms_navigation_items")
      .select("id, placement, label, href, icon_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("cms_footer_links")
      .select("id, group_label, label, href, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("cms_brand_assets")
      .select("id, asset_key, placement, image_url, alt_text, href, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (navigationResult.error) {
    throw navigationResult.error;
  }

  if (footerResult.error) {
    throw footerResult.error;
  }

  if (brandAssetResult.error) {
    throw brandAssetResult.error;
  }

  const navigationItems = sortBySortOrder(
    (navigationResult.data ?? []) as CmsNavigationItemRow[],
  ).map(mapCmsNavigationItemRow);
  const brandAssets = sortBySortOrder(
    (brandAssetResult.data ?? []) as CmsBrandAssetRow[],
  ).map(mapCmsBrandAssetRow);

  return {
    headerNav: navigationItems.filter((item) => item.placement === "header"),
    sidebarNav: navigationItems.filter((item) => item.placement === "sidebar"),
    mobileDock: navigationItems.filter((item) => item.placement === "mobile_dock"),
    footerLinks: sortBySortOrder((footerResult.data ?? []) as CmsFooterLinkRow[]).map(
      mapCmsFooterLinkRow,
    ),
    paymentAssets: brandAssets.filter((asset) => asset.placement === "payment"),
    partnerAssets: brandAssets.filter((asset) => asset.placement === "partner"),
    trustAssets: brandAssets.filter((asset) => asset.placement === "trust"),
  };
}
