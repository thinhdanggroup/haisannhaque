import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { getShopSyncRunWithItems } from "@/src/features/shop-sync/queries";

export const dynamic = "force-dynamic";

type RunItemRow = {
  externalId: string;
  action: string;
  message: string;
};

type RunDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopSyncRunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const client = await createServerClient();
  try {
    await requireAdminPermission(client, "shop_sync:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Chi tiết lượt đồng bộ" />
          <p className="text-sm text-slate-600">Bạn không có quyền xem chi tiết đồng bộ.</p>
        </div>
      );
    }
    throw error;
  }

  const result = await getShopSyncRunWithItems(client, id);
  if (!result) notFound();

  const rows: RunItemRow[] = result.items.map((item) => ({
    externalId: item.externalId,
    action: item.action,
    message: item.message ?? "",
  }));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Chi tiết lượt đồng bộ"
        description={`Trạng thái: ${result.run.status} · ${result.run.itemsCreated} tạo mới, ${result.run.itemsUpdated} cập nhật, ${result.run.itemsArchived} lưu trữ, ${result.run.itemsErrored} lỗi.`}
      />
      <AdminDataTable<RunItemRow>
        columns={[
          { key: "externalId", label: "Mã ShopeeFood" },
          { key: "action", label: "Hành động" },
          { key: "message", label: "Ghi chú" },
        ]}
        rows={rows}
        emptyMessage="Không có mục nào trong lượt đồng bộ này."
      />
    </div>
  );
}
