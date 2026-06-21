"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsNavItemState } from "@/src/features/cms/admin-actions";

type InitialValues = {
  id: string;
  placement: string;
  label: string;
  href: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsNavItemFormProps = {
  action: (prev: CmsNavItemState, formData: FormData) => Promise<CmsNavItemState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const PLACEMENTS = ["header", "sidebar", "mobile_dock", "footer"] as const;

export function CmsNavItemForm({ action, initialValues }: CmsNavItemFormProps) {
  const [state, formAction, isPending] = useActionState<CmsNavItemState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="placement">
        <span className="font-medium text-slate-700">Placement</span>
        <select
          id="placement"
          name="placement"
          required
          defaultValue={initialValues?.placement ?? "header"}
          className={INPUT_CLASS}
        >
          {PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="label">
        <span className="font-medium text-slate-700">Label</span>
        <input
          id="label"
          name="label"
          required
          defaultValue={initialValues?.label}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">Href</span>
        <input
          id="href"
          name="href"
          required
          defaultValue={initialValues?.href}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="iconKey">
        <span className="font-medium text-slate-700">Icon key (optional)</span>
        <input
          id="iconKey"
          name="iconKey"
          defaultValue={initialValues?.iconKey}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create item"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
