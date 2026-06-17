import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip } from "@/components/admin/status-chip";
import { OrderTransitionButton } from "@/components/admin/order-transition-button";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { canTransitionOrder, type OrderStatus } from "@/src/features/orders/status";
import { getAdminOrderDetail } from "@/src/features/orders/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

const ALL_STATUSES: OrderStatus[] = [
  "draft_checkout", "awaiting_payment", "payment_failed",
  "pending_confirmation", "confirmed", "picking", "packed",
  "dispatched", "delivery_attempted", "delivered", "completed",
  "cancelled", "returned", "partially_returned", "refunded",
];

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "orders:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Order Detail" />
          <p className="text-sm text-slate-600">You do not have access to orders.</p>
        </div>
      );
    }
    throw error;
  }

  const order = await getAdminOrderDetail(client, id);
  if (!order) notFound();

  const nextStatuses = ALL_STATUSES.filter((s) =>
    canTransitionOrder(order.status as OrderStatus, s),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Order ${order.orderNo}`} description={`Customer: ${order.customer}`} />

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <StatusChip value={order.status} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment</p>
          <StatusChip value={order.paymentStatus} tone="neutral" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 font-semibold text-slate-800">{order.grandTotal}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Placed</p>
          <p className="mt-1 text-slate-700">{order.placedAt}</p>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Transition status</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <OrderTransitionButton key={s} orderId={id} nextStatus={s} />
            ))}
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Order items</h2>
        <AdminDataTable
          columns={[
            { key: "productName", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "quantity", label: "Qty" },
            { key: "unitPrice", label: "Unit price" },
          ]}
          rows={order.items}
          emptyMessage="No items."
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Payments</h2>
        <AdminDataTable
          columns={[
            { key: "provider", label: "Provider" },
            { key: "method", label: "Method" },
            { key: "amount", label: "Amount" },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusChip value={row.status} tone="neutral" />,
            },
            { key: "createdAt", label: "Date" },
          ]}
          rows={order.payments}
          emptyMessage="No payments."
        />
      </section>
    </div>
  );
}
