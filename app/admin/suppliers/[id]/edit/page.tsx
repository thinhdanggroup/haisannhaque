import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierForm } from "@/components/admin/supplier-form";
import { updateSupplier } from "@/src/features/procurement/supplier-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Sửa nhà cung cấp" />
        <SupplierForm
          action={updateSupplier}
          initialValues={{
            id,
            name: "",
            contactName: "",
            phone: "",
            email: "",
            address: "",
            taxCode: "",
            isActive: false,
          }}
        />
      </div>
    );
  }

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "suppliers:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa nhà cung cấp" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa nhà cung cấp.</p>
        </div>
      );
    }
    throw e;
  }

  const { data, error } = await client
    .from("suppliers")
    .select("id, name, contact_name, phone, email, address, tax_code, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Sửa ${data.name}`} />
      <SupplierForm
        action={updateSupplier}
        initialValues={{
          id: data.id,
          name: data.name,
          contactName: data.contact_name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          taxCode: data.tax_code ?? "",
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
