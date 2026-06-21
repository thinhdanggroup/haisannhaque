import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsNavItemForm } from "@/components/admin/cms-nav-item-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsNavItem } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsNavItemEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit navigation item" />
          <p className="text-sm text-slate-600">
            You do not have access to edit navigation items.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_navigation_items")
    .select("id, placement, label, href, icon_key, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit navigation item" description={data.label} />
      <CmsNavItemForm
        action={updateCmsNavItem}
        initialValues={{
          id: data.id,
          placement: data.placement,
          label: data.label,
          href: data.href,
          iconKey: (data as { icon_key?: string | null }).icon_key ?? "",
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
