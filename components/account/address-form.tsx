"use client";

import { useActionState } from "react";
import {
  addAddressAction,
  type AddressActionState,
} from "@/src/features/account/address-actions";

type AddressFormProps = {
  customerId: string;
  onSuccess?: () => void;
};

export function AddressForm({ customerId, onSuccess: _onSuccess }: AddressFormProps) {
  const [state, action, pending] = useActionState<AddressActionState, FormData>(
    addAddressAction,
    null,
  );

  return (
    <form action={action} className="space-y-3 mt-4">
      <input type="hidden" name="customerId" value={customerId} />
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="receiverName" className="block text-sm font-medium text-slate-700 mb-1">
            Tên người nhận *
          </label>
          <input
            id="receiverName"
            name="receiverName"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Số điện thoại *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-slate-700 mb-1">
            Tỉnh/Thành *
          </label>
          <input
            id="province"
            name="province"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-slate-700 mb-1">
            Quận/Huyện *
          </label>
          <input
            id="district"
            name="district"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="ward" className="block text-sm font-medium text-slate-700 mb-1">
            Phường/Xã *
          </label>
          <input
            id="ward"
            name="ward"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-slate-700 mb-1">
            Nhãn (tùy chọn)
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="VD: Nhà, Văn phòng"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="addressLine" className="block text-sm font-medium text-slate-700 mb-1">
            Địa chỉ chi tiết *
          </label>
          <input
            id="addressLine"
            name="addressLine"
            type="text"
            required
            placeholder="Số nhà, tên đường"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="isDefault"
            name="isDefault"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="isDefault" className="text-sm text-slate-700">
            Đặt làm địa chỉ mặc định
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Thêm địa chỉ"}
      </button>
    </form>
  );
}
