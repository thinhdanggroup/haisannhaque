import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export default async function AdminProductNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Product" />
          <p className="text-sm text-slate-600">You do not have access to create products.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New Product" description="Create a new storefront product." />
      <ProductCreateForm />
    </div>
  );
}
