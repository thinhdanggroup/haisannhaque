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

type ComplaintRow = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  reason: string;
  resolution: string;
};

type ComplaintRecord = {
  id: string;
  status: string;
  reason: string;
  resolution: string | null;
  orders: { order_no: string } | Array<{ order_no: string }> | null;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type ComplaintsPageData =
  | { access: "allowed"; complaints: ComplaintRow[] }
  | { access: "denied" };

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function getComplaintStatusTone(status: string): StatusChipTone {
  if (status === "resolved") {
    return "success";
  }

  if (status === "closed") {
    return "neutral";
  }

  if (status === "investigating") {
    return "info";
  }

  if (status === "open") {
    return "warning";
  }

  return "neutral";
}

async function getComplaints(): Promise<ComplaintRow[]> {
  const client = await createServerClient();
  await requireAdminPermission(client, "complaints:read");

  const { data, error } = await client
    .from("complaint_cases")
    .select("id, status, reason, resolution, orders(order_no), customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ComplaintRecord[]).map((complaint) => {
    const order = firstRelation(complaint.orders);
    const customer = firstRelation(complaint.customers);

    return {
      id: complaint.id,
      orderNo: order?.order_no ?? "",
      customer: customer?.full_name ?? "",
      status: complaint.status,
      reason: complaint.reason,
      resolution: complaint.resolution ?? "",
    };
  });
}

async function getComplaintsPageData(): Promise<ComplaintsPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", complaints: [] };
  }

  try {
    const complaints = await getComplaints();

    return { access: "allowed", complaints };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminComplaintsPage() {
  const pageData = await getComplaintsPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Complaints" />
        <p className="text-sm text-slate-600">You do not have access to complaints.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Complaints"
        description="Track customer complaint cases from intake through resolution."
        action={
          <Link
            href="/admin/complaints/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New complaint
          </Link>
        }
      />
      <FilterBar>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
          Support queue
        </span>
        <span className="text-xs text-slate-600">Latest 50 complaint cases</span>
      </FilterBar>
      <AdminDataTable
        columns={[
          { key: "orderNo", label: "Order" },
          { key: "customer", label: "Customer" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.status} tone={getComplaintStatusTone(row.status)} />
            ),
          },
          { key: "reason", label: "Reason" },
          { key: "resolution", label: "Resolution" },
        ]}
        rows={pageData.complaints}
        emptyMessage="No complaints yet."
        actionsSlot={(row) => <a href={`/admin/complaints/${row.id}`}>View</a>}
      />
    </div>
  );
}
