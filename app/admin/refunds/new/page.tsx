import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RefundCreateForm } from "@/components/admin/refund-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRefundNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "refunds:create");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Hoàn tiền mới" />
          <p>Bạn không có quyền tạo hoàn tiền.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="Hoàn tiền mới"
        description="Tạo yêu cầu hoàn tiền cho đơn hàng."
      />
      <RefundCreateForm />
    </div>
  );
}
