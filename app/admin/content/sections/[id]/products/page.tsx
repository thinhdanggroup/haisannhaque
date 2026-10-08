import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SectionProductsEditor } from "@/components/admin/section-products-editor";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type SectionProductRow = {
  sort_order: number;
  products: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
};

export default async function SectionProductsPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sản phẩm của phần" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa phần.</p>
        </div>
      );
    }
    throw error;
  }

  const { data: section, error } = await client
    .from("cms_sections")
    .select("id, section_key, section_type, title, cms_section_products(sort_order, products(id, name, slug))")
    .eq("id", id)
    .single();

  if (error || !section) notFound();

  if (section.section_type !== "product_rail" && section.section_type !== "flash_sale") {
    return (
      <div>
        <AdminPageHeader title="Sản phẩm của phần" description={section.section_key} />
        <p className="text-sm text-slate-600">Phần này không phải danh sách sản phẩm.</p>
      </div>
    );
  }

  const products = ((section.cms_section_products ?? []) as SectionProductRow[])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => (Array.isArray(row.products) ? row.products[0] : row.products))
    .filter((product): product is { id: string; name: string; slug: string } => Boolean(product));

  const title = section.title ?? section.section_key;

  return (
    <div>
      <AdminPageHeader
        title={`Sản phẩm — ${title}`}
        description="Chọn và sắp xếp sản phẩm hiển thị trong phần này trên trang chủ."
      />
      <p className="mb-4 text-sm">
        <Link href={`/admin/content/sections/${section.id}/edit`} className="text-teal-700 hover:underline">
          Sửa tiêu đề, bố cục, thứ tự, trạng thái của phần →
        </Link>
      </p>
      <SectionProductsEditor sectionId={section.id} sectionTitle={title} initialProducts={products} />
    </div>
  );
}
