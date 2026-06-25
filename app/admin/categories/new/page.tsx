import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { createCategory } from "@/src/features/catalog/category-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Danh mục mới" />
        <CategoryForm action={createCategory} parentOptions={[]} />
      </div>
    );
  }

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "categories:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Danh mục mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo danh mục.</p>
        </div>
      );
    }
    throw e;
  }

  const { data } = await client
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("name");

  return (
    <div>
      <AdminPageHeader title="Danh mục mới" />
      <CategoryForm action={createCategory} parentOptions={data ?? []} />
    </div>
  );
}
