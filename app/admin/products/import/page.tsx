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
          <AdminPageHeader title="Import Products" />
          <p className="text-sm text-slate-600">You do not have access to import products.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Import Products"
        description="Upload a CSV file to create multiple products at once."
      />
      <ProductImportForm />
    </div>
  );
}
