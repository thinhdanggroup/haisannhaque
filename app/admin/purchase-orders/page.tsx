import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type PurchaseOrderRow = {
  id: string;
  poNo: string;
  supplier: string;
  warehouse: string;
  status: string;
  orderedTotal: string;
  receivedTotal: string;
};

type PurchaseOrderRecord = {
  id: string;
  po_no: string;
  status: string;
  ordered_total: number | string;
  received_total: number | string;
  suppliers: { name: string } | Array<{ name: string }> | null;
  warehouses: { code: string } | Array<{ code: string }> | null;
};

type PurchaseOrdersPageData =
  | { access: "allowed"; purchaseOrders: PurchaseOrderRow[] }
  | { access: "denied" };

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
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

async function getPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const client = await createServerClient();
  await requireAdminPermission(client, "purchase_orders:read");

  const { data, error } = await client
    .from("purchase_orders")
    .select("id, po_no, status, ordered_total, received_total, suppliers(name), warehouses(code)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as PurchaseOrderRecord[]).map((purchaseOrder) => {
    const supplier = firstRelation(purchaseOrder.suppliers);
    const warehouse = firstRelation(purchaseOrder.warehouses);

    return {
      id: purchaseOrder.id,
      poNo: purchaseOrder.po_no,
      supplier: supplier?.name ?? "",
      warehouse: warehouse?.code ?? "",
      status: purchaseOrder.status,
      orderedTotal: String(purchaseOrder.ordered_total),
      receivedTotal: String(purchaseOrder.received_total),
    };
  });
}

async function getPurchaseOrdersPageData(): Promise<PurchaseOrdersPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", purchaseOrders: [] };
  }

  try {
    const purchaseOrders = await getPurchaseOrders();

    return { access: "allowed", purchaseOrders };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminPurchaseOrdersPage() {
  const pageData = await getPurchaseOrdersPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Đơn nhập hàng" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập đơn nhập hàng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Đơn nhập hàng"
        description="Theo dõi đơn nhập từ nhà cung cấp, kho đích và tiến độ nhận hàng."
        action={
          <Link
            href="/admin/purchase-orders/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo đơn nhập
          </Link>
        }
      />
      <FilterBar>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          Hàng đợi mua hàng
        </span>
        <span className="text-xs text-slate-600">50 đơn nhập gần nhất</span>
      </FilterBar>
      <AdminDataTable
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
          { key: "orderedTotal", label: "Đã đặt" },
          { key: "receivedTotal", label: "Đã nhận" },
        ]}
        rows={pageData.purchaseOrders}
        emptyMessage="Chưa có đơn nhập nào."
        actionsSlot={(row) => (
          <a
            href={`/admin/purchase-orders/${row.id}`}
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Xem
          </a>
        )}
      />
    </div>
  );
}
