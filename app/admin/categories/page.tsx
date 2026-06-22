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

type RawCategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  parent: { name: string }[] | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  parent: { name: string } | null;
};

type PageData = { access: "allowed"; categories: CategoryRow[] } | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) return { access: "allowed", categories: [] };
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "categories:update");
    const { data, error } = await client
      .from("categories")
      .select("id, slug, name, parent_id, sort_order, is_active, parent:categories!parent_id(name)")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    const categories: CategoryRow[] = ((data ?? []) as RawCategoryRow[]).map((row) => ({
      ...row,
      parent: Array.isArray(row.parent) ? (row.parent[0] ?? null) : row.parent,
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
        <AdminPageHeader title="Categories" />
        <p className="text-sm text-slate-600">You do not have access to categories.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="Manage the product taxonomy used for browsing and filtering."
        action={
          <Link
            href="/admin/categories/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New category
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          {
            key: "parent",
            label: "Parent",
            render: (row) => (
              <span className="text-sm text-slate-500">{row.parent?.name ?? "—"}</span>
            ),
          },
          { key: "sort_order", label: "Order" },
          {
            key: "is_active",
            label: "Status",
            render: (row) => (
              <StatusChip
                value={row.is_active ? "active" : "inactive"}
                tone={row.is_active ? "success" : "neutral"}
              />
            ),
          },
        ]}
        rows={pageData.categories}
        emptyMessage="No categories yet."
        actionsSlot={(row) => <CategoryRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
