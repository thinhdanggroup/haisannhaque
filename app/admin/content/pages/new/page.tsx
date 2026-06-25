import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsPageForm } from "@/components/admin/cms-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsPage } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsPageNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Trang mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo trang.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="Trang mới" description="Tạo trang CMS mới." />
      <CmsPageForm action={createCmsPage} />
    </div>
  );
}
