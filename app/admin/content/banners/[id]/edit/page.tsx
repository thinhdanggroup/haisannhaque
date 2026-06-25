import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsBannerForm } from "@/components/admin/cms-banner-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsBanner } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsBannerEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa banner" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa banner.</p>
        </div>
      );
    }
    throw error;
  }

  const [bannerResult, sectionsResult] = await Promise.all([
    client
      .from("cms_banners")
      .select("id, section_id, title, subtitle, image_url, mobile_image_url, cta_label, cta_href, sort_order, is_active")
      .eq("id", id)
      .single(),
    client
      .from("cms_sections")
      .select("id, section_key, page_key")
      .order("page_key", { ascending: true }),
  ]);

  if (bannerResult.error || !bannerResult.data) notFound();

  const b = bannerResult.data;
  const sections = (sectionsResult.data ?? []).map((s) => ({
    id: s.id,
    sectionKey: s.section_key,
    pageKey: s.page_key,
  }));

  return (
    <div>
      <AdminPageHeader title="Sửa banner" description={b.title} />
      <CmsBannerForm
        action={updateCmsBanner}
        sections={sections}
        initialValues={{
          id: b.id,
          sectionId: b.section_id,
          title: b.title,
          subtitle: (b as { subtitle?: string | null }).subtitle ?? "",
          imageUrl: b.image_url,
          mobileImageUrl: (b as { mobile_image_url?: string | null }).mobile_image_url ?? "",
          ctaLabel: (b as { cta_label?: string | null }).cta_label ?? "",
          ctaHref: (b as { cta_href?: string | null }).cta_href ?? "",
          sortOrder: b.sort_order,
          isActive: b.is_active,
        }}
      />
    </div>
  );
}
