import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type PoRecord = {
  id: string;
  po_no: string;
  status: string;
  ordered_total: number | string;
  received_total: number | string;
  expected_at: string | null;
  suppliers: { name: string } | Array<{ name: string }> | null;
  warehouses: { code: string } | Array<{ code: string }> | null;
};

type LineRecord = {
  id: string;
  variant_id: string;
  ordered_qty: number | string;
  received_qty: number | string;
  unit_cost: number | string;
  product_variants: { sku: string; unit: string } | Array<{ sku: string; unit: string }> | null;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminPurchaseOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Đơn nhập hàng" />
          <p className="text-sm text-slate-600">Bạn không có quyền truy cập.</p>
        </div>
      );
    }
    throw error;
  }

  const [poRes, linesRes] = await Promise.all([
    client
      .from("purchase_orders")
      .select("id, po_no, status, ordered_total, received_total, expected_at, suppliers(name), warehouses(code)")
      .eq("id", id)
      .single(),
    client
      .from("purchase_order_lines")
      .select("id, variant_id, ordered_qty, received_qty, unit_cost, product_variants(sku, unit)")
      .eq("purchase_order_id", id)
      .order("id"),
  ]);

  if (poRes.error || !poRes.data) notFound();

  const po = poRes.data as PoRecord;
  const supplier = firstRelation(po.suppliers);
  const warehouse = firstRelation(po.warehouses);
  const lines = ((linesRes.data ?? []) as LineRecord[]).map((l) => {
    const variant = firstRelation(l.product_variants);
    return {
      id: l.id,
      sku: variant?.sku ?? l.variant_id,
      unit: variant?.unit ?? "",
      orderedQty: String(l.ordered_qty),
      receivedQty: String(l.received_qty),
      unitCost: String(l.unit_cost),
    };
  });

  const canReceive = ["submitted", "partially_received"].includes(po.status);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={po.po_no}
        description={`${supplier?.name ?? "—"} → ${warehouse?.code ?? "—"}`}
        action={
          canReceive ? (
            <Link
              href={`/admin/purchase-orders/${id}/receive`}
              className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Ghi nhận nhận hàng
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</p>
          <StatusChip value={po.status} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đã đặt</p>
          <p className="mt-1 font-semibold text-slate-800">{String(po.ordered_total)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đã nhận</p>
          <p className="mt-1 font-semibold text-slate-800">{String(po.received_total)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dự kiến</p>
          <p className="mt-1 text-slate-700">{po.expected_at ? po.expected_at.slice(0, 10) : "—"}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Chi tiết đơn</h2>
        <AdminDataTable
          columns={[
            { key: "sku", label: "SKU" },
            { key: "unit", label: "Đơn vị" },
            { key: "orderedQty", label: "Đã đặt" },
            { key: "receivedQty", label: "Đã nhận" },
            { key: "unitCost", label: "Chi phí" },
          ]}
          rows={lines}
          emptyMessage="Không có dòng nào."
        />
      </section>
    </div>
  );
}
