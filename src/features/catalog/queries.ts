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
};

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
    soldLabel: "Da ban: 1k+",
  };
}

function mapProductDetailRow(row: ProductDetailRow): ProductDetail {
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

  return mapProductDetailRow(data as ProductDetailRow);
}
