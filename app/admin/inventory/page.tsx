import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import {
  type AdminInventoryRow,
  getAdminInventoryRows,
} from "@/src/features/inventory/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type InventoryPageData =
  | { access: "allowed"; inventoryRows: AdminInventoryRow[] }
  | { access: "denied" };

async function getInventoryPageData(): Promise<InventoryPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", inventoryRows: [] };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:read");
    const inventoryRows = await getAdminInventoryRows(client);

    return { access: "allowed", inventoryRows };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminInventoryPage() {
  const pageData = await getInventoryPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Tồn kho" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập tồn kho.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Tồn kho"
        description="Số lượng có thể bán theo SKU và kho hàng chi nhánh."
      />
      <AdminDataTable
        columns={[
          { key: "sku", label: "SKU" },
          { key: "product", label: "Sản phẩm" },
          { key: "warehouse", label: "Kho" },
          { key: "available", label: "Tồn kho" },
          { key: "unit", label: "Đơn vị" },
          {
            key: "quality",
            label: "Chất lượng",
            render: (row) => <StatusChip value={row.quality} tone="success" />,
          },
        ]}
        rows={pageData.inventoryRows}
        emptyMessage="Chưa có dữ liệu tồn kho."
        actionsSlot={(row) => (
          <InventoryAdjustmentForm sku={row.sku} warehouseCode={row.warehouseCode} />
        )}
      />
    </div>
  );
}
