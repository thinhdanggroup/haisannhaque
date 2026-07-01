"use client";

import { useEffect, useState } from "react";
import { formatCountdown, getRemainingSeconds } from "@/src/features/flash-sales/price-utils";

type FlashSaleCountdownProps = {
  endAt: string;
  label?: string;
  className?: string;
};

export function FlashSaleCountdown({ endAt, label, className = "text-red-600" }: FlashSaleCountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endAt, Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(getRemainingSeconds(endAt, Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [endAt, remaining]);

  if (remaining <= 0) {
    return (
      <span className="text-sm font-medium text-slate-500">Đã kết thúc</span>
    );
  }

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${className}`}>
      {label && (
        <span className="mr-1 font-sans font-medium text-slate-700">{label}</span>
      )}
      {formatCountdown(remaining)}
    </span>
  );
}
