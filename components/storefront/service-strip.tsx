import {
  Award,
  PackagePlus,
  Star,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CmsSection } from "@/src/features/cms/types";
import { storefrontTheme } from "./storefront-theme";

type ServiceItem = {
  label: string;
  detail: string;
  iconKey: string;
};

type ServiceStripProps = {
  section: CmsSection;
};

const serviceIcons: Record<string, LucideIcon> = {
  award: Award,
  "package-plus": PackagePlus,
  star: Star,
  truck: Truck,
};

function isServiceItem(value: unknown): value is ServiceItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.label === "string" &&
    item.label.length > 0 &&
    typeof item.detail === "string" &&
    item.detail.length > 0 &&
    typeof item.iconKey === "string" &&
    item.iconKey.length > 0
  );
}

function getServiceItems(section: CmsSection): ServiceItem[] {
  const items = section.metadata.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(isServiceItem);
}

export function ServiceStrip({ section }: ServiceStripProps) {
  const serviceItems = getServiceItems(section);

  if (serviceItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Store services"
      className={`${storefrontTheme.section} grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-4`}
    >
      {serviceItems.map((item) => {
        const Icon = serviceIcons[item.iconKey] ?? Star;

        return (
          <div
            key={item.label}
            className="flex min-h-16 items-center gap-3 rounded-md bg-[#f5fbf9] px-3 py-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#0f766e] text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-950">
                {item.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {item.detail}
              </span>
            </span>
          </div>
        );
      })}
    </section>
  );
}
