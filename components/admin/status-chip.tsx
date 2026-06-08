type StatusChipTone = "neutral" | "info" | "success" | "warning" | "danger";

type StatusChipProps = {
  value: string;
  tone: StatusChipTone;
};

const toneClasses: Record<StatusChipTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

export function StatusChip({ value, tone }: StatusChipProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded border px-2 text-xs font-medium ${toneClasses[tone]}`}
    >
      {value}
    </span>
  );
}

export type { StatusChipProps, StatusChipTone };
