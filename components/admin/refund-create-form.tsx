"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefundCreateForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const rawPaymentId = (fd.get("paymentId") as string).trim();
    const payload = {
      orderId: fd.get("orderId") as string,
      paymentId: rawPaymentId || undefined,
      amount: Number(fd.get("amount")),
      refundMethod: fd.get("refundMethod") as string,
      reason: fd.get("reason") as string,
    };

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to create refund.");
        return;
      }

      router.push("/admin/refunds");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="block text-sm" htmlFor="orderId">
        <span className="font-medium text-slate-700">Order ID (UUID)</span>
        <input
          id="orderId"
          name="orderId"
          type="text"
          required
          placeholder="UUID"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="paymentId">
        <span className="font-medium text-slate-700">Payment ID (optional)</span>
        <input
          id="paymentId"
          name="paymentId"
          type="text"
          placeholder="UUID"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="amount">
        <span className="font-medium text-slate-700">Amount (VND)</span>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          min="1"
          step="1"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="refundMethod">
        <span className="font-medium text-slate-700">Refund method</span>
        <select
          id="refundMethod"
          name="refundMethod"
          required
          defaultValue="bank_transfer"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="gateway">gateway</option>
          <option value="bank_transfer">bank_transfer</option>
          <option value="voucher">voucher</option>
          <option value="loyalty_points">loyalty_points</option>
          <option value="manual_finance">manual_finance</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="reason">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={3}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create refund"}
        </button>
        <a
          href="/admin/refunds"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
