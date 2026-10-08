import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupportPageForm } from "@/components/admin/support-page-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { updateSupportPage } from "@/src/features/cms/support-page-actions";
import { getSupportPageById } from "@/src/features/cms/support-pages";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SupportPageEditPage({ params }: Props) {
  const { id } = await params;
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa trang hỗ trợ" />
          <p className="text-sm text-slate-600">Bạn không có quyền chỉnh sửa nội dung.</p>
        </div>
      );
    }
    throw error;
  }

  if (!z.string().uuid().safeParse(id).success) notFound();
  const page = await getSupportPageById(client, id);
  if (!page) notFound();

  return (
    <div>
      <AdminPageHeader title="Sửa trang hỗ trợ" description={page.title} />
      <SupportPageForm action={updateSupportPage} initialValues={page} />
    </div>
  );
}
