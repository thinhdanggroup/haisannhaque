import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { type AdminRefundRow, getAdminRefundRows } from "@/src/features/refunds/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type RefundsPageData = { access: "allowed"; refunds: AdminRefundRow[] } | { access: "denied" };

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

async function getRefunds(): Promise<AdminRefundRow[]> {
  const client = await createServerClient();
  await requireAdminPermission(client, "payments:read");

  return getAdminRefundRows(client);
}

async function getRefundsPageData(): Promise<RefundsPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", refunds: [] };
  }

  try {
    const refunds = await getRefunds();

    return { access: "allowed", refunds };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminRefundsPage() {
  const pageData = await getRefundsPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Refunds" />
        <p className="text-sm text-slate-600">You do not have access to refunds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Refunds"
        description="Review refund requests, methods, and processing state."
        action={
          <Link
            href="/admin/refunds/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New refund
          </Link>
        }
      />
      <FilterBar>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          Finance queue
        </span>
        <span className="text-xs text-slate-600">Latest 50 refund records</span>
      </FilterBar>
      <AdminDataTable
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
        rows={pageData.refunds}
        emptyMessage="No refunds yet."
      />
    </div>
  );
}
