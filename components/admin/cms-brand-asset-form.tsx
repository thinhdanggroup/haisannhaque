"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { CmsBrandAssetState } from "@/src/features/cms/admin-actions";
import { CmsImageUrlField } from "./cms-image-url-field";

type InitialValues = {
  id: string;
  assetKey: string;
  placement: string;
  imageUrl: string;
  altText: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsBrandAssetFormProps = {
  action: (prev: CmsBrandAssetState, formData: FormData) => Promise<CmsBrandAssetState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const PLACEMENTS = [
  { value: "bank_account", label: "Tài khoản ngân hàng (ảnh QR chuyển khoản)" },
  { value: "order_app", label: "Đặt hàng qua app (logo Shopee, Grab…)" },
  { value: "payment", label: "Thanh toán (logo ở chân trang)" },
  { value: "partner", label: "Đối tác (chân trang)" },
  { value: "trust", label: "Cam kết (chân trang)" },
  { value: "brand", label: "Thương hiệu" },
] as const;

const PLACEMENT_HINTS: Record<string, { image: string; alt: string; href: string }> = {
  bank_account: {
    image: "Ảnh mã QR chuyển khoản",
    alt: "Thông tin tài khoản — VD: Techcombank - 1903 7253 7380 24 - NGUYEN VAN A",
    href: "Để trống",
  },
  order_app: {
    image: "Logo app (ShopeeFood, GrabFood…)",
    alt: "Tên hiển thị — VD: Đặt hàng qua ShopeeFood",
    href: "Link gian hàng trên app (https://…)",
  },
};

const DEFAULT_HINTS = { image: "Hình ảnh", alt: "Văn bản thay thế", href: "Đường dẫn (tuỳ chọn)" };

export function CmsBrandAssetForm({ action, initialValues }: CmsBrandAssetFormProps) {
  const [state, formAction, isPending] = useActionState<CmsBrandAssetState, FormData>(
    action,
    null,
  );
  const isEdit = Boolean(initialValues);
  const [placement, setPlacement] = useState(initialValues?.placement ?? "bank_account");
  const hints = PLACEMENT_HINTS[placement] ?? DEFAULT_HINTS;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="assetKey">
        <span className="font-medium text-slate-700">Khóa tài nguyên</span>
        <span className="ml-1 text-xs text-slate-400">(duy nhất trong vị trí)</span>
        <input
          id="assetKey"
          name="assetKey"
          required
          defaultValue={initialValues?.assetKey}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="placement">
        <span className="font-medium text-slate-700">Vị trí</span>
        <select
          id="placement"
          name="placement"
          required
          value={placement}
          onChange={(event) => setPlacement(event.target.value)}
          className={INPUT_CLASS}
        >
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <CmsImageUrlField
        name="imageUrl"
        label={hints.image}
        required
        defaultValue={initialValues?.imageUrl}
        inputClassName={INPUT_CLASS}
      />

      <label className="block text-sm" htmlFor="altText">
        <span className="font-medium text-slate-700">{hints.alt}</span>
        <input
          id="altText"
          name="altText"
          required
          defaultValue={initialValues?.altText}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">{hints.href}</span>
        <input
          id="href"
          name="href"
          defaultValue={initialValues?.href}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Thứ tự</span>
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
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Hoạt động</option>
          <option value="false">Không hoạt động</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo tài nguyên"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
