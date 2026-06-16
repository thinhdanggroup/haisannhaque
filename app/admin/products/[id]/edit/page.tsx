import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { ProductImagesManager } from "@/components/admin/product-images-manager";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

type ProductEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Edit Product" />
          <p className="text-sm text-slate-600">You do not have access to edit products.</p>
        </div>
      );
    }
    throw error;
  }

  const { data: product, error } = await client
    .from("products")
    .select("id, name, status, short_description, origin")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  const { data: images } = await client
    .from("product_images")
    .select("id, url, alt_text")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <AdminPageHeader
        title="Edit Product"
        description={product.name}
      />
      <ProductEditForm
        id={product.id}
        name={product.name}
        status={product.status}
        shortDescription={product.short_description ?? ""}
        origin={product.origin ?? ""}
      />
      <div className="mt-8 border-t border-slate-200 pt-8">
        <ProductImagesManager
          productId={product.id}
          images={(images ?? []).map((img) => ({ id: img.id, url: img.url, altText: img.alt_text ?? null }))}
        />
      </div>
    </div>
  );
}
