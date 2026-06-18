"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateComplaintCase, type ComplaintUpdateState } from "@/src/features/complaints/admin-actions";

type ComplaintUpdateFormProps = {
  id: string;
  status: string;
  resolution: string;
};

export function ComplaintUpdateForm({ id, status, resolution }: ComplaintUpdateFormProps) {
  const [state, action, isPending] = useActionState<ComplaintUpdateState, FormData>(
    updateComplaintCase,
    null,
  );

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <input type="hidden" name="id" value={id} />

      {state && "error" in state && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Status</span>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="open">open</option>
          <option value="investigating">investigating</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="resolution">
        <span className="font-medium text-slate-700">Resolution</span>
        <textarea
          id="resolution"
          name="resolution"
          defaultValue={resolution}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/admin/complaints"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
