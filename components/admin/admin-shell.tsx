import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
          <div className="mb-4 px-3 text-lg font-semibold">Admin</div>
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">
              Branch context
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">HCM-01</p>
            <p className="text-xs text-slate-600">Primary warehouse</p>
          </div>
          <AdminNav />
        </aside>
        <main className="min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export type { AdminShellProps };
