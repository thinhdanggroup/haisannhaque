import type { ProductCard } from "@/src/features/catalog/types";

export type CmsNavigationPlacement = "header" | "sidebar" | "mobile_dock" | "footer";

export type CmsSectionType =
  | "hero"
  | "service_strip"
  | "category_shortcuts"
  | "product_rail"
  | "flash_sale"
  | "promo_band"
  | "recommendation_tabs"
  | "partner_strip"
  | "content_highlights"
  | "footer";

export type CmsBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
};

export type CmsProductCard = ProductCard & {
  badgeText: string | null;
  unitLabel: string | null;
  soldLabel: string;
};

export type CmsSection = {
  id: string;
  key: string;
  type: CmsSectionType;
  title: string | null;
  subtitle: string | null;
  layout: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
  banners: CmsBanner[];
  products: CmsProductCard[];
};

export type CmsNavigationItem = {
  id: string;
  placement: CmsNavigationPlacement;
  label: string;
  href: string;
  iconKey: string | null;
  sortOrder: number;
};

export type CmsFooterLink = {
  id: string;
  groupLabel: string;
  label: string;
  href: string;
  sortOrder: number;
};

export type CmsBrandAsset = {
  id: string;
  assetKey: string;
  placement: "partner" | "payment" | "trust" | "brand";
  imageUrl: string;
  altText: string;
  href: string | null;
  sortOrder: number;
};

export type StorefrontChrome = {
  headerNav: CmsNavigationItem[];
  sidebarNav: CmsNavigationItem[];
  mobileDock: CmsNavigationItem[];
  footerLinks: CmsFooterLink[];
  paymentAssets: CmsBrandAsset[];
  partnerAssets: CmsBrandAsset[];
  trustAssets: CmsBrandAsset[];
};

export type HomePageContent = {
  sections: CmsSection[];
};
