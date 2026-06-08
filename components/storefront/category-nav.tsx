import Link from "next/link";
import {
  BadgePercent,
  Circle,
  Fish,
  Menu,
  MessageCircle,
  Phone,
  Send,
  Shell,
  Ship,
  Snowflake,
  Star,
  UserRound,
  Utensils,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CmsNavigationItem } from "@/src/features/cms/types";

type CategoryNavProps = {
  items: CmsNavigationItem[];
};

type NavigationItemIconProps = {
  iconKey: string | null;
  className?: string;
};

const navigationIcons: Record<string, LucideIcon> = {
  "badge-percent": BadgePercent,
  fish: Fish,
  menu: Menu,
  "message-circle": MessageCircle,
  phone: Phone,
  send: Send,
  shell: Shell,
  ship: Ship,
  snowflake: Snowflake,
  star: Star,
  user: UserRound,
  utensils: Utensils,
  waves: Waves,
};

export const fallbackCategoryItems: CmsNavigationItem[] = [
  {
    id: "fallback-best-sellers",
    placement: "header",
    label: "Bán chạy",
    href: "/categories/best-sellers",
    iconKey: "star",
    sortOrder: 10,
  },
  {
    id: "fallback-promotions",
    placement: "header",
    label: "Khuyến mãi",
    href: "/categories/promotions",
    iconKey: "badge-percent",
    sortOrder: 20,
  },
  {
    id: "fallback-fresh-seafood",
    placement: "header",
    label: "Hải sản tươi",
    href: "/categories/fresh-seafood",
    iconKey: "waves",
    sortOrder: 30,
  },
  {
    id: "fallback-ready-to-eat",
    placement: "header",
    label: "Món chế biến sẵn",
    href: "/categories/ready-to-eat",
    iconKey: "utensils",
    sortOrder: 40,
  },
];

export function getNavigationItems(
  items: CmsNavigationItem[],
): CmsNavigationItem[] {
  return items.length > 0 ? items : fallbackCategoryItems;
}

export function NavigationItemIcon({
  iconKey,
  className = "h-4 w-4",
}: NavigationItemIconProps) {
  const Icon = iconKey ? navigationIcons[iconKey] ?? Circle : Circle;

  return (
    <Icon className={className} aria-hidden="true" strokeWidth={2} />
  );
}

export function CategoryNav({ items }: CategoryNavProps) {
  const visibleItems = getNavigationItems(items);

  return (
    <nav
      aria-label="Danh mục sản phẩm"
      className="hidden border-t border-teal-100 bg-[#0f766e] md:block"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <NavigationItemIcon iconKey={item.iconKey} className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
