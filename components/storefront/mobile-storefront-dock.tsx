import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsNavigationItem } from "@/src/features/cms/types";
import { NavigationItemIcon } from "./category-nav";

type MobileStorefrontDockProps = {
  items: CmsNavigationItem[];
};

type DockLinkProps = {
  item: CmsNavigationItem;
  children: ReactNode;
};

export const CONTACT_URLS = {
  messenger: "https://www.facebook.com/haisannq/?locale=vi_VN",
  zalo: "https://zalo.me/0867997200",
  phone: "tel:0867997200",
} as const;

// Maps placeholder/anchor hrefs that CMS may store to canonical contact URLs.
const CONTACT_HREF_MAP: Record<string, string> = {
  "#messenger": CONTACT_URLS.messenger,
  "#zalo": CONTACT_URLS.zalo,
  "tel:19000098": CONTACT_URLS.phone,
};

export function normalizeContactHref(href: string): string {
  return CONTACT_HREF_MAP[href] ?? href;
}

const fallbackMobileDockItems: CmsNavigationItem[] = [
  {
    id: "fallback-dock-category",
    placement: "mobile_dock",
    label: "Danh mục",
    href: "/search",
    iconKey: "menu",
    sortOrder: 10,
  },
  {
    id: "fallback-dock-hours",
    placement: "mobile_dock",
    label: "8h - 21h",
    href: CONTACT_URLS.phone,
    iconKey: "phone",
    sortOrder: 20,
  },
  {
    id: "fallback-dock-messenger",
    placement: "mobile_dock",
    label: "Messenger",
    href: CONTACT_URLS.messenger,
    iconKey: "messenger",
    sortOrder: 30,
  },
  {
    id: "fallback-dock-zalo",
    placement: "mobile_dock",
    label: "Zalo",
    href: CONTACT_URLS.zalo,
    iconKey: "zalo",
    sortOrder: 40,
  },
  {
    id: "fallback-dock-account",
    placement: "mobile_dock",
    label: "Tài khoản",
    href: "/account/orders",
    iconKey: "user",
    sortOrder: 50,
  },
];

function getDockItems(items: CmsNavigationItem[]): CmsNavigationItem[] {
  const source = items.length > 0 ? items : fallbackMobileDockItems;
  return source.map((item) => ({ ...item, href: normalizeContactHref(item.href) }));
}

function DockLink({ item, children }: DockLinkProps) {
  const className =
    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-700";

  if (item.href.startsWith("/")) {
    return (
      <Link href={item.href} className={className}>
        {children}
      </Link>
    );
  }

  const isExternal =
    item.href.startsWith("https://") || item.href.startsWith("http://");

  return (
    <a
      href={item.href}
      className={className}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function MobileStorefrontDock({ items }: MobileStorefrontDockProps) {
  const visibleItems = getDockItems(items);

  return (
    <nav
      aria-label="Lối tắt cửa hàng trên di động"
      className="fixed inset-x-0 bottom-0 z-50 grid auto-cols-fr grid-flow-col border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
    >
      {visibleItems.map((item) => (
        <DockLink key={item.id} item={item}>
          <NavigationItemIcon
            iconKey={item.iconKey}
            className="h-5 w-5 text-teal-700"
          />
          <span>{item.label}</span>
        </DockLink>
      ))}
    </nav>
  );
}
