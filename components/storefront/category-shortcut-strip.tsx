import Link from "next/link";
import type { CmsSection } from "@/src/features/cms/types";
import { NavigationItemIcon } from "./category-nav";
import { storefrontTheme } from "./storefront-theme";

type CategoryShortcut = {
  label: string;
  href: string;
  iconKey: string | null;
};

type CategoryShortcutInput = {
  label: string;
  href: string;
  iconKey?: string | null;
};

type CategoryShortcutStripProps = {
  section: CmsSection;
};

function isShortcut(value: unknown): value is CategoryShortcutInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.label === "string" &&
    typeof candidate.href === "string" &&
    (candidate.iconKey === undefined ||
      candidate.iconKey === null ||
      typeof candidate.iconKey === "string")
  );
}

function isSafeShortcutHref(href: string): boolean {
  return href.startsWith("/categories/") || href.startsWith("/search");
}

function normalizeShortcut(value: unknown): CategoryShortcut | null {
  if (!isShortcut(value)) {
    return null;
  }

  const label = value.label.trim();
  const href = value.href.trim();

  if (label.length === 0 || href.length === 0 || !isSafeShortcutHref(href)) {
    return null;
  }

  return {
    label,
    href,
    iconKey: value.iconKey ?? null,
  };
}

function getShortcuts(section: CmsSection): CategoryShortcut[] {
  const items = section.metadata.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(normalizeShortcut)
    .filter((shortcut): shortcut is CategoryShortcut => shortcut !== null);
}

export function CategoryShortcutStrip({ section }: CategoryShortcutStripProps) {
  const shortcuts = getShortcuts(section);
  const headingId = `home-section-${section.id}`;

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          {section.title ? (
            <h2 id={headingId} className="text-sm font-extrabold uppercase text-slate-950">
              {section.title}
            </h2>
          ) : (
            <h2 id={headingId} className="sr-only">
              Danh mục hải sản phổ biến
            </h2>
          )}
          {section.subtitle ? (
            <p className="mt-1 text-xs text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
      </div>
      <nav
        aria-label="Danh mục hải sản phổ biến"
        className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-6"
      >
        {shortcuts.map((shortcut) => (
          <Link
            key={`${shortcut.href}-${shortcut.label}`}
            href={shortcut.href}
            className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-md border border-teal-100 bg-[#f5fbf9] px-2 text-center text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:bg-white hover:text-teal-700"
          >
            <NavigationItemIcon
              iconKey={shortcut.iconKey}
              className="h-5 w-5 text-teal-600"
            />
            <span className="line-clamp-2">{shortcut.label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
