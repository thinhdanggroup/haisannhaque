import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ComplaintUpdateForm } from "@/components/admin/complaint-update-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type ComplaintRecord = {
  id: string;
  status: string;
  reason: string;
  resolution: string | null;
  orders: { order_no: string } | Array<{ order_no: string }> | null;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminComplaintDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "complaints:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Complaint" />
          <p>You do not have access to complaints.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("complaint_cases")
    .select("id, status, reason, resolution, orders(order_no), customers(full_name)")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const complaint = data as ComplaintRecord;
  const order = firstRelation(complaint.orders);
  const customer = firstRelation(complaint.customers);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Complaint Detail"
        description={`Order ${order?.order_no ?? "—"} · ${customer?.full_name ?? "Unknown customer"}`}
      />

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p>
        <p className="mt-1 text-sm text-slate-800">{complaint.reason}</p>
      </div>

      <ComplaintUpdateForm
        id={complaint.id}
        status={complaint.status}
        resolution={complaint.resolution ?? ""}
      />
    </div>
  );
}
