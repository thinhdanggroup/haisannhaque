"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CategoryState } from "@/src/features/catalog/category-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type ParentOption = { id: string; name: string };

type CategoryFormProps = {
  action: (prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  parentOptions: ParentOption[];
  initialValues?: {
    id: string;
    slug?: string;
    name: string;
    description: string;
    imageUrl: string;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
  };
};

export function CategoryForm({ action, parentOptions, initialValues }: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState<CategoryState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Name</span>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialValues?.name}
          className={INPUT_CLASS}
        />
      </label>

      {!isEdit && (
        <label className="block text-sm" htmlFor="slug">
          <span className="font-medium text-slate-700">Slug</span>
          <span className="ml-1 text-xs text-slate-400">(lowercase, hyphens only)</span>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={initialValues?.slug}
            className={INPUT_CLASS}
          />
        </label>
      )}

      <label className="block text-sm" htmlFor="parentId">
        <span className="font-medium text-slate-700">Parent category</span>
        <select
          id="parentId"
          name="parentId"
          defaultValue={initialValues?.parentId ?? ""}
          className={INPUT_CLASS}
        >
          <option value="">— None (top level) —</option>
          {parentOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="description">
        <span className="font-medium text-slate-700">Description</span>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialValues?.description}
          className={`${INPUT_CLASS} py-2`}
        />
      </label>

      <label className="block text-sm" htmlFor="imageUrl">
        <span className="font-medium text-slate-700">Image URL</span>
        <input
          id="imageUrl"
          name="imageUrl"
          defaultValue={initialValues?.imageUrl}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create category"}
        </button>
        <Link
          href="/admin/categories"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
