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
          <AdminPageHeader title="New Complaint" />
          <p>You do not have access to create complaints.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="New Complaint"
        description="Create a new complaint case for a customer order."
      />
      <ComplaintCreateForm />
    </div>
  );
}
