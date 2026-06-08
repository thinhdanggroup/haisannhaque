import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import {
  getDailySalesReport,
  getExpiringStockReport,
  getLowStockReport,
  getProductSalesReport,
  getPromotionUsageReport,
  getPurchaseOrdersReport,
  getRefundsReport,
  getStockAdjustmentsReport,
} from "@/src/features/reports/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type DailyReportRow = {
  date: string;
  orders: number;
  items: string;
  revenue: string;
  refunds: string;
};

type ProductReportRow = {
  sku: string;
  product: string;
  quantity: string;
  revenue: string;
};

type PromotionReportRow = {
  code: string;
  uses: number;
  discount: string;
};

type LowStockRow = {
  sku: string;
  product: string;
  warehouse: string;
  available: string;
};

type ExpiringStockRow = {
  sku: string;
  warehouse: string;
  lot: string;
  expiry: string;
  onHand: string;
};

type StockAdjustmentRow = {
  sku: string;
  warehouse: string;
  movement: string;
  quantity: string;
  source: string;
};

type PurchaseOrderReportRow = {
  poNo: string;
  supplier: string;
  warehouse: string;
  status: string;
  ordered: string;
  received: string;
};

type RefundReportRow = {
  orderNo: string;
  amount: string;
  method: string;
  status: string;
  reason: string;
};

type ReportsPageRows = {
  daily: DailyReportRow[];
  products: ProductReportRow[];
  promotions: PromotionReportRow[];
  lowStock: LowStockRow[];
  expiringStock: ExpiringStockRow[];
  stockAdjustments: StockAdjustmentRow[];
  purchaseOrders: PurchaseOrderReportRow[];
  refunds: RefundReportRow[];
};

type ReportsPageData = { access: "allowed"; rows: ReportsPageRows } | { access: "denied" };

type ReportSectionProps<T extends object> = {
  title: string;
  columns: Array<AdminDataTableColumn<T>>;
  rows: T[];
  emptyMessage: string;
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatValue(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function createEmptyReportRows(): ReportsPageRows {
  return {
    daily: [],
    products: [],
    promotions: [],
    lowStock: [],
    expiringStock: [],
    stockAdjustments: [],
    purchaseOrders: [],
    refunds: [],
  };
}

function getPurchaseOrderStatusTone(status: string): StatusChipTone {
  if (status === "received") {
    return "success";
  }

  if (status === "cancelled") {
    return "danger";
  }

  if (status === "submitted") {
    return "info";
  }

  if (status === "partially_received") {
    return "warning";
  }

  return "neutral";
}

function getRefundStatusTone(status: string): StatusChipTone {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed" || status === "cancelled") {
    return "danger";
  }

  if (status === "approved" || status === "processing") {
    return "info";
  }

  if (status === "requested") {
    return "warning";
  }

  return "neutral";
}

function ReportSection<T extends object>({
  title,
  columns,
  rows,
  emptyMessage,
}: ReportSectionProps<T>) {
  return (
    <section className="min-w-0 space-y-2">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <AdminDataTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
    </section>
  );
}

async function getReportRows(): Promise<ReportsPageRows> {
  const client = await createServerClient();
  await requireAdminPermission(client, "reports:read");

  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(toDate.getDate() - 6);

  const from = formatDate(fromDate);
  const to = formatDate(toDate);
  const [
    dailyRows,
    productRows,
    promotionRows,
    lowStockRows,
    expiringStockRows,
    stockAdjustmentRows,
    purchaseOrderRows,
    refundRows,
  ] = await Promise.all([
    getDailySalesReport(client, from, to),
    getProductSalesReport(client, from, to),
    getPromotionUsageReport(client, from, to),
    getLowStockReport(client, 5),
    getExpiringStockReport(client, 7),
    getStockAdjustmentsReport(client, from, to),
    getPurchaseOrdersReport(client, from, to),
    getRefundsReport(client, from, to),
  ]);

  return {
    daily: dailyRows.map((row) => ({
      date: row.report_date,
      orders: row.order_count,
      items: formatValue(row.item_count),
      revenue: formatValue(row.revenue_total),
      refunds: formatValue(row.refund_total),
    })),
    products: productRows.map((row) => ({
      sku: row.sku,
      product: row.product_name,
      quantity: formatValue(row.quantity_sold),
      revenue: formatValue(row.revenue_total),
    })),
    promotions: promotionRows.map((row) => ({
      code: row.promotion_code,
      uses: row.usage_count,
      discount: formatValue(row.discount_total),
    })),
    lowStock: lowStockRows.map((row) => ({
      sku: row.sku,
      product: row.product_name,
      warehouse: row.warehouse_code,
      available: formatValue(row.available_quantity),
    })),
    expiringStock: expiringStockRows.map((row) => ({
      sku: row.sku,
      warehouse: row.warehouse_code,
      lot: row.lot_no,
      expiry: row.expiry_at,
      onHand: formatValue(row.on_hand_quantity),
    })),
    stockAdjustments: stockAdjustmentRows.map((row) => ({
      sku: row.sku,
      warehouse: row.warehouse_code,
      movement: row.movement_type,
      quantity: formatValue(row.quantity_delta),
      source: row.source_doc_type,
    })),
    purchaseOrders: purchaseOrderRows.map((row) => ({
      poNo: row.po_no,
      supplier: row.supplier_name,
      warehouse: row.warehouse_code,
      status: row.status,
      ordered: formatValue(row.ordered_total),
      received: formatValue(row.received_total),
    })),
    refunds: refundRows.map((row) => ({
      orderNo: row.order_no,
      amount: formatValue(row.amount),
      method: row.refund_method,
      status: row.status,
      reason: row.reason,
    })),
  };
}

async function getReportsPageData(): Promise<ReportsPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: createEmptyReportRows() };
  }

  try {
    const rows = await getReportRows();

    return { access: "allowed", rows };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminReportsPage() {
  const pageData = await getReportsPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Reports" />
        <p className="text-sm text-slate-600">You do not have access to reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Reports"
        description="Operational reporting for sales, stock, procurement, and refund activity."
      />
      <FilterBar>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          Last 7 days
        </span>
        <span className="text-xs text-slate-600">Sales and operations reports from RPCs</span>
      </FilterBar>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportSection
          title="Daily Sales"
          columns={[
            { key: "date", label: "Date" },
            { key: "orders", label: "Orders" },
            { key: "items", label: "Items" },
            { key: "revenue", label: "Revenue" },
            { key: "refunds", label: "Refunds" },
          ]}
          rows={pageData.rows.daily}
          emptyMessage="No daily sales rows yet."
        />
        <ReportSection
          title="Product Sales"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "product", label: "Product" },
            { key: "quantity", label: "Quantity" },
            { key: "revenue", label: "Revenue" },
          ]}
          rows={pageData.rows.products}
          emptyMessage="No product sales rows yet."
        />
        <ReportSection
          title="Promotion Usage"
          columns={[
            { key: "code", label: "Code" },
            { key: "uses", label: "Uses" },
            { key: "discount", label: "Discount" },
          ]}
          rows={pageData.rows.promotions}
          emptyMessage="No promotion usage rows yet."
        />
        <ReportSection
          title="Low Stock"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "product", label: "Product" },
            { key: "warehouse", label: "Warehouse" },
            { key: "available", label: "Available" },
          ]}
          rows={pageData.rows.lowStock}
          emptyMessage="No low stock rows yet."
        />
        <ReportSection
          title="Expiring Stock"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "warehouse", label: "Warehouse" },
            { key: "lot", label: "Lot" },
            { key: "expiry", label: "Expiry" },
            { key: "onHand", label: "On hand" },
          ]}
          rows={pageData.rows.expiringStock}
          emptyMessage="No expiring stock rows yet."
        />
        <ReportSection
          title="Stock Adjustments"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "warehouse", label: "Warehouse" },
            { key: "movement", label: "Movement" },
            { key: "quantity", label: "Quantity" },
            { key: "source", label: "Source" },
          ]}
          rows={pageData.rows.stockAdjustments}
          emptyMessage="No stock adjustment rows yet."
        />
        <ReportSection
          title="Purchase Orders"
          columns={[
            { key: "poNo", label: "PO" },
            { key: "supplier", label: "Supplier" },
            { key: "warehouse", label: "Warehouse" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getPurchaseOrderStatusTone(row.status)} />
              ),
            },
            { key: "ordered", label: "Ordered" },
            { key: "received", label: "Received" },
          ]}
          rows={pageData.rows.purchaseOrders}
          emptyMessage="No purchase order rows yet."
        />
        <ReportSection
          title="Refunds"
          columns={[
            { key: "orderNo", label: "Order" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Method" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getRefundStatusTone(row.status)} />
              ),
            },
            { key: "reason", label: "Reason" },
          ]}
          rows={pageData.rows.refunds}
          emptyMessage="No refund rows yet."
        />
      </div>
    </div>
  );
}
