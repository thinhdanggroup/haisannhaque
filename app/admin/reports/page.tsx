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
        <AdminPageHeader title="Báo cáo" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập báo cáo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Báo cáo"
        description="Báo cáo vận hành về doanh số, kho hàng, mua hàng và hoàn tiền."
      />
      <FilterBar>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          7 ngày qua
        </span>
        <span className="text-xs text-slate-600">Báo cáo bán hàng và vận hành</span>
      </FilterBar>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportSection
          title="Doanh số theo ngày"
          columns={[
            { key: "date", label: "Ngày" },
            { key: "orders", label: "Đơn hàng" },
            { key: "items", label: "Sản phẩm" },
            { key: "revenue", label: "Doanh thu" },
            { key: "refunds", label: "Hoàn tiền" },
          ]}
          rows={pageData.rows.daily}
          emptyMessage="Chưa có dữ liệu doanh số theo ngày."
        />
        <ReportSection
          title="Doanh số sản phẩm"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "product", label: "Sản phẩm" },
            { key: "quantity", label: "Số lượng" },
            { key: "revenue", label: "Doanh thu" },
          ]}
          rows={pageData.rows.products}
          emptyMessage="Chưa có dữ liệu doanh số sản phẩm."
        />
        <ReportSection
          title="Sử dụng khuyến mãi"
          columns={[
            { key: "code", label: "Mã" },
            { key: "uses", label: "Lần dùng" },
            { key: "discount", label: "Giảm giá" },
          ]}
          rows={pageData.rows.promotions}
          emptyMessage="Chưa có dữ liệu sử dụng khuyến mãi."
        />
        <ReportSection
          title="Sắp hết hàng"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "product", label: "Sản phẩm" },
            { key: "warehouse", label: "Kho" },
            { key: "available", label: "Tồn kho" },
          ]}
          rows={pageData.rows.lowStock}
          emptyMessage="Chưa có dữ liệu sắp hết hàng."
        />
        <ReportSection
          title="Sắp hết hạn"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "warehouse", label: "Kho" },
            { key: "lot", label: "Lô" },
            { key: "expiry", label: "Ngày hết hạn" },
            { key: "onHand", label: "Tồn kho" },
          ]}
          rows={pageData.rows.expiringStock}
          emptyMessage="Chưa có dữ liệu sắp hết hạn."
        />
        <ReportSection
          title="Điều chỉnh tồn kho"
          columns={[
            { key: "sku", label: "SKU" },
            { key: "warehouse", label: "Kho" },
            { key: "movement", label: "Loại" },
            { key: "quantity", label: "Số lượng" },
            { key: "source", label: "Nguồn" },
          ]}
          rows={pageData.rows.stockAdjustments}
          emptyMessage="Chưa có dữ liệu điều chỉnh tồn kho."
        />
        <ReportSection
          title="Đơn nhập hàng"
          columns={[
            { key: "poNo", label: "Mã PO" },
            { key: "supplier", label: "Nhà cung cấp" },
            { key: "warehouse", label: "Kho" },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <StatusChip value={row.status} tone={getPurchaseOrderStatusTone(row.status)} />
              ),
            },
            { key: "ordered", label: "Đã đặt" },
            { key: "received", label: "Đã nhận" },
          ]}
          rows={pageData.rows.purchaseOrders}
          emptyMessage="Chưa có dữ liệu đơn nhập hàng."
        />
        <ReportSection
          title="Hoàn tiền"
          columns={[
            { key: "orderNo", label: "Đơn hàng" },
            { key: "amount", label: "Số tiền" },
            { key: "method", label: "Phương thức" },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <StatusChip value={row.status} tone={getRefundStatusTone(row.status)} />
              ),
            },
            { key: "reason", label: "Lý do" },
          ]}
          rows={pageData.rows.refunds}
          emptyMessage="Chưa có dữ liệu hoàn tiền."
        />
      </div>
    </div>
  );
}
