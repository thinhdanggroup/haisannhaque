import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsNavItemForm } from "@/components/admin/cms-nav-item-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsNavItem } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsNavItemNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New navigation item" />
          <p className="text-sm text-slate-600">
            You do not have access to create navigation items.
          </p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <AdminPageHeader
        title="New navigation item"
        description="Add an item to a navigation placement."
      />
      <CmsNavItemForm action={createCmsNavItem} />
    </div>
  );
}
