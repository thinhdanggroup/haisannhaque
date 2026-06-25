import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductImportForm } from "@/components/admin/product-import-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProductImportPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Nhập sản phẩm" />
          <p className="text-sm text-slate-600">Bạn không có quyền nhập sản phẩm.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Nhập sản phẩm"
        description="Tải lên file CSV để tạo nhiều sản phẩm cùng lúc."
      />
      <ProductImportForm />
    </div>
  );
}
