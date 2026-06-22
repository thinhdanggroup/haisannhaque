import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { createWarehouse } from "@/src/features/inventory/warehouse-actions";

export const dynamic = "force-dynamic";

export default function NewWarehousePage() {
  return (
    <div>
      <AdminPageHeader title="New warehouse" />
      <WarehouseForm action={createWarehouse} />
    </div>
  );
}
