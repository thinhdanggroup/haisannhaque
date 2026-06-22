import type { SupabaseClient } from "@supabase/supabase-js";
import { formatVnd } from "@/src/lib/format";

type QueryClient = Pick<SupabaseClient, "from">;

export type AccountProfile = {
  customerId: string;
  fullName: string | null;
  phone: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
};

export type AccountOrder = {
  id: string;
  orderNo: string;
  status: string;
  grandTotal: string;
  placedAt: string;
  itemCount: number;
};

export type AccountAddress = {
  id: string;
  label: string | null;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault: boolean;
};

export type AccountWishlistItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
};

export type LoyaltyLedgerEntry = {
  id: string;
  pointsDelta: number;
  reason: string;
  createdAt: string;
};

export async function getAccountProfile(
  client: QueryClient,
  userId: string,
): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from("customers")
    .select("id, full_name, phone, loyalty_points, loyalty_tier")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const row = data as {
    id: string;
    full_name: string | null;
    phone: string | null;
    loyalty_points: number;
    loyalty_tier: string;
  };

  return {
    customerId: row.id,
    fullName: row.full_name,
    phone: row.phone,
    loyaltyPoints: row.loyalty_points,
    loyaltyTier: row.loyalty_tier,
  };
}

export async function getAccountOrders(
  client: QueryClient,
  customerId: string,
): Promise<AccountOrder[]> {
  const { data, error } = await client
    .from("orders")
    .select("id, order_no, order_status, grand_total, placed_at, created_at, order_items(id)")
    .eq("customer_id", customerId)
    .not("order_status", "eq", "draft_checkout")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    order_no: string;
    order_status: string;
    grand_total: number | string;
    placed_at: string | null;
    created_at: string;
    order_items: Array<{ id: string }> | null;
  }>).map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    status: row.order_status,
    grandTotal: formatVnd(Number(row.grand_total)),
    placedAt: (row.placed_at ?? row.created_at).slice(0, 10),
    itemCount: Array.isArray(row.order_items) ? row.order_items.length : 0,
  }));
}

export async function getAccountAddresses(
  client: QueryClient,
  customerId: string,
): Promise<AccountAddress[]> {
  const { data, error } = await client
    .from("addresses")
    .select("id, label, receiver_name, phone, province, district, ward, address_line, is_default")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    label: string | null;
    receiver_name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    address_line: string;
    is_default: boolean;
  }>).map((row) => ({
    id: row.id,
    label: row.label,
    receiverName: row.receiver_name,
    phone: row.phone,
    province: row.province,
    district: row.district,
    ward: row.ward,
    addressLine: row.address_line,
    isDefault: row.is_default,
  }));
}

export async function getAccountWishlist(
  client: QueryClient,
  customerId: string,
): Promise<AccountWishlistItem[]> {
  const { data, error } = await client
    .from("wishlists")
    .select("wishlist_items(id, products(id, name, slug, product_images(url)))")
    .eq("customer_id", customerId)
    .single();

  if (error || !data) return [];

  const row = data as {
    wishlist_items: Array<{
      id: string;
      products: { id: string; name: string; slug: string; product_images: Array<{ url: string }> } | null;
    }> | null;
  };

  return (row.wishlist_items ?? []).map((item) => {
    const product = item.products;
    const images = product?.product_images ?? [];
    return {
      id: item.id,
      productId: product?.id ?? "",
      productName: product?.name ?? "",
      productSlug: product?.slug ?? "",
      imageUrl: images[0]?.url ?? null,
    };
  });
}

export async function getAccountLoyaltyLedger(
  client: QueryClient,
  customerId: string,
): Promise<LoyaltyLedgerEntry[]> {
  const { data, error } = await client
    .from("loyalty_ledger")
    .select("id, points_delta, reason, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    points_delta: number;
    reason: string;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    pointsDelta: row.points_delta,
    reason: row.reason,
    createdAt: row.created_at.slice(0, 10),
  }));
}
