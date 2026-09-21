import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  buildProductsHref,
  getAdminProductsPage,
  parsePageParam,
  parseQueryParam,
  type AdminProductListPage,
} from "@/src/features/catalog/admin-product-list";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductsPageData =
  | ({ access: "allowed" } & AdminProductListPage)
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

async function getProductsPageData(
  query: string,
  page: number,
): Promise<ProductsPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: [], total: 0, page: 1, pageCount: 1 };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "products:read");

    return {
      access: "allowed",
      ...(await getAdminProductsPage(client, { query, page })),
    };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseQueryParam(params.q);
  const requestedPage = parsePageParam(params.page);
  const pageData = await getProductsPageData(query, requestedPage);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Sản phẩm" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập sản phẩm.</p>
      </div>
    );
  }

  const { rows, total, page, pageCount } = pageData;
  const firstOnPage = total === 0 ? 0 : (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE + 1;
  const lastOnPage = (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE + rows.length;

  return (
    <div>
      <AdminPageHeader
        title="Sản phẩm"
        description="Quản lý hồ sơ sản phẩm và các biến thể."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/import"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Nhập CSV
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm sản phẩm
            </Link>
          </div>
        }
      />

      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-60" htmlFor="q">
          <span className="sr-only">Tìm sản phẩm</span>
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
            href="/admin/products"
            className="flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "name", label: "Tên" },
          {
            key: "sku",
            label: "SKU",
            render: (row) => <span className="text-xs text-slate-500">{row.sku}</span>,
          },
          {
            key: "status",
            label: "Trạng thái",
            render: (row) => (
              <StatusChip value={row.status} tone={getProductStatusTone(row.status)} />
            ),
          },
          { key: "variants", label: "Biến thể" },
        ]}
        rows={rows}
        emptyMessage={
          query.length > 0
            ? `Không tìm thấy sản phẩm nào khớp với “${query}”.`
            : "Chưa có sản phẩm nào."
        }
        actionsSlot={(row) => <ProductRowActions id={row.id} name={row.name} />}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {total === 0
            ? "0 sản phẩm"
            : `${firstOnPage}–${lastOnPage} trong tổng số ${total} sản phẩm`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={buildProductsHref(query, page - 1)}
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
                href={buildProductsHref(query, page + 1)}
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
