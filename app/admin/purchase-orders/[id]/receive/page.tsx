import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PurchaseOrderReceiveForm } from "@/components/admin/purchase-order-receive-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type LineRecord = {
  id: string;
  ordered_qty: number | string;
  received_qty: number | string;
  product_variants: { sku: string; unit: string } | Array<{ sku: string; unit: string }> | null;
};

function firstRelation<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export default async function AdminPurchaseOrderReceivePage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Record Receipt" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const [poRes, linesRes] = await Promise.all([
    client.from("purchase_orders").select("po_no, status").eq("id", id).single(),
    client
      .from("purchase_order_lines")
      .select("id, ordered_qty, received_qty, product_variants(sku, unit)")
      .eq("purchase_order_id", id)
      .order("id"),
  ]);

  if (poRes.error || !poRes.data) notFound();

  const po = poRes.data as { po_no: string; status: string };
  if (!["submitted", "partially_received"].includes(po.status)) {
    return (
      <div>
        <AdminPageHeader title="Record Receipt" description={po.po_no} />
        <p className="text-sm text-slate-600">
          This PO cannot receive goods in its current status ({po.status}).
        </p>
      </div>
    );
  }

  const lines = ((linesRes.data ?? []) as LineRecord[]).map((l) => {
    const variant = firstRelation(l.product_variants);
    return {
      lineId: l.id,
      sku: variant?.sku ?? l.id,
      unit: variant?.unit ?? "",
      orderedQty: String(l.ordered_qty),
      receivedQty: String(l.received_qty),
    };
  });

  return (
    <div>
      <AdminPageHeader
        title="Record Receipt"
        description={`Recording goods received for ${po.po_no}`}
      />
      <PurchaseOrderReceiveForm purchaseOrderId={id} lines={lines} />
    </div>
  );
}
