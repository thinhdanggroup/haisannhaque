import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RecommendationTabsEditor } from "@/components/admin/recommendation-tabs-editor";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { collectTabProductIds, parseRecommendationTabs } from "@/src/features/cms/recommendation-tabs";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function RecommendationTabsPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Tab gợi ý" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa phần.</p>
        </div>
      );
    }
    throw error;
  }

  const { data: section, error } = await client
    .from("cms_sections")
    .select("id, section_key, section_type, title, metadata")
    .eq("id", id)
    .single();

  if (error || !section) notFound();

  if (section.section_type !== "recommendation_tabs") {
    return (
      <div>
        <AdminPageHeader title="Tab gợi ý" description={section.section_key} />
        <p className="text-sm text-slate-600">
          Chỉ phần loại <code>recommendation_tabs</code> mới có tab.
        </p>
      </div>
    );
  }

  const metadata =
    section.metadata && typeof section.metadata === "object" && !Array.isArray(section.metadata)
      ? (section.metadata as Record<string, unknown>)
      : {};
  const tabs = parseRecommendationTabs(metadata);
  const productIds = collectTabProductIds(tabs);

  const { data: products, error: productsError } =
    productIds.length > 0
      ? await client.from("products").select("id, name, slug").in("id", productIds)
      : { data: [], error: null };

  if (productsError) throw productsError;

  return (
    <div>
      <AdminPageHeader
        title={`Tab gợi ý — ${section.title ?? section.section_key}`}
        description="Mỗi tab hiển thị danh sách sản phẩm riêng trên trang chủ."
      />
      <p className="mb-4 text-sm">
        <Link href={`/admin/content/sections/${section.id}/edit`} className="text-teal-700 hover:underline">
          Sửa tiêu đề, thứ tự, trạng thái của phần →
        </Link>
      </p>
      <RecommendationTabsEditor
        sectionId={section.id}
        initialTabs={tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          href: tab.href ?? "",
          productIds: tab.productIds,
        }))}
        initialProducts={products ?? []}
      />
    </div>
  );
}
