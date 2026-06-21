import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsFooterLinkForm } from "@/components/admin/cms-footer-link-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsFooterLink } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsFooterLinkEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit footer link" />
          <p className="text-sm text-slate-600">You do not have access to edit footer links.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_footer_links")
    .select("id, group_label, label, href, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit footer link" description={data.label} />
      <CmsFooterLinkForm
        action={updateCmsFooterLink}
        initialValues={{
          id: data.id,
          groupLabel: data.group_label,
          label: data.label,
          href: data.href,
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
