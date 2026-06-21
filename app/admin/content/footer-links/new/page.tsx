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
          <AdminPageHeader title="New footer link" />
          <p className="text-sm text-slate-600">You do not have access to create footer links.</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader title="New footer link" description="Add a link to the site footer." />
      <CmsFooterLinkForm action={createCmsFooterLink} />
    </div>
  );
}
