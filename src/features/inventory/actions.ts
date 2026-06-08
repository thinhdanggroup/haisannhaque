"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const stockAdjustmentSchema = z.object({
  variantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantityDelta: z.number(),
  reasonCode: z.string().min(2),
});

export async function createStockAdjustment(input: z.infer<typeof stockAdjustmentSchema>) {
  const payload = stockAdjustmentSchema.parse(input);
  const client = await createServerClient();

  const { error } = await client.from("stock_ledger_entries").insert({
    variant_id: payload.variantId,
    warehouse_id: payload.warehouseId,
    movement_type: "adjustment",
    quantity_delta: payload.quantityDelta,
    source_doc_type: payload.reasonCode,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/admin/inventory");
}
