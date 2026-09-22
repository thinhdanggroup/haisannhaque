import Link from "next/link";
import { Search } from "lucide-react";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import {
  ADMIN_INVENTORY_PAGE_SIZE,
  buildInventoryHref,
  getAdminInventoryRows,
  parsePageParam,
  parseQueryParam,
  type AdminInventoryPage,
} from "@/src/features/inventory/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type InventoryPageData =
  | ({ access: "allowed" } & AdminInventoryPage)
  | { access: "denied" };

async function getInventoryPageData(
  query: string,
  page: number,
): Promise<InventoryPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: [], total: 0, page: 1, pageCount: 1 };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "inventory:read");

    return {
      access: "allowed",
      ...(await getAdminInventoryRows(client, { query, page })),
    };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseQueryParam(params.q);
  const requestedPage = parsePageParam(params.page);
  const pageData = await getInventoryPageData(query, requestedPage);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Tồn kho" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập tồn kho.</p>
      </div>
    );
  }

  const { rows, total, page, pageCount } = pageData;
  const skuCountOnPage = new Set(rows.map((row) => row.sku)).size;
  const firstOnPage = total === 0 ? 0 : (page - 1) * ADMIN_INVENTORY_PAGE_SIZE + 1;
  const lastOnPage = (page - 1) * ADMIN_INVENTORY_PAGE_SIZE + skuCountOnPage;

  return (
    <div>
      <AdminPageHeader
        title="Tồn kho"
        description="Số lượng có thể bán theo SKU và kho hàng chi nhánh."
      />

      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-60" htmlFor="q">
          <span className="sr-only">Tìm SKU hoặc sản phẩm</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Tìm theo tên sản phẩm hoặc SKU"
            className="min-h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Tìm
        </button>
        {query.length > 0 && (
          <Link
            href="/admin/inventory"
            className="flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "sku", label: "SKU" },
          { key: "product", label: "Sản phẩm" },
          { key: "warehouse", label: "Kho" },
          { key: "available", label: "Tồn kho" },
          { key: "unit", label: "Đơn vị" },
          {
            key: "quality",
            label: "Chất lượng",
            render: (row) => <StatusChip value={row.quality} tone="success" />,
          },
        ]}
        rows={rows}
        emptyMessage={
          query.length > 0
            ? `Không tìm thấy SKU nào khớp với “${query}”.`
            : "Chưa có dữ liệu tồn kho."
        }
        actionsSlot={(row) => (
          <InventoryAdjustmentForm sku={row.sku} warehouseCode={row.warehouseCode} />
        )}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {total === 0
            ? "0 SKU"
            : `${firstOnPage}–${lastOnPage} trong tổng số ${total} SKU`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={buildInventoryHref(query, page - 1)}
                className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Trước
              </Link>
            ) : null}
            <span>
              Trang {page}/{pageCount}
            </span>
            {page < pageCount ? (
              <Link
                href={buildInventoryHref(query, page + 1)}
                className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sau
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
