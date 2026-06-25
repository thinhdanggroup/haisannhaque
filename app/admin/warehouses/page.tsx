import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { WarehouseRowActions } from "@/components/admin/warehouse-row-actions";

export const dynamic = "force-dynamic";

type WarehouseRow = { id: string; code: string; name: string; address: string | null; is_active: boolean };
type PageData = { access: "allowed"; warehouses: WarehouseRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", warehouses: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:update");
    const { data, error } = await client
      .from("warehouses")
      .select("id, code, name, address, is_active")
      .order("code");
    if (error) throw error;
    return { access: "allowed", warehouses: data ?? [] };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminWarehousesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Kho hàng" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập kho hàng.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Kho hàng"
        description="Quản lý địa điểm lưu kho và đơn nhập hàng."
        action={
          <Link
            href="/admin/warehouses/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm kho
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "code", label: "Mã" },
          { key: "name", label: "Tên" },
          { key: "address", label: "Địa chỉ" },
          {
            key: "is_active",
            label: "Trạng thái",
            render: (row) => (
              <StatusChip value={row.is_active ? "active" : "inactive"} tone={row.is_active ? "success" : "neutral"} />
            ),
          },
        ]}
        rows={pageData.warehouses}
        emptyMessage="Chưa có kho nào."
        actionsSlot={(row) => <WarehouseRowActions id={row.id} code={row.code} />}
      />
    </div>
  );
}
