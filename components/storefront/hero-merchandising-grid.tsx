import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsBanner, CmsSection } from "@/src/features/cms/types";
import {
  isTextPlaceholderImage,
  StorefrontPlaceholderImage,
} from "./storefront-placeholder-image";
import { storefrontTheme } from "./storefront-theme";

type HeroMerchandisingGridProps = {
  section: CmsSection;
};

type BannerLinkProps = {
  banner: CmsBanner;
  className: string;
  children: ReactNode;
};

function BannerLink({ banner, className, children }: BannerLinkProps) {
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

function BannerImage({
  banner,
  priority = false,
}: {
  banner: CmsBanner;
  priority?: boolean;
}) {
  if (isTextPlaceholderImage(banner.imageUrl)) {
    return (
      <StorefrontPlaceholderImage
        label={banner.title}
        variant={priority ? "hero" : "banner"}
        positionClassName="absolute"
        className="inset-0"
      />
    );
  }

  return (
    <Image
      src={banner.imageUrl}
      alt={banner.title}
      fill
      priority={priority}
      sizes={
        priority
          ? "(min-width: 1024px) 720px, 100vw"
          : "(min-width: 1024px) 360px, 100vw"
      }
      className="object-cover transition duration-300 group-hover:scale-[1.03]"
      unoptimized
    />
  );
}

function CompactBanner({ banner }: { banner: CmsBanner }) {
  return (
    <BannerLink
      banner={banner}
      className="group relative min-h-[132px] overflow-hidden rounded-lg bg-[#0f3f46] text-white md:min-h-[134px]"
    >
      <BannerImage banner={banner} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f3f46]/80 via-[#0f766e]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 md:text-base">
          {banner.title}
        </h3>
        {banner.subtitle ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-100">
            {banner.subtitle}
          </p>
        ) : null}
      </div>
    </BannerLink>
  );
}

export function HeroMerchandisingGrid({ section }: HeroMerchandisingGridProps) {
  const [featuredBanner, ...compactBanners] = section.banners;
  const headingId = `home-section-${section.id}`;

  return (
    <section
      aria-labelledby={section.title ? headingId : undefined}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          {section.title ? (
            <h1
              id={headingId}
              className="text-lg font-extrabold text-slate-950 md:text-xl"
            >
              {section.title}
            </h1>
          ) : null}
          {section.subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
      </div>

      {featuredBanner ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <BannerLink
            banner={featuredBanner}
            className="group relative min-h-[190px] overflow-hidden rounded-lg bg-[#0f3f46] text-white md:min-h-[282px]"
          >
            <BannerImage banner={featuredBanner} priority />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f3f46]/85 via-[#0f766e]/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 max-w-xl p-5 md:p-7">
              <h2 className="max-w-md text-2xl font-extrabold leading-tight md:text-4xl">
                {featuredBanner.title}
              </h2>
              {featuredBanner.subtitle ? (
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-100 md:text-base">
                  {featuredBanner.subtitle}
                </p>
              ) : null}
              {featuredBanner.ctaLabel ? (
                <span className="mt-5 inline-flex min-h-10 items-center rounded-md bg-orange-700 px-4 text-sm font-bold text-white shadow-sm">
                  {featuredBanner.ctaLabel}
                </span>
              ) : null}
            </div>
          </BannerLink>

          {compactBanners.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {compactBanners.slice(0, 2).map((banner) => (
                <CompactBanner key={banner.id} banner={banner} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {compactBanners.length > 2 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {compactBanners.slice(2, 4).map((banner) => (
            <CompactBanner key={banner.id} banner={banner} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
