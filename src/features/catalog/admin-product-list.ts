import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

type ProductClient = Pick<SupabaseClient, "from">;

export type AdminProductListRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  variants: number;
};

export type AdminProductListPage = {
  rows: AdminProductListRow[];
  total: number;
  page: number;
  pageCount: number;
};

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  product_variants: Array<{ id: string; sku: string }> | null;
};

/**
 * PostgREST parses `or()` as a comma-separated list, so a term containing
 * `,` `.` or `(` would break the filter. Quoting makes those literal; only
 * the quote and escape characters themselves have to go.
 */
export function toOrFilterValue(pattern: string): string {
  return `"${pattern.replaceAll('"', "").replaceAll("\\", "")}"`;
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseQueryParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;

  return (raw ?? "").trim();
}

export function buildProductsHref(query: string, page: number): string {
  const params = new URLSearchParams();

  if (query.length > 0) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();

  return search.length > 0 ? `/admin/products?${search}` : "/admin/products";
}

/**
 * Staff read a SKU off the inventory screen and come here to find it, so the
 * search has to match variant SKUs as well as product names.
 */
async function findProductIdsBySku(
  client: ProductClient,
  query: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("product_variants")
    .select("product_id")
    .ilike("sku", `%${query}%`)
    .limit(500);

  if (error) {
    throw error;
  }

  return [
    ...new Set(
      ((data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id),
    ),
  ];
}

export async function getAdminProductsPage(
  client: ProductClient,
  { query, page }: { query: string; page: number },
): Promise<AdminProductListPage> {
  let builder = client
    .from("products")
    .select("id, name, slug, status, product_variants(id, sku)", { count: "exact" });

  if (query.length > 0) {
    const matchedIds = await findProductIdsBySku(client, query);

    builder =
      matchedIds.length > 0
        ? builder.or(
            `name.ilike.${toOrFilterValue(`%${query}%`)},id.in.(${matchedIds.join(",")})`,
          )
        : builder.ilike("name", `%${query}%`);
  }

  const from = (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE;
  const { data, error, count } = await builder
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PRODUCTS_PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    rows: ((data ?? []) as ProductRecord[]).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku:
        (product.product_variants ?? []).map((variant) => variant.sku).join(", ") || "—",
      status: product.status,
      variants: product.product_variants?.length ?? 0,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PRODUCTS_PAGE_SIZE)),
  };
}
