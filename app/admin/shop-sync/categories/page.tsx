import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ShopSyncCategoryMappingForm } from "@/components/admin/shop-sync-category-mapping-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { listUnmappedShopSyncCategories, listMappableCategories } from "@/src/features/shop-sync/queries";
import { mapShopSyncCategory } from "@/src/features/shop-sync/admin-actions";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string };

async function getPageData() {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed" as const, unmapped: [] as CategoryRow[], mappable: [] as CategoryRow[] };
  }

  const client = await createServerClient();
  try {
    await requireAdminPermission(client, "shop_sync:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const [unmapped, mappable] = await Promise.all([
    listUnmappedShopSyncCategories(client),
    listMappableCategories(client),
  ]);

  return { access: "allowed" as const, unmapped, mappable };
}

export default async function ShopSyncCategoriesPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Ánh xạ danh mục ShopeeFood" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý đồng bộ ShopeeFood.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ánh xạ danh mục ShopeeFood"
        description="Gán mỗi danh mục ShopeeFood tự tạo vào một danh mục thật của trang web để sản phẩm đồng bộ hiển thị đúng chỗ trong điều hướng."
      />
      <AdminDataTable<CategoryRow>
        columns={[{ key: "name", label: "Danh mục ShopeeFood (chưa ánh xạ)" }]}
        rows={data.unmapped}
        emptyMessage="Không có danh mục nào cần ánh xạ."
        actionsSlot={(row) => (
          <ShopSyncCategoryMappingForm
            action={mapShopSyncCategory}
            placeholderCategoryId={row.id}
            options={data.mappable}
          />
        )}
      />
    </div>
  );
}
