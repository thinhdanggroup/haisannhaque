import { Plus } from "lucide-react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type CmsPageRow = {
  pageKey: string;
  title: string;
  status: string;
  updatedAt: string;
};

type CmsSectionRow = {
  pageKey: string;
  sectionKey: string;
  type: string;
  title: string;
  status: string;
};

type CmsBannerRow = {
  title: string;
  section: string;
  cta: string;
  status: string;
};

type CmsNavigationRow = {
  placement: string;
  label: string;
  href: string;
  status: string;
};

type CmsFooterLinkRow = {
  group: string;
  label: string;
  href: string;
  status: string;
};

type CmsBrandAssetRow = {
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
  page_key: string;
  section_key: string;
  section_type: string;
  title: string | null;
  is_active: boolean;
};

type CmsBannerRecord = {
  title: string;
  cta_label: string | null;
  is_active: boolean;
  cms_sections: { section_key: string } | Array<{ section_key: string }> | null;
};

type CmsNavigationRecord = {
  placement: string;
  label: string;
  href: string;
  is_active: boolean;
};

type CmsFooterLinkRecord = {
  group_label: string;
  label: string;
  href: string;
  is_active: boolean;
};

type CmsBrandAssetRecord = {
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
  if (status === "published") {
    return "success";
  }

  if (status === "draft") {
    return "warning";
  }

  if (status === "archived") {
    return "neutral";
  }

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
}: CmsTableSectionProps<T>) {
  return (
    <section className="min-w-0 space-y-2">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <AdminDataTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
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
      .select("page_key, section_key, section_type, title, is_active, sort_order")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_banners")
      .select("title, cta_label, is_active, sort_order, cms_sections(section_key)")
      .order("sort_order", { ascending: true })
      .limit(50),
    client
      .from("cms_navigation_items")
      .select("placement, label, href, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_footer_links")
      .select("group_label, label, href, is_active, sort_order")
      .order("group_label", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(80),
    client
      .from("cms_brand_assets")
      .select("asset_key, placement, alt_text, is_active, sort_order")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(50),
  ]);

  if (pagesResult.error) {
    throw pagesResult.error;
  }

  if (sectionsResult.error) {
    throw sectionsResult.error;
  }

  if (bannersResult.error) {
    throw bannersResult.error;
  }

  if (navigationResult.error) {
    throw navigationResult.error;
  }

  if (footerLinksResult.error) {
    throw footerLinksResult.error;
  }

  if (brandAssetsResult.error) {
    throw brandAssetsResult.error;
  }

  return {
    pages: ((pagesResult.data ?? []) as CmsPageRecord[]).map((page) => ({
      pageKey: page.page_key,
      title: page.title,
      status: page.status,
      updatedAt: formatDate(page.updated_at),
    })),
    sections: ((sectionsResult.data ?? []) as CmsSectionRecord[]).map((section) => ({
      pageKey: section.page_key,
      sectionKey: section.section_key,
      type: section.section_type,
      title: section.title ?? "",
      status: formatActiveStatus(section.is_active),
    })),
    banners: ((bannersResult.data ?? []) as CmsBannerRecord[]).map((banner) => {
      const section = firstRelation(banner.cms_sections);

      return {
        title: banner.title,
        section: section?.section_key ?? "",
        cta: banner.cta_label ?? "",
        status: formatActiveStatus(banner.is_active),
      };
    }),
    navigation: ((navigationResult.data ?? []) as CmsNavigationRecord[]).map((item) => ({
      placement: item.placement,
      label: item.label,
      href: item.href,
      status: formatActiveStatus(item.is_active),
    })),
    footerLinks: ((footerLinksResult.data ?? []) as CmsFooterLinkRecord[]).map((link) => ({
      group: link.group_label,
      label: link.label,
      href: link.href,
      status: formatActiveStatus(link.is_active),
    })),
    brandAssets: ((brandAssetsResult.data ?? []) as CmsBrandAssetRecord[]).map((asset) => ({
      assetKey: asset.asset_key,
      placement: asset.placement,
      altText: asset.alt_text,
      status: formatActiveStatus(asset.is_active),
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
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

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
        description="Review storefront CMS records, navigation, footer links, and brand assets."
        action={
          <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New page
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <CmsTableSection
          title="CMS pages"
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
        />
        <CmsTableSection
          title="CMS sections"
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
        />
        <CmsTableSection
          title="Banners"
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
        />
        <CmsTableSection
          title="Navigation"
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
        />
        <CmsTableSection
          title="Footer links"
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
        />
        <CmsTableSection
          title="Brand assets"
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
        />
      </div>
    </div>
  );
}
