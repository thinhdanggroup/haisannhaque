import type { SupabaseClient } from "@supabase/supabase-js";

export type DailySalesReportRow = {
  report_date: string;
  order_count: number;
  item_count: number;
  revenue_total: number;
  discount_total: number;
  shipping_total: number;
  refund_total: number;
};

export type ProductSalesReportRow = {
  variant_id: string;
  sku: string;
  product_name: string;
  quantity_sold: number;
  revenue_total: number;
};

export type PromotionUsageReportRow = {
  promotion_code: string;
  usage_count: number;
  discount_total: number;
};

export type LowStockReportRow = {
  variant_id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse_code: string;
  available_quantity: number;
};

export type ExpiringStockReportRow = {
  lot_id: string;
  variant_id: string;
  sku: string;
  warehouse_id: string;
  warehouse_code: string;
  lot_no: string;
  expiry_at: string;
  on_hand_quantity: number;
};

export type StockAdjustmentReportRow = {
  entry_id: string;
  variant_id: string;
  sku: string;
  warehouse_id: string;
  warehouse_code: string;
  movement_type: string;
  quantity_delta: number;
  source_doc_type: string;
  source_doc_id: string | null;
  created_at: string;
};

export type PurchaseOrdersReportRow = {
  purchase_order_id: string;
  po_no: string;
  supplier_name: string;
  warehouse_code: string;
  status: string;
  ordered_total: number;
  received_total: number;
  created_at: string;
};

export type RefundsReportRow = {
  refund_id: string;
  order_id: string;
  order_no: string;
  amount: number;
  refund_method: string;
  status: string;
  reason: string;
  created_at: string;
};

type ReportClient = Pick<SupabaseClient, "rpc">;

async function callReportRpc<T>(
  client: ReportClient,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<T[]> {
  const { data, error } = await client.rpc(functionName, parameters);

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

export async function getDailySalesReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<DailySalesReportRow[]> {
  return callReportRpc<DailySalesReportRow>(client, "get_daily_sales_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}

export async function getProductSalesReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<ProductSalesReportRow[]> {
  return callReportRpc<ProductSalesReportRow>(client, "get_product_sales_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}

export async function getPromotionUsageReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<PromotionUsageReportRow[]> {
  return callReportRpc<PromotionUsageReportRow>(client, "get_promotion_usage_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}

export async function getLowStockReport(
  client: ReportClient,
  threshold: number,
): Promise<LowStockReportRow[]> {
  return callReportRpc<LowStockReportRow>(client, "get_low_stock_report", {
    input_threshold: threshold,
  });
}

export async function getExpiringStockReport(
  client: ReportClient,
  days: number,
): Promise<ExpiringStockReportRow[]> {
  return callReportRpc<ExpiringStockReportRow>(client, "get_expiring_stock_report", {
    input_days: days,
  });
}

export async function getStockAdjustmentsReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<StockAdjustmentReportRow[]> {
  return callReportRpc<StockAdjustmentReportRow>(client, "get_stock_adjustments_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}

export async function getPurchaseOrdersReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<PurchaseOrdersReportRow[]> {
  return callReportRpc<PurchaseOrdersReportRow>(client, "get_purchase_orders_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}

export async function getRefundsReport(
  client: ReportClient,
  fromDate: string,
  toDate: string,
): Promise<RefundsReportRow[]> {
  return callReportRpc<RefundsReportRow>(client, "get_refunds_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });
}
