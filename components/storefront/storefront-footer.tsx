import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  CmsBrandAsset,
  CmsFooterLink,
} from "@/src/features/cms/types";
import { isTextPlaceholderImage } from "./storefront-placeholder-image";
import { StoreLogo } from "./store-logo";

type StorefrontFooterProps = {
  footerLinks: CmsFooterLink[];
  paymentAssets: CmsBrandAsset[];
  partnerAssets: CmsBrandAsset[];
  trustAssets: CmsBrandAsset[];
};

type FooterGroup = {
  groupLabel: string;
  links: CmsFooterLink[];
};

type LinkedAssetProps = {
  asset: CmsBrandAsset;
  children: ReactNode;
};

const fallbackFooterLinks: CmsFooterLink[] = [
  {
    id: "fallback-information-stores",
    groupLabel: "Thông tin",
    label: "Hệ thống cửa hàng",
    href: "https://maps.app.goo.gl/dDcQBkY8U8aV6TBb9",
    sortOrder: 10,
  },
  {
    id: "fallback-information-loyalty",
    groupLabel: "Thông tin",
    label: "Khách hàng thân thiết",
    href: "/account/loyalty",
    sortOrder: 20,
  },
  {
    id: "fallback-policies-shipping",
    groupLabel: "Chính sách",
    label: "Chính sách giao hàng",
    href: "#shipping",
    sortOrder: 10,
  },
  {
    id: "fallback-policies-ordering",
    groupLabel: "Chính sách",
    label: "Hướng dẫn đặt hàng",
    href: "#ordering",
    sortOrder: 20,
  },
  {
    id: "fallback-products-shrimp",
    groupLabel: "Sản phẩm",
    label: "Tôm",
    href: "/search?q=shrimp",
    sortOrder: 10,
  },
  {
    id: "fallback-products-salmon",
    groupLabel: "Sản phẩm",
    label: "Cá hồi",
    href: "/search?q=salmon",
    sortOrder: 20,
  },
];

const requiredFooterGroups = ["Thông tin", "Chính sách", "Sản phẩm"];

const fallbackAssetLabels = {
  payment: ["COD", "MoMo", "VNPAY"],
  partner: ["Đối tác bán lẻ", "Đối tác giao hàng"],
  trust: ["Tươi mỗi ngày", "Giữ lạnh"],
};

function getFooterGroups(footerLinks: CmsFooterLink[]): FooterGroup[] {
  const sourceLinks = footerLinks.length > 0 ? footerLinks : fallbackFooterLinks;
  const linksByGroup = new Map<string, CmsFooterLink[]>();
  const groupOrder: string[] = [];

  sourceLinks.forEach((link) => {
    const groupLinks = linksByGroup.get(link.groupLabel) ?? [];
    groupLinks.push(link);
    linksByGroup.set(link.groupLabel, groupLinks);

    if (!groupOrder.includes(link.groupLabel)) {
      groupOrder.push(link.groupLabel);
    }
  });

  const orderedGroups =
    footerLinks.length > 0
      ? groupOrder
      : requiredFooterGroups;

  return orderedGroups.map((groupLabel) => ({
    groupLabel,
    links: linksByGroup.get(groupLabel) ?? [],
  }));
}

function LinkedAsset({ asset, children }: LinkedAssetProps) {
  if (!asset.href) {
    return children;
  }

  if (asset.href.startsWith("/")) {
    return <Link href={asset.href}>{children}</Link>;
  }

  return <a href={asset.href}>{children}</a>;
}

function AssetGroup({
  title,
  assets,
  fallbackLabels,
}: {
  title: string;
  assets: CmsBrandAsset[];
  fallbackLabels: string[];
}) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      {assets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {assets.map((asset) => (
            <LinkedAsset key={asset.id} asset={asset}>
              <span className="flex h-12 min-w-24 items-center justify-center rounded-md border border-teal-100 bg-white px-3 shadow-sm">
                {!isTextPlaceholderImage(asset.imageUrl) ? (
                  <Image
                    src={asset.imageUrl}
                    alt={asset.altText}
                    width={120}
                    height={48}
                    className="max-h-8 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-600">
                    {asset.altText}
                  </span>
                )}
              </span>
            </LinkedAsset>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {fallbackLabels.map((label) => (
            <span
              key={label}
              className="flex min-h-10 items-center rounded-md border border-teal-100 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function StorefrontFooter({
  footerLinks,
  paymentAssets,
  partnerAssets,
  trustAssets,
}: StorefrontFooterProps) {
  const footerGroups = getFooterGroups(footerLinks);

  return (
    <footer className="border-t border-teal-100 bg-[#f8fbfa] text-slate-950">
      <div id="company" className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <StoreLogo showSubtitle={false} />
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
              Hải Sản Nhà Quê vận hành gian hàng, thanh toán và quy trình
              bán hải sản theo nhịp thương mại Việt Nam.
            </p>
            <a
              href="tel:0867997200"
              className="mt-4 inline-flex min-h-10 items-center rounded-md bg-orange-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-800"
              aria-label="Hotline 0867 997 200"
            >
              Gọi hotline
            </a>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.groupLabel}>
                <h2 className="text-sm font-bold text-slate-950">
                  {group.groupLabel}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.id}>
                      {link.href.startsWith("http") ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-600 transition hover:text-teal-700"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-slate-600 transition hover:text-teal-700"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-8 md:grid-cols-3">
          <AssetGroup
            title="Thanh toán"
            assets={paymentAssets}
            fallbackLabels={fallbackAssetLabels.payment}
          />
          <AssetGroup
            title="Đối tác"
            assets={partnerAssets}
            fallbackLabels={fallbackAssetLabels.partner}
          />
          <AssetGroup
            title="Cam kết"
            assets={trustAssets}
            fallbackLabels={fallbackAssetLabels.trust}
          />
        </div>
      </div>

      <div id="stores" className="bg-[#0f3f46] pb-24 pt-8 text-white md:pb-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[220px_minmax(0,1fr)_180px] md:items-center">
          <StoreLogo variant="light" showSubtitle={false} />
          <div>
            <h2 className="text-sm font-bold uppercase text-orange-200">
              Thông tin công ty
            </h2>
            <p className="mt-2 text-sm leading-6 text-teal-50">
              CÔNG TY TNHH HẢI SẢN NHÀ QUÊ. MST: 0319442718. VP: SAV.2-00.04 Tầng trệt,
              Tháp 2, Toà Nhà The Sun Avenue, 28 Mai Chí Thọ, P.Bình Trưng, TP.HCM, Việt Nam.
              Hotline: 0867 997 200. Email: care@haisannhaque.vn.
            </p>
            <p className="mt-1 text-xs leading-5 text-teal-100">
              Nội dung, hình ảnh và dữ liệu demo trong dự án là tài sản minh họa
              phục vụ xây dựng hệ thống thương mại hải sản.
            </p>
          </div>
          <div className="w-fit rounded-md border border-teal-200 bg-white px-4 py-3 text-center text-xs font-bold uppercase text-teal-700">
            Đã thông báo
            <span className="block text-[10px] font-semibold text-slate-500">
              Bộ Công Thương
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
