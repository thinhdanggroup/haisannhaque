import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminInventoryRow = {
  sku: string;
  product: string;
  warehouse: string;
  warehouseCode: string;
  available: string;
  unit: string;
  quality: string;
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

export async function getAdminInventoryRows(
  client: InventoryQueryClient,
): Promise<AdminInventoryRow[]> {
  const { data, error } = await client.rpc("get_admin_inventory_rows");

  if (error) {
    throw error;
  }

  return ((data ?? []) as InventoryRpcRow[]).map((row) => ({
    sku: row.sku,
    product: row.product_name,
    warehouse: `${row.warehouse_code} - ${row.warehouse_name}`,
    warehouseCode: row.warehouse_code,
    available: formatQuantity(row.available_quantity),
    unit: row.unit,
    quality: row.quality ?? "sellable",
  }));
}
