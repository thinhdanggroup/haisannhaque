import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { CategoryRowActions } from "@/components/admin/category-row-actions";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  parentName: string | null;
};

type PageData = { access: "allowed"; categories: CategoryRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", categories: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "categories:update");
    const { data, error } = await client
      .from("categories")
      .select("id, slug, name, parent_id, sort_order, is_active")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    const rows = (data ?? []) as { id: string; slug: string; name: string; parent_id: string | null; sort_order: number; is_active: boolean }[];
    const nameById = new Map(rows.map((r) => [r.id, r.name]));
    const categories: CategoryRow[] = rows.map((row) => ({
      ...row,
      parentName: row.parent_id ? (nameById.get(row.parent_id) ?? null) : null,
    }));
    return { access: "allowed", categories };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminCategoriesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Danh mục" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập danh mục.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Danh mục"
        description="Quản lý phân loại sản phẩm dùng để duyệt và lọc."
        action={
          <Link
            href="/admin/categories/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm danh mục
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Tên" },
          { key: "slug", label: "Slug" },
          {
            key: "parentName",
            label: "Danh mục cha",
            render: (row) => (
              <span className="text-sm text-slate-500">{row.parentName ?? "—"}</span>
            ),
          },
          { key: "sort_order", label: "Thứ tự" },
          {
            key: "is_active",
            label: "Trạng thái",
            render: (row) => (
              <StatusChip
                value={row.is_active ? "active" : "inactive"}
                tone={row.is_active ? "success" : "neutral"}
              />
            ),
          },
        ]}
        rows={pageData.categories}
        emptyMessage="Chưa có danh mục nào."
        actionsSlot={(row) => <CategoryRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
