import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getFlashSaleEvents } from "@/src/features/flash-sales/queries";
import { deleteFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import type { FlashSaleEvent } from "@/src/features/flash-sales/types";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type FlashSaleStatus = "live" | "scheduled" | "ended" | "paused";

function getEventStatus(event: FlashSaleEvent): FlashSaleStatus {
  if (!event.isActive) return "paused";
  const now = new Date().toISOString();
  if (event.endAt < now) return "ended";
  if (event.startAt > now) return "scheduled";
  return "live";
}

const STATUS_LABELS: Record<FlashSaleStatus, string> = {
  live: "Đang diễn ra",
  scheduled: "Sắp diễn ra",
  ended: "Đã kết thúc",
  paused: "Tạm dừng",
};

const STATUS_TONES: Record<FlashSaleStatus, StatusChipTone> = {
  live: "success",
  scheduled: "info",
  ended: "neutral",
  paused: "warning",
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

async function getPageData(): Promise<
  { access: "allowed"; events: FlashSaleEvent[] } | { access: "denied" }
> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", events: [] };
  }
  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");
    const events = await getFlashSaleEvents(client);
    return { access: "allowed", events };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminFlashSalesPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Flash Sale" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý flash sale.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Flash Sale"
        description="Tạo và quản lý các sự kiện giảm giá theo khung giờ."
        action={
          <Link
            href="/admin/flash-sales/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo Flash Sale
          </Link>
        }
      />
      <AdminDataTable
        columns={[
          { key: "name", label: "Tên sự kiện" },
          { key: "discountPct", label: "Giảm (%)", render: (row) => `${row.discountPct}%` },
          { key: "startAt", label: "Bắt đầu", render: (row) => formatDatetime(row.startAt) },
          { key: "endAt", label: "Kết thúc", render: (row) => formatDatetime(row.endAt) },
          {
            key: "isActive",
            label: "Trạng thái",
            render: (row) => {
              const status = getEventStatus(row);
              return <StatusChip value={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />;
            },
          },
        ]}
        rows={pageData.events}
        emptyMessage="Chưa có flash sale nào."
        actionsSlot={(row) => (
          <div className="flex gap-3">
            <Link href={`/admin/flash-sales/${row.id}/edit`} className="text-sm text-teal-700 hover:underline">
              Sửa
            </Link>
            <form
              action={async () => {
                "use server";
                await deleteFlashSaleEvent(row.id);
              }}
            >
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Xoá
              </button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
