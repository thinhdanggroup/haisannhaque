import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { SocialPostReviewForm } from "@/components/admin/social-post-review-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import {
  publishSocialPost,
  regenerateSocialPost,
  updateSocialPostCaption,
} from "@/src/features/social-posts/admin-actions";
import { getSocialPost } from "@/src/features/social-posts/queries";
import { effectiveCaption, type SocialPost } from "@/src/features/social-posts/types";
import { isUuid } from "@/src/features/social-posts/schema";

export const dynamic = "force-dynamic";

type ReviewPageData =
  | { access: "denied" }
  | { access: "allowed"; post: SocialPost };

async function getPageData(id: string): Promise<ReviewPageData | null> {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" };
    throw error;
  }

  const post = await getSocialPost(client, id);
  if (!post) return null;

  return { access: "allowed", post };
}

function statusTone(status: string): StatusChipTone {
  if (status === "posted" || status === "scheduled") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

type PageProps = {
  // Next.js 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

export default async function SocialPostReviewPage({ params }: PageProps) {
  // Next.js 16: params is a Promise and must be awaited.
  const { id } = await params;

  if (!isUuid(id)) notFound();

  const data = await getPageData(id);
  if (!data) notFound();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Bài đăng Facebook" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  const post = data.post;
  const caption = effectiveCaption(post);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Duyệt bài đăng"
        description="Kiểm tra và chỉnh sửa nội dung trước khi đăng lên Facebook."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <StatusChip value={post.status} tone={statusTone(post.status)} />
        {post.generationMs !== null && <span>Sinh trong {Math.round(post.generationMs / 1000)}s</span>}
        {post.fbPostId && <span>Mã bài Facebook: {post.fbPostId}</span>}
        {post.scheduledPublishTime && (
          <span>Hẹn đăng: {post.scheduledPublishTime.slice(0, 16).replace("T", " ")}</span>
        )}
      </div>

      {post.errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {post.errorMessage}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Ý tưởng</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{post.idea}</p>
      </section>

      {post.imageUrl && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">Ảnh</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="Ảnh bài đăng" className="max-h-64 rounded-lg border" />
        </section>
      )}

      <SocialPostReviewForm
        postId={post.id}
        caption={caption}
        canPublish={Boolean(post.imageUrl) && caption.length > 0}
        updateAction={updateSocialPostCaption}
        regenerateAction={regenerateSocialPost}
        publishAction={publishSocialPost}
      />
    </div>
  );
}
