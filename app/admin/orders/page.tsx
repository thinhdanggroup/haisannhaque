import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { type AdminOrderRow, getAdminOrderRows } from "@/src/features/orders/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrdersPageData = { access: "allowed"; orders: AdminOrderRow[] } | { access: "denied" };

function getOrderStatusTone(status: string): StatusChipTone {
  if (["completed", "delivered"].includes(status)) {
    return "success";
  }

  if (["cancelled", "payment_failed", "refunded", "returned"].includes(status)) {
    return "danger";
  }

  if (["awaiting_payment", "pending_confirmation", "delivery_attempted"].includes(status)) {
    return "warning";
  }

  if (["confirmed", "picking", "packed", "dispatched"].includes(status)) {
    return "info";
  }

  return "neutral";
}

function getPaymentStatusTone(status: string): StatusChipTone {
  if (status === "paid") {
    return "success";
  }

  if (status === "failed") {
    return "danger";
  }

  if (status === "awaiting_payment" || status === "partially_refunded") {
    return "warning";
  }

  return "neutral";
}

async function getOrdersPageData(): Promise<OrdersPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", orders: [] };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "orders:read");
    const orders = await getAdminOrderRows(client);

    return { access: "allowed", orders };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminOrdersPage() {
  const pageData = await getOrdersPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Orders" />
        <p className="text-sm text-slate-600">You do not have access to orders.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Orders" description="Review recent checkout orders and payment state." />
      <AdminDataTable
        columns={[
          { key: "orderNo", label: "Order" },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusChip value={row.status} tone={getOrderStatusTone(row.status)} />,
          },
          {
            key: "payment",
            label: "Payment",
            render: (row) => (
              <StatusChip value={row.payment} tone={getPaymentStatusTone(row.payment)} />
            ),
          },
          { key: "total", label: "Total" },
          { key: "placedAt", label: "Placed" },
        ]}
        rows={pageData.orders}
        emptyMessage="No orders yet."
        actionsSlot={(row) => (
          <a
            href={`/admin/orders/${row.id}`}
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View
          </a>
        )}
      />
    </div>
  );
}
