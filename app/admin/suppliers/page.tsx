import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { SupplierRowActions } from "@/components/admin/supplier-row-actions";

export const dynamic = "force-dynamic";

type SupplierRow = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; is_active: boolean };
type PageData = { access: "allowed"; suppliers: SupplierRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", suppliers: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "suppliers:update");
    const { data, error } = await client
      .from("suppliers")
      .select("id, name, contact_name, phone, email, is_active")
      .order("name");
    if (error) throw error;
    return { access: "allowed", suppliers: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminSuppliersPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Suppliers" />
        <p className="text-sm text-slate-600">You do not have access to suppliers.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Suppliers"
        description="Manage procurement supplier records."
        action={
          <Link
            href="/admin/suppliers/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New supplier
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "contact_name", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          {
            key: "is_active",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.is_active ? "active" : "inactive"} tone={row.is_active ? "success" : "neutral"} />
            ),
          },
        ]}
        rows={pageData.suppliers}
        emptyMessage="No suppliers yet. Add one to start creating purchase orders."
        actionsSlot={(row) => <SupplierRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
