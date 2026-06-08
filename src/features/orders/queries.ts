import type { SupabaseClient } from "@supabase/supabase-js";

import { formatVnd } from "@/src/lib/format";

export type AdminOrderRow = {
  orderNo: string;
  status: string;
  payment: string;
  total: string;
  placedAt: string;
};

type OrdersQueryClient = Pick<SupabaseClient, "from">;

type OrderRecord = {
  order_no: string;
  order_status: string;
  payment_status: string;
  grand_total: number | string;
  created_at: string;
  placed_at: string | null;
};

function formatAdminDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export async function getAdminOrderRows(client: OrdersQueryClient): Promise<AdminOrderRow[]> {
  const { data, error } = await client
    .from("orders")
    .select("order_no, order_status, payment_status, grand_total, created_at, placed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrderRecord[]).map((order) => ({
    orderNo: order.order_no,
    status: order.order_status,
    payment: order.payment_status,
    total: formatVnd(Number(order.grand_total)),
    placedAt: formatAdminDate(order.placed_at ?? order.created_at),
  }));
}
