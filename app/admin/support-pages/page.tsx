import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsRowActions } from "@/components/admin/cms-row-actions";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { deleteSupportPage } from "@/src/features/cms/support-page-actions";
import { listSupportPages, supportPageHref } from "@/src/features/cms/support-pages";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupportPagesAdminPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Hỗ trợ khách hàng" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa nội dung.</p>
        </div>
      );
    }
    throw error;
  }

  const pages = await listSupportPages(client);

  return (
    <div>
      <AdminPageHeader
        title="Hỗ trợ khách hàng"
        description="Các trang chính sách, hướng dẫn… hiển thị ở mục “Hỗ trợ khách hàng” cuối trang web."
        action={
          <Link
            href="/admin/support-pages/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm trang
          </Link>
        }
      />

      {pages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Chưa có trang nào. Bấm “Thêm trang” để bắt đầu.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tiêu đề</th>
                <th className="px-4 py-3">Đường dẫn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{page.title}</td>
                  <td className="px-4 py-3">
                    <a
                      href={supportPageHref(page.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:underline"
                    >
                      {supportPageHref(page.slug)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      value={page.isPublished ? "Hiển thị" : "Ẩn"}
                      tone={page.isPublished ? "success" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CmsRowActions
                      editHref={`/admin/support-pages/${page.id}/edit`}
                      deleteAction={deleteSupportPage.bind(null, page.id)}
                      label={page.title}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
