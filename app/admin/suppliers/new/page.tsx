import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierForm } from "@/components/admin/supplier-form";
import { createSupplier } from "@/src/features/procurement/supplier-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="New supplier" />
        <SupplierForm action={createSupplier} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "suppliers:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New supplier" />
          <p className="text-sm text-slate-600">You do not have access to create suppliers.</p>
        </div>
      );
    }
    throw e;
  }

  return (
    <div>
      <AdminPageHeader title="New supplier" />
      <SupplierForm action={createSupplier} />
    </div>
  );
}
