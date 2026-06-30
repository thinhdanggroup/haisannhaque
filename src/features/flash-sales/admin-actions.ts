"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { flashSaleEventSchema, flashSaleEventUpdateSchema } from "./schema";

export type FlashSaleEventState = { error: string } | null;

export async function createFlashSaleEvent(
  _prev: FlashSaleEventState,
  formData: FormData,
): Promise<FlashSaleEventState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const result = flashSaleEventSchema.safeParse({
    name: formData.get("name"),
    discountPct: formData.get("discountPct"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    isActive: formData.get("isActive") !== "false",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const { data: event, error: insertError } = await (client
    .from("flash_sale_events" as never) as ReturnType<typeof client.from>)
    .insert({
      name: result.data.name,
      discount_pct: result.data.discountPct,
      start_at: result.data.startAt,
      end_at: result.data.endAt,
      is_active: result.data.isActive,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  const newEventId = (event as { id: string }).id;
  const productIds = formData.getAll("productIds").map(String).filter(Boolean);

  if (productIds.length > 0) {
    const rows = productIds.map((pid) => ({ event_id: newEventId, product_id: pid }));
    const { error: relError } = await client
      .from("flash_sale_event_products" as never)
      .insert(rows as never);
    if (relError) throw relError;
  }

  revalidatePath("/admin/flash-sales");
  redirect("/admin/flash-sales");
}

export async function updateFlashSaleEvent(
  _prev: FlashSaleEventState,
  formData: FormData,
): Promise<FlashSaleEventState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const result = flashSaleEventUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    discountPct: formData.get("discountPct"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    isActive: formData.get("isActive") !== "false",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const { error: updateError } = await client
    .from("flash_sale_events" as never)
    .update({
      name: result.data.name,
      discount_pct: result.data.discountPct,
      start_at: result.data.startAt,
      end_at: result.data.endAt,
      is_active: result.data.isActive,
    } as never)
    .eq("id", result.data.id);

  if (updateError) throw updateError;

  // Replace all product associations
  await client
    .from("flash_sale_event_products" as never)
    .delete()
    .eq("event_id", result.data.id);

  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  if (productIds.length > 0) {
    const rows = productIds.map((pid) => ({ event_id: result.data.id, product_id: pid }));
    const { error: relError } = await client
      .from("flash_sale_event_products" as never)
      .insert(rows as never);
    if (relError) throw relError;
  }

  revalidatePath("/admin/flash-sales");
  redirect("/admin/flash-sales");
}

export async function deleteFlashSaleEvent(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid flash sale event ID.");

  const client = await createServerClient();
  await requireAdminPermission(client, "flash_sales:manage");

  const { error } = await client
    .from("flash_sale_events" as never)
    .delete()
    .eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/flash-sales");
}
