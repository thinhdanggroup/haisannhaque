import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_INVENTORY_PAGE_SIZE = 25;

export type AdminInventoryRow = {
  sku: string;
  product: string;
  warehouse: string;
  warehouseCode: string;
  available: string;
  unit: string;
  quality: string;
};

export type AdminInventoryPage = {
  rows: AdminInventoryRow[];
  total: number;
  page: number;
  pageCount: number;
};

type InventoryQueryClient = Pick<SupabaseClient, "rpc">;

type InventoryRpcRow = {
  sku: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
  available_quantity: number | string | null;
  unit: string;
  quality: string | null;
  total_variant_count: number | string | null;
};

function formatQuantity(value: number | string | null): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return String(value ?? 0);
  }

  return numericValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  });
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

export function buildInventoryHref(query: string, page: number): string {
  const params = new URLSearchParams();

  if (query.length > 0) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();

  return search.length > 0 ? `/admin/inventory?${search}` : "/admin/inventory";
}

/**
 * The RPC caps and orders results server-side, so pagination has to travel as
 * RPC args rather than a client-side range() -- unlike a plain table query,
 * this cross-joins variants with warehouses, so total_variant_count rides
 * along on every row instead of a separate exact count.
 */
export async function getAdminInventoryRows(
  client: InventoryQueryClient,
  { query, page }: { query: string; page: number },
): Promise<AdminInventoryPage> {
  const { data, error } = await client.rpc("get_admin_inventory_rows", {
    input_search: query.length > 0 ? query : null,
    input_page: page,
    input_page_size: ADMIN_INVENTORY_PAGE_SIZE,
  });

  if (error) {
    throw error;
  }

  const rpcRows = (data ?? []) as InventoryRpcRow[];
  const total = Number(rpcRows[0]?.total_variant_count ?? 0);

  return {
    rows: rpcRows.map((row) => ({
      sku: row.sku,
      product: row.product_name,
      warehouse: `${row.warehouse_code} - ${row.warehouse_name}`,
      warehouseCode: row.warehouse_code,
      available: formatQuantity(row.available_quantity),
      unit: row.unit,
      quality: row.quality ?? "sellable",
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_INVENTORY_PAGE_SIZE)),
  };
}
