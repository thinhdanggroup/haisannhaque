import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountLoyaltyLedger } from "@/src/features/account/queries";
import { redirect } from "next/navigation";

const tierLabels: Record<string, string> = {
  standard: "Tiêu Chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

const reasonLabels: Record<string, string> = {
  order_completed: "Đơn hàng hoàn thành",
  manual_adjustment: "Điều chỉnh thủ công",
};

export default async function AccountLoyaltyPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const ledger = profile ? await getAccountLoyaltyLedger(client, profile.customerId) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-2">Tích điểm</h1>
      {profile ? (
        <>
          <div className="mb-6 flex gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Điểm tích lũy</p>
              <p className="text-3xl font-bold text-slate-900">
                {profile.loyaltyPoints.toLocaleString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Hạng thành viên</p>
              <p className="text-lg font-semibold text-slate-700">
                {tierLabels[profile.loyaltyTier] ?? profile.loyaltyTier}
              </p>
            </div>
          </div>
          <h2 className="text-base font-semibold mb-2 text-slate-800">Lịch sử điểm</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có giao dịch điểm nào.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      {reasonLabels[entry.reason] ?? entry.reason}
                    </p>
                    <p className="text-xs text-slate-400">{entry.createdAt}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      entry.pointsDelta >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {entry.pointsDelta >= 0 ? "+" : ""}
                    {entry.pointsDelta.toLocaleString("vi-VN")} điểm
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">Không tìm thấy thông tin khách hàng.</p>
      )}
    </div>
  );
}
