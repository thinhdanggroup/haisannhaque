"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReceiveLine = {
  lineId: string;
  sku: string;
  orderedQty: string;
  receivedQty: string;
  unit: string;
};

type ReceiveState = { [lineId: string]: { qty: string; lotNo: string; expiryAt: string } };

type PurchaseOrderReceiveFormProps = {
  purchaseOrderId: string;
  lines: ReceiveLine[];
};

export function PurchaseOrderReceiveForm({
  purchaseOrderId,
  lines,
}: PurchaseOrderReceiveFormProps) {
  const router = useRouter();
  const [state, setState] = useState<ReceiveState>(
    Object.fromEntries(
      lines.map((l) => [l.lineId, { qty: l.orderedQty, lotNo: "", expiryAt: "" }]),
    ),
  );
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      notes: notes || undefined,
      lines: lines
        .filter((l) => Number(state[l.lineId]?.qty) > 0)
        .map((l) => ({
          purchaseOrderLineId: l.lineId,
          receivedQty: Number(state[l.lineId]?.qty),
          lotNo: state[l.lineId]?.lotNo || undefined,
          expiryAt: state[l.lineId]?.expiryAt
            ? new Date(state[l.lineId]!.expiryAt).toISOString()
            : undefined,
        })),
    };

    if (payload.lines.length === 0) {
      setError("Nhập số lượng nhận cho ít nhất một dòng.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Ghi nhận thất bại.");
        return;
      }

      router.push(`/admin/purchase-orders/${purchaseOrderId}`);
      router.refresh();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-left">Đã đặt</th>
              <th className="px-4 py-2 text-left">SL nhận</th>
              <th className="px-4 py-2 text-left">Số lô</th>
              <th className="px-4 py-2 text-left">Hết hạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-2 font-medium text-slate-800">{line.sku}</td>
                <td className="px-4 py-2 text-slate-600">
                  {line.orderedQty} {line.unit}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={state[line.lineId]?.qty ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, qty: e.target.value },
                      }))
                    }
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="tuỳ chọn"
                    value={state[line.lineId]?.lotNo ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, lotNo: e.target.value },
                      }))
                    }
                    className="w-28 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={state[line.lineId]?.expiryAt ?? ""}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        [line.lineId]: { ...prev[line.lineId]!, expiryAt: e.target.value },
                      }))
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="block text-sm" htmlFor="notes">
        <span className="font-medium text-slate-700">Ghi chú (tuỳ chọn)</span>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Ghi nhận nhận hàng"}
        </button>
        <Link
          href={`/admin/purchase-orders/${purchaseOrderId}`}
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
