"use client";

import Link from "next/link";

type CmsRowActionsProps = {
  editHref: string;
  deleteAction: () => Promise<void>;
  label: string;
};

export function CmsRowActions({ editHref, deleteAction, label }: CmsRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={editHref}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm(`Delete "${label}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </form>
    </div>
  );
}
