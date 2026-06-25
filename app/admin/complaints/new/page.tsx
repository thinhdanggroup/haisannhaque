import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ComplaintCreateForm } from "@/components/admin/complaint-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminComplaintNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "complaints:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Khiếu nại mới" />
          <p>Bạn không có quyền tạo khiếu nại.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Khiếu nại mới"
        description="Tạo trường hợp khiếu nại mới cho đơn hàng của khách."
      />
      <ComplaintCreateForm />
    </div>
  );
}
