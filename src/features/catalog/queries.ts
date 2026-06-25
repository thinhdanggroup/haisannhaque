import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCard, ProductDetail } from "./types";

type ProductCardRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  list_price: number;
  sale_price: number | null;
  unit: string | null;
  is_available: boolean;
  default_variant_id: string | null;
};

type RelatedProductRow = {
  id: string;
  slug: string;
  name: string;
  product_images: Array<{ url: string; alt_text: string | null; sort_order: number }>;
  product_variants: Array<{ id: string; sku: string; unit: string; list_price: number; sale_price: number | null; is_active: boolean }>;
};

function mapRelatedProductRowToCard(row: RelatedProductRow): ProductCard {
  const activeVariants = row.product_variants.filter((v) => v.is_active);
  const cheapest = activeVariants.slice().sort((a, b) => {
    return (a.sale_price ?? a.list_price) - (b.sale_price ?? b.list_price);
  })[0];
  const firstImage = row.product_images.slice().sort((a, b) => a.sort_order - b.sort_order)[0];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: firstImage?.url ?? null,
    price: cheapest ? (cheapest.sale_price ?? cheapest.list_price) : 0,
    compareAtPrice: cheapest?.sale_price ? cheapest.list_price : null,
    isAvailable: activeVariants.length > 0,
    unitLabel: cheapest?.unit ?? null,
    defaultVariantId: cheapest?.id ?? null,
  };
}

type ProductDetailRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  origin: string | null;
  temperature_class: string;
  product_images: Array<{
    url: string;
    alt_text: string | null;
    sort_order: number;
  }>;
  product_variants: Array<{
    id: string;
    sku: string;
    unit: string;
    option_summary: string | null;
    list_price: number;
    sale_price: number | null;
    is_active: boolean;
  }>;
  product_related: Array<{
    sort_order: number;
    related: RelatedProductRow[] | RelatedProductRow | null;
  }>;
};

export function mapProductRowToCard(row: ProductCardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.image_url,
    price: row.sale_price ?? row.list_price,
    compareAtPrice: row.sale_price ? row.list_price : null,
    isAvailable: row.is_available,
    unitLabel: row.unit ?? null,
    defaultVariantId: row.default_variant_id ?? null,
  };
}

function mapProductDetailRow(row: ProductDetailRow): ProductDetail {
  const relatedProducts = row.product_related
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((r) => {
      const rel = Array.isArray(r.related) ? r.related[0] ?? null : r.related;
      return rel ? [mapRelatedProductRowToCard(rel)] : [];
    });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    origin: row.origin,
    temperatureClass: row.temperature_class,
    images: row.product_images
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((image) => ({
        url: image.url,
        altText: image.alt_text,
      })),
    variants: row.product_variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      unit: variant.unit,
      optionSummary: variant.option_summary,
      listPrice: variant.list_price,
      salePrice: variant.sale_price,
      isActive: variant.is_active,
    })),
    relatedProducts,
  };
}

export async function getProductsByCategory(
  client: SupabaseClient,
  slug: string,
): Promise<ProductCard[]> {
  const { data, error } = await client.rpc("get_products_by_category", {
    input_category_slug: slug,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductCardRow[]).map(mapProductRowToCard);
}

export async function searchProducts(
  client: SupabaseClient,
  query: string,
): Promise<ProductCard[]> {
  const { data, error } = await client.rpc("search_products", {
    input_query: query,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductCardRow[]).map(mapProductRowToCard);
}

export async function getProductBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<ProductDetail | null> {
  const { data, error } = await client
    .from("products")
    .select(
      `
        id,
        slug,
        name,
        short_description,
        description,
        origin,
        temperature_class,
        product_images(url, alt_text, sort_order),
        product_variants(id, sku, unit, option_summary, list_price, sale_price, is_active)
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  // Fetch related products separately so the page works even before the migration runs.
  const relatedRaw = await client
    .from("product_related" as never)
    .select(
      `sort_order, related:related_product_id(id, slug, name, product_images(url, alt_text, sort_order), product_variants(id, sku, unit, list_price, sale_price, is_active))`,
    )
    .eq("product_id", data.id)
    .order("sort_order", { ascending: true });

  const relatedRows: Array<{ sort_order: number; related: RelatedProductRow[] | RelatedProductRow | null }> =
    relatedRaw.error ? [] : ((relatedRaw.data ?? []) as unknown as typeof relatedRows);

  const baseRow = data as unknown as Omit<ProductDetailRow, "product_related">;

  return mapProductDetailRow({ ...baseRow, product_related: relatedRows });
}
