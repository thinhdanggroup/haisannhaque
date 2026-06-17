import Image from "next/image";
import Link from "next/link";
import type { CmsBanner, CmsSection } from "@/src/features/cms/types";
import { isTextPlaceholderImage } from "./storefront-placeholder-image";
import { storefrontTheme } from "./storefront-theme";

type PartnerStripProps = {
  section: CmsSection;
};

type PartnerAsset = {
  id: string;
  group: string;
  label: string;
  imageUrl: string | null;
  href: string | null;
};

function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
}

function normalizeAsset(value: unknown, index: number): PartnerAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const group =
    typeof candidate.group === "string" && candidate.group.trim().length > 0
      ? candidate.group.trim()
      : "Đối tác";
  const imageUrl =
    typeof candidate.imageUrl === "string" && candidate.imageUrl.trim().length > 0
      ? candidate.imageUrl.trim()
      : null;
  const href =
    typeof candidate.href === "string" &&
    candidate.href.trim().length > 0 &&
    isSafeHref(candidate.href.trim())
      ? candidate.href.trim()
      : null;

  if (label.length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : `partner-${index}`,
    group,
    label,
    imageUrl,
    href,
  };
}

function normalizeGroupedAssets(value: unknown): PartnerAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((groupValue, groupIndex) => {
    if (!groupValue || typeof groupValue !== "object" || Array.isArray(groupValue)) {
      return [];
    }

    const groupCandidate = groupValue as Record<string, unknown>;
    const groupLabel =
      typeof groupCandidate.label === "string" && groupCandidate.label.trim().length > 0
        ? groupCandidate.label.trim()
        : `Nhóm ${groupIndex + 1}`;
    const items = groupCandidate.items;

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, itemIndex) => normalizeAsset(item, itemIndex))
      .filter((asset): asset is PartnerAsset => asset !== null)
      .map((asset, itemIndex) => ({
        ...asset,
        id: `${asset.id}-${groupIndex}-${itemIndex}`,
        group: groupLabel,
      }));
  });
}

function bannerToAsset(banner: CmsBanner): PartnerAsset {
  const ctaHref = banner.ctaHref?.trim() ?? "";

  return {
    id: banner.id,
    group: banner.subtitle ?? "Đối tác",
    label: banner.title,
    imageUrl: banner.imageUrl,
    href: ctaHref.length > 0 && isSafeHref(ctaHref) ? ctaHref : null,
  };
}

function getAssets(section: CmsSection): PartnerAsset[] {
  const groupedAssets = normalizeGroupedAssets(section.metadata.groups);

  if (groupedAssets.length > 0) {
    return groupedAssets;
  }

  const candidates = section.metadata.assets ?? section.metadata.items;

  if (Array.isArray(candidates)) {
    const assets = candidates
      .map(normalizeAsset)
      .filter((asset): asset is PartnerAsset => asset !== null);

    if (assets.length > 0) {
      return assets;
    }
  }

  return section.banners.map(bannerToAsset);
}

function groupAssets(assets: PartnerAsset[]): Array<[string, PartnerAsset[]]> {
  const grouped = new Map<string, PartnerAsset[]>();

  assets.forEach((asset) => {
    grouped.set(asset.group, [...(grouped.get(asset.group) ?? []), asset]);
  });

  return Array.from(grouped.entries());
}

function AssetTile({ asset }: { asset: PartnerAsset }) {
  const content = (
    <span className="flex min-h-12 min-w-24 items-center justify-center rounded-md border border-teal-100 bg-[#f7fbfa] px-3 text-center text-xs font-bold text-slate-600 transition hover:border-teal-300 hover:bg-white hover:text-teal-700">
      {asset.imageUrl && !isTextPlaceholderImage(asset.imageUrl) ? (
        <Image
          src={asset.imageUrl}
          alt={asset.label}
          width={120}
          height={48}
          className="max-h-8 w-auto object-contain"
          unoptimized
        />
      ) : (
        asset.label
      )}
    </span>
  );

  if (asset.href?.startsWith("/")) {
    return <Link href={asset.href}>{content}</Link>;
  }

  if (asset.href?.startsWith("#")) {
    return <a href={asset.href}>{content}</a>;
  }

  return content;
}

export function PartnerStrip({ section }: PartnerStripProps) {
  const assets = getAssets(section);
  const groupedAssets = groupAssets(assets);
  const headingId = `home-section-${section.id}`;

  if (groupedAssets.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-4">
        <h2 id={headingId} className={storefrontTheme.sectionTitle}>
          {section.title ?? "Đối tác Hải Sản Nhà Quê"}
        </h2>
        {section.subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groupedAssets.map(([group, groupItems]) => (
          <div key={group}>
            <h3 className="mb-2 text-xs font-bold uppercase text-teal-700">
              {group}
            </h3>
            <div className="flex flex-wrap gap-2">
              {groupItems.map((asset) => (
                <AssetTile key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
