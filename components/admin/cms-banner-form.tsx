"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsBannerState } from "@/src/features/cms/admin-actions";

type SectionOption = { id: string; sectionKey: string; pageKey: string };

type InitialValues = {
  id: string;
  sectionId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsBannerFormProps = {
  action: (prev: CmsBannerState, formData: FormData) => Promise<CmsBannerState>;
  sections: SectionOption[];
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsBannerForm({ action, sections, initialValues }: CmsBannerFormProps) {
  const [state, formAction, isPending] = useActionState<CmsBannerState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="sectionId">
        <span className="font-medium text-slate-700">Section</span>
        <select
          id="sectionId"
          name="sectionId"
          required
          defaultValue={initialValues?.sectionId ?? ""}
          className={INPUT_CLASS}
        >
          <option value="">Select a section…</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.pageKey} / {s.sectionKey}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Title</span>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="subtitle">
        <span className="font-medium text-slate-700">Subtitle (optional)</span>
        <input
          id="subtitle"
          name="subtitle"
          defaultValue={initialValues?.subtitle}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="imageUrl">
        <span className="font-medium text-slate-700">Image URL</span>
        <input
          id="imageUrl"
          name="imageUrl"
          required
          type="url"
          defaultValue={initialValues?.imageUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="mobileImageUrl">
        <span className="font-medium text-slate-700">Mobile image URL (optional)</span>
        <input
          id="mobileImageUrl"
          name="mobileImageUrl"
          type="url"
          defaultValue={initialValues?.mobileImageUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="ctaLabel">
        <span className="font-medium text-slate-700">CTA label (optional)</span>
        <input
          id="ctaLabel"
          name="ctaLabel"
          defaultValue={initialValues?.ctaLabel}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="ctaHref">
        <span className="font-medium text-slate-700">CTA href (optional)</span>
        <input
          id="ctaHref"
          name="ctaHref"
          defaultValue={initialValues?.ctaHref}
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
          {isPending ? "Saving…" : isEdit ? "Save" : "Create banner"}
        </button>
        <Link
          href="/admin/content/banners"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
