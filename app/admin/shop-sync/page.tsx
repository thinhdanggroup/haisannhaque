import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { ShopSyncSettingsForm } from "@/components/admin/shop-sync-settings-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";
import { getShopSyncSettings, listShopSyncRuns } from "@/src/features/shop-sync/queries";
import { updateShopSyncSettings, triggerShopSyncNowAction } from "@/src/features/shop-sync/admin-actions";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  status: string;
  trigger: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsArchived: number;
  startedAt: string;
};

function runStatusTone(status: string): StatusChipTone {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

async function getPageData() {
  if (shouldUseAdminPlaywrightFixture()) {
    return {
      access: "allowed" as const,
      settings: null,
      runs: [] as RunRow[],
    };
  }

  const client = await createServerClient();
  try {
    await requireAdminPermission(client, "shop_sync:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const [settings, runs] = await Promise.all([getShopSyncSettings(client), listShopSyncRuns(client)]);

  return {
    access: "allowed" as const,
    settings,
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      itemsCreated: r.itemsCreated,
      itemsUpdated: r.itemsUpdated,
      itemsArchived: r.itemsArchived,
      startedAt: r.startedAt.slice(0, 16).replace("T", " "),
    })),
  };
}

export default async function ShopSyncPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Đồng bộ ShopeeFood" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý đồng bộ ShopeeFood.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Đồng bộ ShopeeFood"
        description="Tự động đồng bộ sản phẩm và thông tin shop từ ShopeeFood theo lịch."
        action={
          <Link href="/admin/shop-sync/categories" className="text-sm font-medium text-teal-700">
            Ánh xạ danh mục →
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Cài đặt</h2>
        <ShopSyncSettingsForm
          action={updateShopSyncSettings}
          initialValues={{
            sourceUrl: data.settings?.sourceUrl ?? "https://shopeefood.vn/now-food/shop/1303714",
            enabled: data.settings?.enabled ?? false,
            cronExpression: data.settings?.cronExpression ?? "0 3 * * *",
            targetCatalog: data.settings?.targetCatalog ?? true,
            targetShopInfo: data.settings?.targetShopInfo ?? true,
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Lịch sử chạy</h2>
          <form action={triggerShopSyncNowAction}>
            <button
              type="submit"
              className="inline-flex min-h-9 items-center rounded-lg border border-teal-700 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Chạy ngay
            </button>
          </form>
        </div>
        <AdminDataTable<RunRow>
          columns={[
            { key: "startedAt", label: "Thời gian" },
            { key: "trigger", label: "Loại" },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => <StatusChip value={row.status} tone={runStatusTone(row.status)} />,
            },
            { key: "itemsCreated", label: "Đã tạo" },
            { key: "itemsUpdated", label: "Đã cập nhật" },
            { key: "itemsArchived", label: "Đã lưu trữ" },
          ]}
          rows={data.runs}
          emptyMessage="Chưa có lượt đồng bộ nào."
          actionsSlot={(row) => (
            <Link href={`/admin/shop-sync/runs/${row.id}`} className="text-sm font-medium text-teal-700">
              Xem chi tiết
            </Link>
          )}
        />
      </section>
    </div>
  );
}
