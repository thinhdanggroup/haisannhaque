import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SocialPostTemplateForm } from "@/components/admin/social-post-template-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { SocialPostDeleteForm } from "@/components/admin/social-post-delete-form";
import {
  deleteSocialPostTemplate,
  upsertSocialPostTemplate,
} from "@/src/features/social-posts/admin-actions";
import { listSocialPostTemplates } from "@/src/features/social-posts/queries";
import type { SocialPostTemplate } from "@/src/features/social-posts/types";

export const dynamic = "force-dynamic";

async function getPageData() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  return {
    access: "allowed" as const,
    templates: await listSocialPostTemplates(client),
  };
}

export default async function SocialPostTemplatesPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Mẫu prompt" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Mẫu prompt"
        description="Quản lý các mẫu prompt dùng để sinh nội dung bài đăng Facebook."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Thêm mẫu mới</h2>
        <SocialPostTemplateForm
          action={upsertSocialPostTemplate}
          submitLabel="Tạo mẫu"
          initialValues={{ name: "", promptBody: "", isDefault: false, isActive: true }}
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold text-slate-800">Mẫu hiện có</h2>

        {data.templates.length === 0 && (
          <p className="text-sm text-slate-600">Chưa có mẫu prompt nào.</p>
        )}

        {data.templates.map((template: SocialPostTemplate) => (
          <div key={template.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {template.name}
                {template.isDefault && (
                  <span className="ml-2 rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                    mặc định
                  </span>
                )}
              </h3>
              <SocialPostDeleteForm
                action={deleteSocialPostTemplate}
                fieldName="templateId"
                id={template.id}
                confirmMessage={`Xoá mẫu "${template.name}"? Đây là xoá vĩnh viễn — mọi bài đăng đang dùng mẫu này sẽ mất liên kết và không thể sinh lại nội dung.`}
              />
            </div>

            <SocialPostTemplateForm
              action={upsertSocialPostTemplate}
              submitLabel="Lưu thay đổi"
              initialValues={{
                id: template.id,
                name: template.name,
                promptBody: template.promptBody,
                isDefault: template.isDefault,
                isActive: template.isActive,
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
