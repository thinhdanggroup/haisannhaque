import Link from "next/link";
import { Plus } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductClient = Pick<SupabaseClient, "from">;

type AdminProductRow = {
  id: string;
  name: string;
  status: string;
  variants: number;
};

type ProductRecord = {
  id: string;
  name: string;
  status: string;
  product_variants: Array<{ id: string }> | null;
};

type ProductsPageData =
  | { access: "allowed"; products: AdminProductRow[] }
  | { access: "denied" };

function getProductStatusTone(status: string): StatusChipTone {
  if (status === "published") {
    return "success";
  }

  if (status === "draft") {
    return "warning";
  }

  return "neutral";
}

async function getAdminProductRows(client: ProductClient): Promise<AdminProductRow[]> {
  const { data, error } = await client
    .from("products")
    .select("id, name, status, product_variants(id)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductRecord[]).map((product) => ({
    id: product.id,
    name: product.name,
    status: product.status,
    variants: product.product_variants?.length ?? 0,
  }));
}

async function getProductsPageData(): Promise<ProductsPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", products: [] };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "products:read");
    const products = await getAdminProductRows(client);

    return { access: "allowed", products };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminProductsPage() {
  const pageData = await getProductsPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Products" />
        <p className="text-sm text-slate-600">You do not have access to products.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Manage storefront product records and variant coverage."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/import"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import CSV
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New product
            </Link>
          </div>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Name" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <StatusChip value={row.status} tone={getProductStatusTone(row.status)} />
            ),
          },
          { key: "variants", label: "Variants" },
        ]}
        rows={pageData.products}
        emptyMessage="No products created yet."
        actionsSlot={(row) => <ProductRowActions id={row.id} name={row.name} />}
      />
    </div>
  );
}
