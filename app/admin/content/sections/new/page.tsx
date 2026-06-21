import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsSectionForm } from "@/components/admin/cms-section-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsSection } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsSectionNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New section" />
          <p className="text-sm text-slate-600">You do not have access to create sections.</p>
        </div>
      );
    }
    throw error;
  }

  const { data } = await client
    .from("cms_pages")
    .select("page_key, title")
    .order("title", { ascending: true });

  const pages = (data ?? []).map((p) => ({ pageKey: p.page_key, title: p.title }));

  return (
    <div>
      <AdminPageHeader title="New section" description="Add a section to a CMS page." />
      <CmsSectionForm action={createCmsSection} pages={pages} />
    </div>
  );
}
