import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { ProductImagesManager } from "@/components/admin/product-images-manager";
import { ProductRelatedManager } from "@/components/admin/product-related-manager";
import { ProductVariantsPricing } from "@/components/admin/product-variants-pricing";
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

  const [productResult, imagesResult, variantsResult] = await Promise.all([
    client
      .from("products")
      .select("id, name, status, short_description, description, origin")
      .eq("id", id)
      .single(),
    client
      .from("product_images")
      .select("id, url, alt_text")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    client
      .from("product_variants")
      .select("id, sku, unit, option_summary, list_price, sale_price, is_active")
      .eq("product_id", id)
      .order("list_price", { ascending: true }),
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  const product = productResult.data;
  const images = imagesResult.data ?? [];

  const variants = (variantsResult.data ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    unit: v.unit,
    optionSummary: v.option_summary,
    listPrice: Number(v.list_price),
    salePrice: v.sale_price !== null ? Number(v.sale_price) : null,
    isActive: v.is_active,
  }));

  // Isolated query — table may not exist until migration runs.
  type RelatedRow = {
    products: { id: string; name: string; slug: string } | Array<{ id: string; name: string; slug: string }> | null;
  };
  let related: Array<{ id: string; name: string; slug: string }> = [];
  try {
    const relatedResult = await client
      .from("product_related" as never)
      .select("related_product_id, products!product_related_related_product_id_fkey(id, name, slug)")
      .eq("product_id", id)
      .order("sort_order", { ascending: true });

    if (!relatedResult.error) {
      related = ((relatedResult.data ?? []) as unknown as RelatedRow[])
        .map((row) => {
          const raw = row.products;
          const p = Array.isArray(raw)
            ? (raw[0] as { id: string; name: string; slug: string } | undefined) ?? null
            : (raw as { id: string; name: string; slug: string } | null);
          return p;
        })
        .filter((p): p is { id: string; name: string; slug: string } => p !== null);
    }
  } catch {
    // Table not yet migrated — skip silently.
  }

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
        description={product.description ?? ""}
        origin={product.origin ?? ""}
      />
      <div className="mt-8 border-t border-slate-200 pt-8">
        <ProductVariantsPricing productId={product.id} variants={variants} />
      </div>
      <div className="mt-8 border-t border-slate-200 pt-8">
        <ProductImagesManager
          productId={product.id}
          images={images.map((img) => ({ id: img.id, url: img.url, altText: img.alt_text ?? null }))}
        />
      </div>
      <div className="mt-8 border-t border-slate-200 pt-8">
        <ProductRelatedManager
          productId={product.id}
          related={related}
        />
      </div>
    </div>
  );
}
