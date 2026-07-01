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
import { MessengerIcon, ZaloIcon } from "./brand-icons";

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
    label: "Hải sản tươi sống",
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
  if (iconKey === "zalo") return <ZaloIcon className={className} />;
  if (iconKey === "messenger") return <MessengerIcon className={className} />;

  const Icon = iconKey ? navigationIcons[iconKey] ?? Circle : Circle;

  return (
    <Icon className={className} aria-hidden="true" strokeWidth={2} />
  );
}
