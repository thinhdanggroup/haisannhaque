import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsRowActions } from "@/components/admin/cms-row-actions";
import { StatusChip } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { deleteCmsBanner } from "@/src/features/cms/admin-actions";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type BannerRow = {
  id: string;
  title: string;
  section: string;
  cta: string;
  sortOrder: number;
  status: string;
};

type BannerRecord = {
  id: string;
  title: string;
  cta_label: string | null;
  sort_order: number;
  is_active: boolean;
  cms_sections: { section_key: string; page_key: string } | Array<{ section_key: string; page_key: string }> | null;
};

const COLUMNS: AdminDataTableColumn<BannerRow>[] = [
  { key: "title", label: "Tiêu đề" },
  { key: "section", label: "Phần" },
  { key: "cta", label: "CTA" },
  { key: "sortOrder", label: "Thứ tự" },
  {
    key: "status",
    label: "Trạng thái",
    render: (row) => (
      <StatusChip value={row.status} tone={row.status === "active" ? "success" : "neutral"} />
    ),
  },
];

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function CmsBannersPage() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "cms:update");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Banners" />
          <p className="text-sm text-slate-600">Bạn không có quyền quản lý banner.</p>
        </div>
      );
    }
    throw error;
  }

  const { data, error } = await client
    .from("cms_banners")
    .select("id, title, cta_label, sort_order, is_active, cms_sections(section_key, page_key)")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const rows: BannerRow[] = ((data ?? []) as BannerRecord[]).map((b) => {
    const section = firstRelation(b.cms_sections);
    return {
      id: b.id,
      title: b.title,
      section: section ? `${section.page_key} / ${section.section_key}` : "—",
      cta: b.cta_label ?? "—",
      sortOrder: b.sort_order,
      status: b.is_active ? "active" : "inactive",
    };
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Banners"
        description="Quản lý banner hiển thị trên các phần CMS."
        action={
          <Link
            href="/admin/content/banners/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm banner
          </Link>
        }
      />
      <AdminDataTable
        columns={COLUMNS}
        rows={rows}
        emptyMessage="No banners yet. Create one to get started."
        actionsSlot={(row) => (
          <CmsRowActions
            editHref={`/admin/content/banners/${row.id}/edit`}
            deleteAction={deleteCmsBanner.bind(null, row.id)}
            label={row.title}
          />
        )}
      />
    </div>
  );
}
