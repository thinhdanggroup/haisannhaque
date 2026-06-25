import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsFooterLinkForm } from "@/components/admin/cms-footer-link-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsFooterLink } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsFooterLinkNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Liên kết footer mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo liên kết footer.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="Liên kết footer mới" description="Thêm liên kết vào footer trang web." />
      <CmsFooterLinkForm action={createCmsFooterLink} />
    </div>
  );
}
