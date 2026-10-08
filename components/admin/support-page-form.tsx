"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SupportPageBody } from "@/components/storefront/support-page-body";
import type { SupportPageState } from "@/src/features/cms/support-page-actions";
import { slugifyVietnamese, supportPageHref } from "@/src/features/cms/support-pages";
import type { CmsSupportPage } from "@/src/features/cms/types";

type SupportPageFormProps = {
  action: (prev: SupportPageState, formData: FormData) => Promise<SupportPageState>;
  initialValues?: CmsSupportPage;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const BODY_HELP = [
  "## Tiêu đề nhỏ",
  "- Gạch đầu dòng",
  "1. Bước đánh số",
  "**chữ đậm**",
  "Dòng trống = đoạn mới",
];

export function SupportPageForm({ action, initialValues }: SupportPageFormProps) {
  const [state, formAction, isPending] = useActionState<SupportPageState, FormData>(action, null);
  const isEdit = Boolean(initialValues);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  // New pages derive the address from the title until it is edited by hand.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [body, setBody] = useState(initialValues?.body ?? "");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

        {state?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <label className="block text-sm" htmlFor="title">
          <span className="font-medium text-slate-700">Tiêu đề</span>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugifyVietnamese(event.target.value));
            }}
            placeholder="VD: Chính sách giao hàng"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-sm" htmlFor="slug">
          <span className="font-medium text-slate-700">Đường dẫn</span>
          <span className="ml-1 text-xs text-slate-400">
            haisannhaque.com{supportPageHref(slug || "…")}
          </span>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-sm" htmlFor="body">
          <span className="font-medium text-slate-700">Nội dung</span>
          <textarea
            id="body"
            name="body"
            rows={16}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {BODY_HELP.map((hint) => (
              <code key={hint} className="rounded bg-slate-100 px-1">
                {hint}
              </code>
            ))}
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm" htmlFor="sortOrder">
            <span className="font-medium text-slate-700">Thứ tự ở chân trang</span>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={initialValues?.sortOrder ?? 0}
              className={INPUT_CLASS}
            />
          </label>

          <label className="block text-sm" htmlFor="isPublished">
            <span className="font-medium text-slate-700">Trạng thái</span>
            <select
              id="isPublished"
              name="isPublished"
              defaultValue={initialValues ? String(initialValues.isPublished) : "true"}
              className={INPUT_CLASS}
            >
              <option value="true">Hiển thị (có link ở chân trang)</option>
              <option value="false">Ẩn (bản nháp)</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo trang"}
          </button>
          <Link
            href="/admin/support-pages"
            className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Xem trước</p>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h1 className="mb-4 text-2xl font-bold text-slate-950">{title || "Tiêu đề trang"}</h1>
          <SupportPageBody body={body} />
        </article>
      </div>
    </form>
  );
}
