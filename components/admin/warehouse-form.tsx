"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { WarehouseState } from "@/src/features/inventory/warehouse-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type WarehouseFormProps = {
  action: (prev: WarehouseState, formData: FormData) => Promise<WarehouseState>;
  initialValues?: { id: string; code: string; name: string; address: string; isActive: boolean };
};

export function WarehouseForm({ action, initialValues }: WarehouseFormProps) {
  const [state, formAction, isPending] = useActionState<WarehouseState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="code">
        <span className="font-medium text-slate-700">Code</span>
        <span className="ml-1 text-xs text-slate-400">(uppercase, e.g. WH-HN-01)</span>
        <input
          id="code"
          name="code"
          required
          defaultValue={initialValues?.code}
          className={INPUT_CLASS}
          style={{ textTransform: "uppercase" }}
        />
      </label>

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Name</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="address">
        <span className="font-medium text-slate-700">Address</span>
        <input id="address" name="address" defaultValue={initialValues?.address} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save" : "Create warehouse"}
        </button>
        <Link
          href="/admin/warehouses"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
