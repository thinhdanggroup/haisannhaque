import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SocialPostGenerateForm } from "@/components/admin/social-post-generate-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { generateSocialPost } from "@/src/features/social-posts/admin-actions";
import {
  getDefaultSocialPostTemplate,
  listSocialPostTemplates,
} from "@/src/features/social-posts/queries";

export const dynamic = "force-dynamic";

async function getPageData() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const [templates, defaultTemplate] = await Promise.all([
    listSocialPostTemplates(client),
    getDefaultSocialPostTemplate(client),
  ]);

  return {
    access: "allowed" as const,
    templates: templates.filter((template) => template.isActive),
    defaultTemplateId: defaultTemplate?.id ?? null,
  };
}

export default async function NewSocialPostPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Tạo bài đăng" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tạo bài đăng"
        description="Nhập ý tưởng và tải ảnh lên, AI sẽ viết nội dung bài đăng Facebook để bạn duyệt."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      {data.templates.length === 0 ? (
        <p className="text-sm text-slate-600">
          Chưa có mẫu prompt nào đang sử dụng.{" "}
          <Link href="/admin/social-posts/templates" className="font-medium text-teal-700">
            Tạo mẫu prompt
          </Link>{" "}
          trước khi sinh nội dung.
        </p>
      ) : (
        <SocialPostGenerateForm
          action={generateSocialPost}
          templates={data.templates.map((template) => ({ id: template.id, name: template.name }))}
          defaultTemplateId={data.defaultTemplateId}
        />
      )}
    </div>
  );
}
