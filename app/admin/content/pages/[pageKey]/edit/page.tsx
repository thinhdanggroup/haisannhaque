import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsPageForm } from "@/components/admin/cms-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsPage } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pageKey: string }> };

export default async function CmsPageEditPage({ params }: Props) {
  const { pageKey } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit page" />
          <p className="text-sm text-slate-600">You do not have access to edit pages.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_pages")
    .select("page_key, title, status")
    .eq("page_key", pageKey)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit page" description={data.title} />
      <CmsPageForm
        action={updateCmsPage}
        initialValues={{ pageKey: data.page_key, title: data.title, status: data.status }}
      />
    </div>
  );
}
