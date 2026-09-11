import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { deleteSocialPost } from "@/src/features/social-posts/admin-actions";
import { listSocialPosts } from "@/src/features/social-posts/queries";
import { effectiveCaption } from "@/src/features/social-posts/types";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  createdAt: string;
  idea: string;
  preview: string;
  status: string;
};

function statusTone(status: string): StatusChipTone {
  if (status === "posted" || status === "scheduled") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

type PageData =
  | { access: "denied" }
  | { access: "allowed"; rows: PostRow[] };

async function getPageData(): Promise<PageData> {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" };
    throw error;
  }

  const posts = await listSocialPosts(client);

  return {
    access: "allowed",
    rows: posts.map((post) => ({
      id: post.id,
      createdAt: post.createdAt.slice(0, 16).replace("T", " "),
      idea: post.idea.length > 60 ? `${post.idea.slice(0, 60)}…` : post.idea,
      preview: effectiveCaption(post).slice(0, 80),
      status: post.status,
    })),
  };
}

export default async function SocialPostsPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Bài đăng Facebook" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bài đăng Facebook"
        description="Sinh nội dung bài đăng bằng AI, duyệt lại rồi đăng lên Facebook."
        action={
          <div className="flex items-center gap-4">
            <Link href="/admin/social-posts/templates" className="text-sm font-medium text-teal-700">
              Mẫu prompt
            </Link>
            <Link
              href="/admin/social-posts/new"
              className="inline-flex min-h-9 items-center rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Tạo bài đăng
            </Link>
          </div>
        }
      />

      <AdminDataTable<PostRow>
        columns={[
          { key: "createdAt", label: "Thời gian" },
          { key: "idea", label: "Ý tưởng" },
          { key: "preview", label: "Nội dung" },
          {
            key: "status",
            label: "Trạng thái",
            render: (row) => <StatusChip value={row.status} tone={statusTone(row.status)} />,
          },
        ]}
        rows={data.rows}
        emptyMessage="Chưa có bài đăng nào."
        actionsSlot={(row) => (
          <div className="flex items-center gap-3">
            <Link href={`/admin/social-posts/${row.id}`} className="text-sm font-medium text-teal-700">
              Duyệt
            </Link>
            <form action={deleteSocialPost}>
              <input type="hidden" name="postId" value={row.id} />
              <button type="submit" className="text-sm font-medium text-red-700">
                Xoá
              </button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
