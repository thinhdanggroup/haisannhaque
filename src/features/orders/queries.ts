import type { SupabaseClient } from "@supabase/supabase-js";

import { formatVnd } from "@/src/lib/format";

export type AdminOrderRow = {
  id: string;
  orderNo: string;
  status: string;
  payment: string;
  total: string;
  placedAt: string;
};

type OrdersQueryClient = Pick<SupabaseClient, "from">;

type OrderRecord = {
  id: string;
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
    .select("id, order_no, order_status, payment_status, grand_total, created_at, placed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrderRecord[]).map((order) => ({
    id: order.id,
    orderNo: order.order_no,
    status: order.order_status,
    payment: order.payment_status,
    total: formatVnd(Number(order.grand_total)),
    placedAt: formatAdminDate(order.placed_at ?? order.created_at),
  }));
}

export type AdminOrderDetail = {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  shippingTotal: string;
  discountTotal: string;
  grandTotal: string;
  placedAt: string;
  customer: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: string;
    unitPrice: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string;
    status: string;
    amount: string;
    createdAt: string;
  }>;
};

type OrderDetailRecord = {
  id: string;
  order_no: string;
  order_status: string;
  payment_status: string;
  subtotal: number | string;
  shipping_total: number | string;
  discount_total: number | string;
  grand_total: number | string;
  placed_at: string | null;
  created_at: string;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type OrderItemRecord = {
  id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
};

type PaymentRecord = {
  id: string;
  provider: string;
  payment_method: string;
  status: string;
  amount: number | string;
  created_at: string;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function getAdminOrderDetail(
  client: OrdersQueryClient & Pick<SupabaseClient, "from">,
  id: string,
): Promise<AdminOrderDetail | null> {
  const [orderRes, itemsRes, paymentsRes] = await Promise.all([
    client
      .from("orders")
      .select("id, order_no, order_status, payment_status, subtotal, shipping_total, discount_total, grand_total, placed_at, created_at, customers(full_name)")
      .eq("id", id)
      .single(),
    client
      .from("order_items")
      .select("id, product_name_snapshot, sku_snapshot, quantity, unit_price")
      .eq("order_id", id),
    client
      .from("payments")
      .select("id, provider, payment_method, status, amount, created_at")
      .eq("order_id", id),
  ]);

  if (orderRes.error || !orderRes.data) return null;

  const order = orderRes.data as OrderDetailRecord;
  const customer = firstRelation(order.customers);

  return {
    id: order.id,
    orderNo: order.order_no,
    status: order.order_status,
    paymentStatus: order.payment_status,
    subtotal: formatVnd(Number(order.subtotal)),
    shippingTotal: formatVnd(Number(order.shipping_total)),
    discountTotal: formatVnd(Number(order.discount_total)),
    grandTotal: formatVnd(Number(order.grand_total)),
    placedAt: formatAdminDate(order.placed_at ?? order.created_at),
    customer: customer?.full_name ?? "—",
    items: ((itemsRes.data ?? []) as OrderItemRecord[]).map((item) => ({
      id: item.id,
      productName: item.product_name_snapshot,
      sku: item.sku_snapshot,
      quantity: String(item.quantity),
      unitPrice: formatVnd(Number(item.unit_price)),
    })),
    payments: ((paymentsRes.data ?? []) as PaymentRecord[]).map((p) => ({
      id: p.id,
      provider: p.provider,
      method: p.payment_method,
      status: p.status,
      amount: formatVnd(Number(p.amount)),
      createdAt: p.created_at.slice(0, 10),
    })),
  };
}
