import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBrandAssetForm } from "@/components/admin/cms-brand-asset-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsBrandAsset } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsBrandAssetEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit brand asset" />
          <p className="text-sm text-slate-600">You do not have access to edit brand assets.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_brand_assets")
    .select("id, asset_key, placement, image_url, alt_text, href, sort_order, is_active")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit brand asset" description={data.asset_key} />
      <CmsBrandAssetForm
        action={updateCmsBrandAsset}
        initialValues={{
          id: data.id,
          assetKey: data.asset_key,
          placement: data.placement,
          imageUrl: data.image_url,
          altText: data.alt_text,
          href: (data as { href?: string | null }).href ?? "",
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
