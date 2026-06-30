import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveFlashSale, FlashSaleEvent } from "./types";

type FlashSaleEventRow = {
  id: string;
  name: string;
  discount_pct: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
};

type FlashSaleEventProductRow = {
  product_id: string;
};

function mapEventRow(row: FlashSaleEventRow): FlashSaleEvent {
  return {
    id: row.id,
    name: row.name,
    discountPct: row.discount_pct,
    startAt: row.start_at,
    endAt: row.end_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getActiveFlashSale(
  client: SupabaseClient,
): Promise<ActiveFlashSale | null> {
  const { data: event } = await client
    .from("active_flash_sale_v" as never)
    .select("id, name, discount_pct, end_at")
    .maybeSingle();

  if (!event) return null;
  const row = event as Pick<FlashSaleEventRow, "id" | "name" | "discount_pct" | "end_at">;

  const { data: products } = await client
    .from("flash_sale_event_products" as never)
    .select("product_id")
    .eq("event_id", row.id);

  return {
    id: row.id,
    name: row.name,
    discountPct: row.discount_pct,
    endAt: row.end_at,
    productIds: ((products ?? []) as FlashSaleEventProductRow[]).map((p) => p.product_id),
  };
}

export async function getFlashSaleEvents(client: SupabaseClient): Promise<FlashSaleEvent[]> {
  const { data, error } = await client
    .from("flash_sale_events" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as FlashSaleEventRow[]).map(mapEventRow);
}

export async function getFlashSaleEvent(
  client: SupabaseClient,
  id: string,
): Promise<FlashSaleEvent | null> {
  const { data } = await client
    .from("flash_sale_events" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapEventRow(data as FlashSaleEventRow);
}

export async function getFlashSaleEventProductIds(
  client: SupabaseClient,
  eventId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("flash_sale_event_products" as never)
    .select("product_id")
    .eq("event_id", eventId);
  if (error) throw error;
  return ((data ?? []) as FlashSaleEventProductRow[]).map((r) => r.product_id);
}

export async function getProductsForSelector(
  client: SupabaseClient,
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await client
    .from("products")
    .select("id, name, slug")
    .eq("status", "published")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
}
