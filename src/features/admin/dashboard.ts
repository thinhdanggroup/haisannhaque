import type { SupabaseClient } from "@supabase/supabase-js";

import { formatVnd } from "@/src/lib/format";

export type DashboardMetricCounts = {
  openOrders: number;
  lowStockSkus: number;
  pendingRefunds: number;
  openComplaints: number;
  purchaseOrders: number;
  revenueToday: number;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

type DashboardMetricsClient = Pick<SupabaseClient, "rpc">;

type DashboardMetricsRpcRow = {
  open_order_count: number | string | null;
  low_stock_sku_count: number | string | null;
  pending_refund_count: number | string | null;
  open_complaint_count: number | string | null;
  purchase_order_count: number | string | null;
  revenue_today: number | string | null;
};

function formatDashboardVnd(value: number): string {
  return formatVnd(value).replaceAll(".", ",");
}

function toFiniteNumber(value: number | string | null | undefined): number {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function shouldUseAdminPlaywrightFixture(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://example.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "test-anon-key"
  );
}

export function createDashboardMetrics(counts: DashboardMetricCounts): DashboardMetric[] {
  return [
    { label: "Đơn chờ xử lý", value: String(counts.openOrders), detail: "Cần xem xét" },
    { label: "SKU sắp hết hàng", value: String(counts.lowStockSkus), detail: "Dưới ngưỡng" },
    { label: "Hoàn tiền chờ xử lý", value: String(counts.pendingRefunds), detail: "Hàng đợi tài chính" },
    { label: "Khiếu nại đang mở", value: String(counts.openComplaints), detail: "Hàng đợi hỗ trợ" },
    { label: "Đơn nhập hàng", value: String(counts.purchaseOrders), detail: "Mua hàng" },
    { label: "Doanh số hôm nay", value: formatDashboardVnd(counts.revenueToday), detail: "Đơn hoàn thành" },
  ];
}

export async function getAdminDashboardMetrics(
  client: DashboardMetricsClient,
): Promise<DashboardMetric[]> {
  const { data, error } = await client.rpc("get_admin_dashboard_metrics");

  if (error) {
    throw error;
  }

  const [metrics] = (data ?? []) as DashboardMetricsRpcRow[];

  return createDashboardMetrics({
    openOrders: toFiniteNumber(metrics?.open_order_count),
    lowStockSkus: toFiniteNumber(metrics?.low_stock_sku_count),
    pendingRefunds: toFiniteNumber(metrics?.pending_refund_count),
    openComplaints: toFiniteNumber(metrics?.open_complaint_count),
    purchaseOrders: toFiniteNumber(metrics?.purchase_order_count),
    revenueToday: toFiniteNumber(metrics?.revenue_today),
  });
}
