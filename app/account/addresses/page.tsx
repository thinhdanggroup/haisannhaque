import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountAddresses } from "@/src/features/account/queries";
import { AddressForm } from "@/components/account/address-form";
import { AddressCard } from "@/components/account/address-card";

export default async function AccountAddressesPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-600 mb-4">Vui lòng đăng nhập để quản lý địa chỉ của bạn.</p>
        <a href="/login" className="text-blue-600 hover:underline font-medium">Đăng nhập</a>
      </div>
    );
  }
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const addresses = profile
    ? await getAccountAddresses(client, profile.customerId)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Địa chỉ giao hàng</h1>
      {addresses.length === 0 ? (
        <p className="text-sm text-slate-500 mb-4">Chưa có địa chỉ nào được lưu.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              customerId={profile!.customerId}
            />
          ))}
        </div>
      )}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Thêm địa chỉ mới
        </summary>
        {profile && <AddressForm customerId={profile.customerId} />}
      </details>
    </div>
  );
}
