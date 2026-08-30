"use client";

import { useActionState } from "react";
import type { ShopSyncSettingsState } from "@/src/features/shop-sync/admin-actions";

type InitialValues = {
  sourceUrl: string;
  enabled: boolean;
  cronExpression: string;
  targetCatalog: boolean;
  targetShopInfo: boolean;
};

type ShopSyncSettingsFormProps = {
  action: (prev: ShopSyncSettingsState, formData: FormData) => Promise<ShopSyncSettingsState>;
  initialValues: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function ShopSyncSettingsForm({ action, initialValues }: ShopSyncSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ShopSyncSettingsState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="sourceUrl">
        <span className="font-medium text-slate-700">URL shop ShopeeFood</span>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          required
          defaultValue={initialValues.sourceUrl}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="cronExpression">
        <span className="font-medium text-slate-700">Lịch chạy (cron)</span>
        <input
          id="cronExpression"
          name="cronExpression"
          type="text"
          required
          defaultValue={initialValues.cronExpression}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={initialValues.enabled} />
        <span className="font-medium text-slate-700">Bật đồng bộ tự động</span>
      </label>

      <p className="text-xs text-slate-500">
        Lưu ý: bật đồng bộ hoặc thay đổi lịch chạy cần khởi động lại máy chủ để có hiệu lực. Lịch chạy
        theo giờ Việt Nam (UTC+7).
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="targetCatalog" defaultChecked={initialValues.targetCatalog} />
        <span className="font-medium text-slate-700">Đồng bộ sản phẩm (menu)</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="targetShopInfo" defaultChecked={initialValues.targetShopInfo} />
        <span className="font-medium text-slate-700">Đồng bộ thông tin shop</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Đang lưu…" : "Lưu cài đặt"}
      </button>
    </form>
  );
}
