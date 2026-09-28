"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

type SwitcherTab = {
  key: string;
  label: string;
  href: string | null;
};

type RecommendationTabSwitcherProps = {
  tabs: SwitcherTab[];
  panels: ReactNode[];
};

const ACTIVE_CLASS =
  "inline-flex min-h-8 shrink-0 items-center rounded-full bg-[#0f766e] px-3 text-xs font-bold text-white shadow-sm";
const INACTIVE_CLASS =
  "inline-flex min-h-8 shrink-0 items-center rounded-full border border-teal-100 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700";

export function RecommendationTabSwitcher({ tabs, panels }: RecommendationTabSwitcherProps) {
  const baseId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Nhóm gợi ý">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const className = isActive ? ACTIVE_CLASS : INACTIVE_CLASS;

          if (tab.href) {
            return (
              <Link key={tab.key} href={tab.href} className={className}>
                {tab.label}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${index}`}
              onClick={() => setActiveIndex(index)}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {panels.map((panel, index) => (
        <div
          key={tabs[index]?.key ?? index}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={index !== activeIndex}
        >
          {panel}
        </div>
      ))}
    </>
  );
}
