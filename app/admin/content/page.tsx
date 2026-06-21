import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsRowActions } from "@/components/admin/cms-row-actions";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import {
  deleteCmsBanner,
  deleteCmsBrandAsset,
  deleteCmsFooterLink,
  deleteCmsNavItem,
  deleteCmsPage,
  deleteCmsSection,
} from "@/src/features/cms/admin-actions";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type CmsPageRow = { pageKey: string; title: string; status: string; updatedAt: string };
type CmsSectionRow = {
  id: string;
  pageKey: string;
  sectionKey: string;
  type: string;
  title: string;
  status: string;
};
type CmsBannerRow = { id: string; title: string; section: string; cta: string; status: string };
type CmsNavigationRow = {
  id: string;
  placement: string;
  label: string;
  href: string;
  status: string;
};
type CmsFooterLinkRow = { id: string; group: string; label: string; href: string; status: string };
type CmsBrandAssetRow = {
  id: string;
  assetKey: string;
  placement: string;
  altText: string;
  status: string;
};

type CmsContentRows = {
  pages: CmsPageRow[];
  sections: CmsSectionRow[];
  banners: CmsBannerRow[];
  navigation: CmsNavigationRow[];
  footerLinks: CmsFooterLinkRow[];
  brandAssets: CmsBrandAssetRow[];
};

type CmsPageRecord = {
  page_key: string;
  title: string;
  status: string;
  updated_at: string;
};

type CmsSectionRecord = {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  title: string | null;
  is_active: boolean;
};

type CmsBannerRecord = {
  id: string;
  title: string;
  cta_label: string | null;
  is_active: boolean;
  cms_sections: { section_key: string } | Array<{ section_key: string }> | null;
};

type CmsNavigationRecord = {
  id: string;
  placement: string;
  label: string;
  href: string;
  is_active: boolean;
};

type CmsFooterLinkRecord = {
  id: string;
  group_label: string;
  label: string;
  href: string;
  is_active: boolean;
};

type CmsBrandAssetRecord = {
  id: string;
  asset_key: string;
  placement: string;
  alt_text: string;
  is_active: boolean;
};

type ContentPageData = { access: "allowed"; rows: CmsContentRows } | { access: "denied" };

type CmsTableSectionProps<T extends object> = {
  title: string;
  columns: Array<AdminDataTableColumn<T>>;
  rows: T[];
  emptyMessage: string;
  newHref?: string;
  actionsSlot?: (row: T) => ReactNode;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function createEmptyCmsContentRows(): CmsContentRows {
  return {
    pages: [],
    sections: [],
    banners: [],
    navigation: [],
    footerLinks: [],
    brandAssets: [],
  };
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

function formatActiveStatus(isActive: boolean): string {
  return isActive ? "active" : "inactive";
}

function getPublicationStatusTone(status: string): StatusChipTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "neutral";
  return "neutral";
}

function getActiveStatusTone(status: string): StatusChipTone {
  return status === "active" ? "success" : "neutral";
}

function CmsTableSection<T extends object>({
  title,
  columns,
  rows,
  emptyMessage,
  newHref,
  actionsSlot,
}: CmsTableSectionProps<T>) {
  return (
    <section className="min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {newHref && (
          <Link
            href={newHref}
            className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            New
          </Link>
        )}
      </div>
      <AdminDataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        actionsSlot={actionsSlot}
      />
    </section>
  );
}

async function getCmsContentRows(): Promise<CmsContentRows> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const [
    pagesResult,
    sectionsResult,
    bannersResult,
    navigationResult,
    footerLinksResult,
    brandAssetsResult,
  ] = await Promise.all([
    client
      .from("cms_pages")
      .select("page_key, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    client
      .from("cms_sections")
      .select("id, page_key, section_key, section_type, title, is_active, sort_order")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_banners")
      .select("id, title, cta_label, is_active, sort_order, cms_sections(section_key)")
      .order("sort_order", { ascending: true })
      .limit(50),
    client
      .from("cms_navigation_items")
      .select("id, placement, label, href, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_footer_links")
      .select("id, group_label, label, href, is_active, sort_order")
      .order("group_label", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_brand_assets")
      .select("id, asset_key, placement, alt_text, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(50),
  ]);

  if (pagesResult.error) throw pagesResult.error;
  if (sectionsResult.error) throw sectionsResult.error;
  if (bannersResult.error) throw bannersResult.error;
  if (navigationResult.error) throw navigationResult.error;
  if (footerLinksResult.error) throw footerLinksResult.error;
  if (brandAssetsResult.error) throw brandAssetsResult.error;

  return {
    pages: ((pagesResult.data ?? []) as CmsPageRecord[]).map((p) => ({
      pageKey: p.page_key,
      title: p.title,
      status: p.status,
      updatedAt: formatDate(p.updated_at),
    })),
    sections: ((sectionsResult.data ?? []) as CmsSectionRecord[]).map((s) => ({
      id: s.id,
      pageKey: s.page_key,
      sectionKey: s.section_key,
      type: s.section_type,
      title: s.title ?? "",
      status: formatActiveStatus(s.is_active),
    })),
    banners: ((bannersResult.data ?? []) as CmsBannerRecord[]).map((b) => {
      const section = firstRelation(b.cms_sections);
      return {
        id: b.id,
        title: b.title,
        section: section?.section_key ?? "",
        cta: b.cta_label ?? "",
        status: formatActiveStatus(b.is_active),
      };
    }),
    navigation: ((navigationResult.data ?? []) as CmsNavigationRecord[]).map((n) => ({
      id: n.id,
      placement: n.placement,
      label: n.label,
      href: n.href,
      status: formatActiveStatus(n.is_active),
    })),
    footerLinks: ((footerLinksResult.data ?? []) as CmsFooterLinkRecord[]).map((l) => ({
      id: l.id,
      group: l.group_label,
      label: l.label,
      href: l.href,
      status: formatActiveStatus(l.is_active),
    })),
    brandAssets: ((brandAssetsResult.data ?? []) as CmsBrandAssetRecord[]).map((a) => ({
      id: a.id,
      assetKey: a.asset_key,
      placement: a.placement,
      altText: a.alt_text,
      status: formatActiveStatus(a.is_active),
    })),
  };
}

async function getContentPageData(): Promise<ContentPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", rows: createEmptyCmsContentRows() };
  }

  try {
    const rows = await getCmsContentRows();
    return { access: "allowed", rows };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" };
    throw error;
  }
}

export default async function AdminContentPage() {
  const pageData = await getContentPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Content" />
        <p className="text-sm text-slate-600">You do not have access to content management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Content"
        description="Review and manage storefront CMS records, navigation, footer links, and brand assets."
        action={
          <Link
            href="/admin/content/pages/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New page
          </Link>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <CmsTableSection
          title="CMS pages"
          newHref="/admin/content/pages/new"
          columns={[
            { key: "pageKey", label: "Page" },
            { key: "title", label: "Title" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getPublicationStatusTone(row.status)} />
              ),
            },
            { key: "updatedAt", label: "Updated" },
          ]}
          rows={pageData.rows.pages}
          emptyMessage="No CMS pages yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/pages/${row.pageKey}/edit`}
              deleteAction={deleteCmsPage.bind(null, row.pageKey)}
              label={row.title}
            />
          )}
        />
        <CmsTableSection
          title="CMS sections"
          newHref="/admin/content/sections/new"
          columns={[
            { key: "pageKey", label: "Page" },
            { key: "sectionKey", label: "Section" },
            { key: "type", label: "Type" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.sections}
          emptyMessage="No CMS sections yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/sections/${row.id}/edit`}
              deleteAction={deleteCmsSection.bind(null, row.id)}
              label={row.sectionKey}
            />
          )}
        />
        <CmsTableSection
          title="Banners"
          newHref="/admin/content/banners/new"
          columns={[
            { key: "title", label: "Title" },
            { key: "section", label: "Section" },
            { key: "cta", label: "CTA" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.banners}
          emptyMessage="No banners yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/banners/${row.id}/edit`}
              deleteAction={deleteCmsBanner.bind(null, row.id)}
              label={row.title}
            />
          )}
        />
        <CmsTableSection
          title="Navigation"
          newHref="/admin/content/navigation/new"
          columns={[
            { key: "placement", label: "Placement" },
            { key: "label", label: "Label" },
            { key: "href", label: "Href" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.navigation}
          emptyMessage="No navigation items yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/navigation/${row.id}/edit`}
              deleteAction={deleteCmsNavItem.bind(null, row.id)}
              label={row.label}
            />
          )}
        />
        <CmsTableSection
          title="Footer links"
          newHref="/admin/content/footer-links/new"
          columns={[
            { key: "group", label: "Group" },
            { key: "label", label: "Label" },
            { key: "href", label: "Href" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.footerLinks}
          emptyMessage="No footer links yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/footer-links/${row.id}/edit`}
              deleteAction={deleteCmsFooterLink.bind(null, row.id)}
              label={row.label}
            />
          )}
        />
        <CmsTableSection
          title="Brand assets"
          newHref="/admin/content/brand-assets/new"
          columns={[
            { key: "assetKey", label: "Asset" },
            { key: "placement", label: "Placement" },
            { key: "altText", label: "Alt text" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusChip value={row.status} tone={getActiveStatusTone(row.status)} />
              ),
            },
          ]}
          rows={pageData.rows.brandAssets}
          emptyMessage="No brand assets yet."
          actionsSlot={(row) => (
            <CmsRowActions
              editHref={`/admin/content/brand-assets/${row.id}/edit`}
              deleteAction={deleteCmsBrandAsset.bind(null, row.id)}
              label={row.altText}
            />
          )}
        />
      </div>
    </div>
  );
}
