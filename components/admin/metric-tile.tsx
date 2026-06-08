import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
};

export function MetricTile({ label, value, detail, icon }: MetricTileProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <div className="mt-2 text-2xl font-semibold leading-none text-slate-950">{value}</div>
        </div>
        {icon ? (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
            {icon}
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </section>
  );
}

export type { MetricTileProps };
