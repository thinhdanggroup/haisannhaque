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
        <AdminPageHeader title="Inventory" />
        <p className="text-sm text-slate-600">You do not have access to inventory.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Inventory"
        description="Available sellable quantity by active SKU and branch warehouse."
      />
      <AdminDataTable
        columns={[
          { key: "sku", label: "SKU" },
          { key: "product", label: "Product" },
          { key: "warehouse", label: "Warehouse" },
          { key: "available", label: "Available" },
          { key: "unit", label: "Unit" },
          {
            key: "quality",
            label: "Quality",
            render: (row) => <StatusChip value={row.quality} tone="success" />,
          },
        ]}
        rows={pageData.inventoryRows}
        emptyMessage="No inventory records yet."
        actionsSlot={(row) => (
          <InventoryAdjustmentForm sku={row.sku} warehouseCode={row.warehouseCode} />
        )}
      />
    </div>
  );
}
