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
          <AdminPageHeader title="New Refund" />
          <p>You do not have access to create refunds.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="New Refund"
        description="Create a refund request for an order."
      />
      <RefundCreateForm />
    </div>
  );
}
