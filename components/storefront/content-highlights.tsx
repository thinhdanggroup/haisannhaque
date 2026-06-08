import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsBanner, CmsSection } from "@/src/features/cms/types";
import {
  isTextPlaceholderImage,
  StorefrontPlaceholderImage,
} from "./storefront-placeholder-image";
import { storefrontTheme } from "./storefront-theme";

type ContentHighlightsProps = {
  section: CmsSection;
};

type ContentHighlight = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  href: string | null;
  label: string | null;
};

function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
}

function normalizeHighlight(value: unknown, index: number): ContentHighlight | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const description =
    typeof candidate.description === "string" && candidate.description.trim().length > 0
      ? candidate.description.trim()
      : null;
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
  const label =
    typeof candidate.label === "string" && candidate.label.trim().length > 0
      ? candidate.label.trim()
      : typeof candidate.groupLabel === "string" &&
          candidate.groupLabel.trim().length > 0
        ? candidate.groupLabel.trim()
        : null;

  if (title.length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : `highlight-${index}`,
    title,
    description,
    imageUrl,
    href,
    label,
  };
}

function bannerToHighlight(banner: CmsBanner): ContentHighlight {
  const ctaHref = banner.ctaHref?.trim() ?? "";

  return {
    id: banner.id,
    title: banner.title,
    description: banner.subtitle,
    imageUrl: banner.imageUrl,
    href: ctaHref.length > 0 && isSafeHref(ctaHref) ? ctaHref : null,
    label: banner.ctaLabel,
  };
}

function getHighlights(section: CmsSection): ContentHighlight[] {
  const candidates = section.metadata.items ?? section.metadata.cards;

  if (Array.isArray(candidates)) {
    const highlights = candidates
      .map(normalizeHighlight)
      .filter((item): item is ContentHighlight => item !== null);

    if (highlights.length > 0) {
      return highlights;
    }
  }

  return section.banners.map(bannerToHighlight);
}

function HighlightLink({
  highlight,
  className,
  children,
}: {
  highlight: ContentHighlight;
  className: string;
  children: ReactNode;
}) {
  if (highlight.href?.startsWith("/")) {
    return (
      <Link href={highlight.href} className={className}>
        {children}
      </Link>
    );
  }

  if (highlight.href?.startsWith("#")) {
    return (
      <a href={highlight.href} className={className}>
        {children}
      </a>
    );
  }

  return <article className={className}>{children}</article>;
}

function LeadHighlight({ highlight }: { highlight: ContentHighlight }) {
  return (
    <HighlightLink
      highlight={highlight}
      className="group grid overflow-hidden rounded-lg border border-teal-100 bg-white md:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]"
    >
      <div className="relative min-h-52 bg-[#eff8f6] md:min-h-64">
        {isTextPlaceholderImage(highlight.imageUrl) ? (
          <StorefrontPlaceholderImage
            label={highlight.title}
            variant="content"
          />
        ) : highlight.imageUrl ? (
          <Image
            src={highlight.imageUrl}
            alt={highlight.title}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex flex-col justify-center p-4">
        {highlight.label ? (
          <span className="mb-2 text-xs font-bold uppercase text-teal-700">
            {highlight.label}
          </span>
        ) : null}
        <h3 className="text-lg font-bold leading-tight text-slate-950 md:text-xl">
          {highlight.title}
        </h3>
        {highlight.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {highlight.description}
          </p>
        ) : null}
      </div>
    </HighlightLink>
  );
}

function CompactHighlight({ highlight }: { highlight: ContentHighlight }) {
  return (
    <HighlightLink
      highlight={highlight}
      className="group grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-slate-100 bg-white py-2.5 last:border-b-0"
    >
      <div className="relative h-16 overflow-hidden rounded-md bg-[#eff8f6]">
        {isTextPlaceholderImage(highlight.imageUrl) ? (
          <StorefrontPlaceholderImage
            label={highlight.title}
            variant="content"
          />
        ) : highlight.imageUrl ? (
          <Image
            src={highlight.imageUrl}
            alt={highlight.title}
            fill
            sizes="96px"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0">
        {highlight.label ? (
          <div className="text-[11px] font-bold uppercase text-orange-600">
            {highlight.label}
          </div>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950">
          {highlight.title}
        </h3>
        {highlight.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
            {highlight.description}
          </p>
        ) : null}
      </div>
    </HighlightLink>
  );
}

export function ContentHighlights({ section }: ContentHighlightsProps) {
  const highlights = getHighlights(section);
  const [leadHighlight, ...compactHighlights] = highlights;
  const headingId = `home-section-${section.id}`;

  if (!leadHighlight) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 id={headingId} className={storefrontTheme.sectionTitle}>
            {section.title ?? "Thông tin hữu ích"}
          </h2>
          {section.subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <LeadHighlight highlight={leadHighlight} />
        <div className="rounded-lg border border-teal-100 bg-white px-3">
          {compactHighlights.slice(0, 6).map((highlight) => (
            <CompactHighlight key={highlight.id} highlight={highlight} />
          ))}
        </div>
      </div>
    </section>
  );
}
