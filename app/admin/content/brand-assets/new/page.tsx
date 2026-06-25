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
          <AdminPageHeader title="Tài nguyên thương hiệu mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo tài nguyên thương hiệu.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="Tài nguyên thương hiệu mới" description="Thêm logo đối tác, thanh toán hoặc uy tín." />
      <CmsBrandAssetForm action={createCmsBrandAsset} />
    </div>
  );
}
