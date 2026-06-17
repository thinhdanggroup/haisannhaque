"use client";

import { useActionState } from "react";
import { useState } from "react";
import {
  adjustInventoryBySku,
  type InventoryAdjustState,
} from "@/src/features/inventory/admin-actions";

type InventoryAdjustmentFormProps = {
  sku: string;
  warehouseCode: string;
};

export function InventoryAdjustmentForm({ sku, warehouseCode }: InventoryAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState<InventoryAdjustState, FormData>(
    adjustInventoryBySku,
    null,
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Adjust
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        action(fd);
        if (!state || "success" in state) setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="warehouseCode" value={warehouseCode} />

      {state && "error" in state && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <label className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-medium text-slate-700">Δ Qty</span>
        <input
          name="quantityDelta"
          type="number"
          step="any"
          required
          placeholder="+10 or -5"
          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-medium text-slate-700">Reason</span>
        <select
          name="reasonCode"
          defaultValue="count"
          className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-600"
        >
          <option value="count">Count</option>
          <option value="damage">Damage</option>
          <option value="return">Return</option>
          <option value="correction">Correction</option>
        </select>
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
