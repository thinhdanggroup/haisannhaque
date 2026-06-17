"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const adjustSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  warehouseCode: z.string().min(1, "Warehouse is required"),
  quantityDelta: z.coerce
    .number()
    .refine((n) => n !== 0, { message: "Delta cannot be zero" }),
  reasonCode: z.string().min(2, "Reason is required"),
});

export type InventoryAdjustState = { error: string } | { success: true } | null;

export async function adjustInventoryBySku(
  _prev: InventoryAdjustState,
  formData: FormData,
): Promise<InventoryAdjustState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const result = adjustSchema.safeParse({
    sku: formData.get("sku"),
    warehouseCode: formData.get("warehouseCode"),
    quantityDelta: formData.get("quantityDelta"),
    reasonCode: formData.get("reasonCode"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { sku, warehouseCode, quantityDelta, reasonCode } = result.data;

  const { data: variant, error: variantError } = await client
    .from("product_variants")
    .select("id")
    .eq("sku", sku)
    .single();

  if (variantError || !variant) {
    return { error: `Variant not found for SKU: ${sku}` };
  }

  const { data: warehouse, error: warehouseError } = await client
    .from("warehouses")
    .select("id")
    .eq("code", warehouseCode)
    .single();

  if (warehouseError || !warehouse) {
    return { error: `Warehouse not found: ${warehouseCode}` };
  }

  const { error } = await client.from("stock_ledger_entries").insert({
    variant_id: variant.id,
    warehouse_id: warehouse.id,
    movement_type: "adjustment",
    quantity_delta: quantityDelta,
    source_doc_type: reasonCode,
  });

  if (error) throw error;

  revalidatePath("/admin/inventory");
  return { success: true };
}
