import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupportPageForm } from "@/components/admin/support-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createSupportPage } from "@/src/features/cms/support-page-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupportPageNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Trang hỗ trợ mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa nội dung.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Trang hỗ trợ mới"
        description="Trang mới sẽ tự có link ở mục “Hỗ trợ khách hàng” cuối trang web."
      />
      <SupportPageForm action={createSupportPage} />
    </div>
  );
}
