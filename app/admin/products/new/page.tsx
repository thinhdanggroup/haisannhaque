import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProductNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sản phẩm mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo sản phẩm.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="Sản phẩm mới" description="Tạo sản phẩm mới trên cửa hàng." />
      <ProductCreateForm />
    </div>
  );
}
