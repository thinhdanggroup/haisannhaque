import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WarehouseForm } from "@/components/admin/warehouse-form";
import { updateWarehouse } from "@/src/features/inventory/warehouse-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const { data, error } = await client
    .from("warehouses")
    .select("id, code, name, address, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.code}`} />
      <WarehouseForm
        action={updateWarehouse}
        initialValues={{
          id: data.id,
          code: data.code,
          name: data.name,
          address: data.address ?? "",
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
