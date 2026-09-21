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

/**
 * Icon keys an admin may pick for a category. Kept here, beside the renderer,
 * so validation can never accept a key that has nothing to draw.
 */
export const navigationIconKeys: readonly string[] = [
  ...Object.keys(navigationIcons),
  "zalo",
  "messenger",
].sort();

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
