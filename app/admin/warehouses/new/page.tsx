import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { createWarehouse } from "@/src/features/inventory/warehouse-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewWarehousePage() {
  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Kho mới" />
        <WarehouseForm action={createWarehouse} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Kho mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo kho.</p>
        </div>
      );
    }
    throw e;
  }

  return (
    <div>
      <AdminPageHeader title="Kho mới" />
      <WarehouseForm action={createWarehouse} />
    </div>
  );
}
