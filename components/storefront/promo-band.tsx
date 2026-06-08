import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsBanner, CmsSection } from "@/src/features/cms/types";
import {
  isTextPlaceholderImage,
  StorefrontPlaceholderImage,
} from "./storefront-placeholder-image";
import { storefrontTheme } from "./storefront-theme";

type PromoBandProps = {
  section: CmsSection;
};

type PromoLinkProps = {
  banner: CmsBanner;
  children: ReactNode;
};

function PromoLink({ banner, children }: PromoLinkProps) {
  const className =
    "group relative block min-h-40 overflow-hidden rounded-lg bg-[#0f3f46] text-white md:min-h-52";

  if (!banner.ctaHref) {
    return <div className={className}>{children}</div>;
  }

  if (banner.ctaHref.startsWith("/")) {
    return (
      <Link href={banner.ctaHref} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={banner.ctaHref} className={className}>
      {children}
    </a>
  );
}

export function PromoBand({ section }: PromoBandProps) {
  const banner = section.banners[0] ?? null;
  const headingId = `home-section-${section.id}`;

  if (!banner && !section.title) {
    return null;
  }

  return (
    <section
      aria-labelledby={section.title ? headingId : undefined}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        {section.title ? (
          <h2
            id={headingId}
            className={storefrontTheme.sectionTitle}
          >
            {section.title}
          </h2>
        ) : null}
        {section.subtitle ? (
          <p className="text-sm text-slate-600">{section.subtitle}</p>
        ) : null}
      </div>

      {banner ? (
        <PromoLink banner={banner}>
          {isTextPlaceholderImage(banner.imageUrl) ? (
            <StorefrontPlaceholderImage
              label={banner.title}
              variant="banner"
              positionClassName="absolute"
              className="inset-0 transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f3f46]/80 via-[#0f766e]/25 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center p-5 md:p-7">
            <div className="text-2xl font-extrabold leading-tight md:text-4xl">
              {banner.title}
            </div>
            {banner.subtitle ? (
              <p className="mt-2 text-sm leading-6 text-slate-100">
                {banner.subtitle}
              </p>
            ) : null}
            {banner.ctaLabel ? (
              <span className="mt-4 inline-flex min-h-10 w-fit items-center rounded-md bg-orange-700 px-4 text-sm font-bold text-white shadow-sm">
                {banner.ctaLabel}
              </span>
            ) : null}
          </div>
        </PromoLink>
      ) : null}
    </section>
  );
}
