import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsSectionForm } from "@/components/admin/cms-section-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateCmsSection } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CmsSectionEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa phần" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa phần.</p>
        </div>
      );
    }
    throw error;
  }

  const [sectionResult, pagesResult] = await Promise.all([
    client
      .from("cms_sections")
      .select(
        "id, page_key, section_key, section_type, title, subtitle, layout, sort_order, is_active",
      )
      .eq("id", id)
      .single(),
    client.from("cms_pages").select("page_key, title").order("title", { ascending: true }),
  ]);

  if (sectionResult.error || !sectionResult.data) notFound();

  const s = sectionResult.data;

  return (
    <div>
      <AdminPageHeader title="Sửa phần" description={s.section_key} />
      <CmsSectionForm
        action={updateCmsSection}
        pages={(pagesResult.data ?? []).map((p) => ({ pageKey: p.page_key, title: p.title }))}
        initialValues={{
          id: s.id,
          pageKey: s.page_key,
          sectionKey: s.section_key,
          sectionType: s.section_type,
          title: s.title ?? "",
          subtitle: (s as { subtitle?: string | null }).subtitle ?? "",
          layout: s.layout,
          sortOrder: s.sort_order,
          isActive: s.is_active,
        }}
      />
    </div>
  );
}
