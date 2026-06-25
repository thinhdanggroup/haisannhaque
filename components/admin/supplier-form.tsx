"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { SupplierState } from "@/src/features/procurement/supplier-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type SupplierFormProps = {
  action: (prev: SupplierState, formData: FormData) => Promise<SupplierState>;
  initialValues?: {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    taxCode: string;
    isActive: boolean;
  };
};

export function SupplierForm({ action, initialValues }: SupplierFormProps) {
  const [state, formAction, isPending] = useActionState<SupplierState, FormData>(action, null);
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
        <span className="font-medium text-slate-700">Tên</span>
        <input id="name" name="name" required defaultValue={initialValues?.name} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="contactName">
        <span className="font-medium text-slate-700">Người liên hệ</span>
        <input id="contactName" name="contactName" defaultValue={initialValues?.contactName} className={INPUT_CLASS} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm" htmlFor="phone">
          <span className="font-medium text-slate-700">Điện thoại</span>
          <input id="phone" name="phone" defaultValue={initialValues?.phone} className={INPUT_CLASS} />
        </label>
        <label className="block text-sm" htmlFor="email">
          <span className="font-medium text-slate-700">Email</span>
          <input id="email" name="email" type="email" defaultValue={initialValues?.email} className={INPUT_CLASS} />
        </label>
      </div>

      <label className="block text-sm" htmlFor="address">
        <span className="font-medium text-slate-700">Địa chỉ</span>
        <input id="address" name="address" defaultValue={initialValues?.address} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="taxCode">
        <span className="font-medium text-slate-700">Mã số thuế</span>
        <input id="taxCode" name="taxCode" defaultValue={initialValues?.taxCode} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
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
          {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo nhà cung cấp"}
        </button>
        <Link
          href="/admin/suppliers"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
