import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { updateWarehouse } from "@/src/features/inventory/warehouse-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageData =
  | { access: "allowed"; id: string; code: string; name: string; address: string; isActive: boolean }
  | { access: "denied" };

async function getPageData(id: string): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", id, code: "WH-01", name: "Main Warehouse", address: "", isActive: true };
  }
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:update");
    const { data, error } = await client
      .from("warehouses")
      .select("id, code, name, address, is_active")
      .eq("id", id)
      .single();
    if (error || !data) return notFound();
    return {
      access: "allowed",
      id: data.id,
      code: data.code,
      name: data.name,
      address: data.address ?? "",
      isActive: data.is_active,
    };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPageData(id);

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Sửa kho" />
        <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa kho.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title={`Sửa ${data.code}`} />
      <WarehouseForm
        action={updateWarehouse}
        initialValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          address: data.address,
          isActive: data.isActive,
        }}
      />
    </div>
  );
}
