"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Supplier = { id: string; name: string };
type Warehouse = { id: string; code: string };
type Variant = { id: string; sku: string; productName: string };

type PurchaseOrderCreateFormProps = {
  suppliers: Supplier[];
  warehouses: Warehouse[];
  variants: Variant[];
};

type LineState = { variantId: string; orderedQty: string; unitCost: string };

export function PurchaseOrderCreateForm({
  suppliers,
  warehouses,
  variants,
}: PurchaseOrderCreateFormProps) {
  const router = useRouter();
  const [lines, setLines] = useState<LineState[]>([
    { variantId: "", orderedQty: "", unitCost: "" },
  ]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    setLines((prev) => [...prev, { variantId: "", orderedQty: "", unitCost: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineState, value: string) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const parsedLines = lines.map((line) => ({
      variantId: line.variantId,
      orderedQty: Number(line.orderedQty),
      unitCost: Number(line.unitCost),
    }));

    const rawExpectedAt = fd.get("expectedAt");
    const payload = {
      supplierId: fd.get("supplierId"),
      destinationWarehouseId: fd.get("destinationWarehouseId"),
      expectedAt: rawExpectedAt ? new Date(rawExpectedAt as string).toISOString() : undefined,
      lines: parsedLines,
    };

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to create purchase order.");
        return;
      }

      router.push("/admin/purchase-orders");
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

      <label className="block text-sm" htmlFor="supplierId">
        <span className="font-medium text-slate-700">Supplier</span>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">— Select supplier —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="destinationWarehouseId">
        <span className="font-medium text-slate-700">Destination warehouse</span>
        <select
          id="destinationWarehouseId"
          name="destinationWarehouseId"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">— Select warehouse —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="expectedAt">
        <span className="font-medium text-slate-700">Expected delivery (optional)</span>
        <input
          id="expectedAt"
          name="expectedAt"
          type="datetime-local"
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Line items</p>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={line.variantId}
                onChange={(e) => updateLine(i, "variantId", e.target.value)}
                required
                className="min-h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              >
                <option value="">— SKU —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} — {v.productName}
                  </option>
                ))}
              </select>
              <input
                value={line.orderedQty}
                onChange={(e) => updateLine(i, "orderedQty", e.target.value)}
                type="number"
                min="0.001"
                step="any"
                required
                placeholder="Qty"
                className="min-h-9 w-24 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              />
              <input
                value={line.unitCost}
                onChange={(e) => updateLine(i, "unitCost", e.target.value)}
                type="number"
                min="0"
                step="any"
                required
                placeholder="Unit cost"
                className="min-h-9 w-28 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <Plus className="h-4 w-4" />
          Add line
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create purchase order"}
        </button>
        <Link
          href="/admin/purchase-orders"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
