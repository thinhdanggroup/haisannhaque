import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBrandAssetForm } from "@/components/admin/cms-brand-asset-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsBrandAsset } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsBrandAssetNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New brand asset" />
          <p className="text-sm text-slate-600">You do not have access to create brand assets.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New brand asset" description="Add a partner, payment, or trust logo." />
      <CmsBrandAssetForm action={createCmsBrandAsset} />
    </div>
  );
}
