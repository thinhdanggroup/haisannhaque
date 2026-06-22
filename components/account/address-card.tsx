"use client";

import { useTransition } from "react";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/src/features/account/address-actions";
import type { AccountAddress } from "@/src/features/account/queries";

type AddressCardProps = {
  address: AccountAddress;
  customerId: string;
};

export function AddressCard({ address, customerId }: AddressCardProps) {
  const [pending, startTransition] = useTransition();

  function handleSetDefault() {
    startTransition(() => setDefaultAddressAction(address.id, customerId));
  }

  function handleDelete() {
    startTransition(() => deleteAddressAction(address.id));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          {address.label && (
            <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 mb-1">
              {address.label}
            </span>
          )}
          {address.isDefault && (
            <span className="inline-block ml-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 mb-1">
              Mặc định
            </span>
          )}
          <p className="text-sm font-medium text-slate-900">{address.receiverName}</p>
          <p className="text-sm text-slate-600">{address.phone}</p>
          <p className="text-sm text-slate-600">
            {address.addressLine}, {address.ward}, {address.district}, {address.province}
          </p>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {!address.isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={pending}
            className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Đặt mặc định
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
