import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PurchaseOrderCreateForm } from "@/components/admin/purchase-order-create-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPurchaseOrderNewPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="New Purchase Order" />
          <p className="text-sm text-slate-600">You do not have access.</p>
        </div>
      );
    }
    throw error;
  }

  const [suppliersRes, warehousesRes, variantsRes] = await Promise.all([
    client.from("suppliers").select("id, name").order("name").limit(200),
    client.from("warehouses").select("id, code").eq("is_active", true).order("code").limit(50),
    client
      .from("product_variants")
      .select("id, sku, products(name)")
      .eq("is_active", true)
      .order("sku")
      .limit(500),
  ]);

  type VariantRecord = {
    id: string;
    sku: string;
    products: { name: string } | Array<{ name: string }> | null;
  };

  function firstRelation<T>(rel: T | T[] | null): T | null {
    return Array.isArray(rel) ? (rel[0] ?? null) : rel;
  }

  const suppliers = (suppliersRes.data ?? []) as Array<{ id: string; name: string }>;
  const warehouses = (warehousesRes.data ?? []) as Array<{ id: string; code: string }>;
  const variants = ((variantsRes.data ?? []) as VariantRecord[]).map((v) => ({
    id: v.id,
    sku: v.sku,
    productName: firstRelation(v.products)?.name ?? v.sku,
  }));

  return (
    <div>
      <AdminPageHeader
        title="New Purchase Order"
        description="Create a supplier purchase order with line items."
      />
      <PurchaseOrderCreateForm
        suppliers={suppliers}
        warehouses={warehouses}
        variants={variants}
      />
    </div>
  );
}
