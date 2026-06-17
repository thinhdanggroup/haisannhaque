"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderTransitionButtonProps = {
  orderId: string;
  nextStatus: string;
};

export function OrderTransitionButton({ orderId, nextStatus }: OrderTransitionButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(`Transition order to "${nextStatus}"?`)) return;
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Transition failed.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="inline-block">
      {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {isPending ? "…" : nextStatus.replace(/_/g, " ")}
      </button>
    </div>
  );
}
