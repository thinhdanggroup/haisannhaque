import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { updateCategory } from "@/src/features/catalog/category-actions";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Edit category" />
        <CategoryForm
          action={updateCategory}
          parentOptions={[]}
          initialValues={{
            id,
            slug: "",
            name: "",
            description: "",
            imageUrl: "",
            parentId: null,
            sortOrder: 0,
            isActive: true,
          }}
        />
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
          <AdminPageHeader title="Edit category" />
          <p className="text-sm text-slate-600">You do not have access to edit categories.</p>
        </div>
      );
    }
    throw e;
  }

  const [{ data, error }, { data: parents }] = await Promise.all([
    client
      .from("categories")
      .select("id, slug, name, description, image_url, parent_id, sort_order, is_active")
      .eq("id", id)
      .single(),
    client
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .is("parent_id", null)
      .neq("id", id)
      .order("name"),
  ]);

  if (error || !data) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit ${data.name}`} />
      <CategoryForm
        action={updateCategory}
        parentOptions={parents ?? []}
        initialValues={{
          id: data.id,
          name: data.name,
          description: data.description ?? "",
          imageUrl: data.image_url ?? "",
          parentId: data.parent_id,
          sortOrder: data.sort_order,
          isActive: data.is_active,
        }}
      />
    </div>
  );
}
