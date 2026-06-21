import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBannerForm } from "@/components/admin/cms-banner-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createCmsBanner } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsBannerNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New banner" />
          <p className="text-sm text-slate-600">You do not have access to create banners.</p>
        </div>
      );
    }
    throw error;
  }

  const { data } = await client
    .from("cms_sections")
    .select("id, section_key, page_key")
    .order("page_key", { ascending: true });

  const sections = (data ?? []).map((s) => ({
    id: s.id,
    sectionKey: s.section_key,
    pageKey: s.page_key,
  }));

  return (
    <div>
      <AdminPageHeader title="New banner" description="Add a banner to a CMS section." />
      <CmsBannerForm action={createCmsBanner} sections={sections} />
    </div>
  );
}
