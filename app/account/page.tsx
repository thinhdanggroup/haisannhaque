import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile } from "@/src/features/account/queries";
import { ProfileForm } from "@/components/account/profile-form";
import { redirect } from "next/navigation";

export default async function AccountProfilePage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-1">Hồ sơ</h1>
      <p className="text-sm text-slate-500 mb-6">{session.email}</p>
      <ProfileForm
        defaultFullName={profile?.fullName ?? null}
        defaultPhone={profile?.phone ?? null}
      />
    </div>
  );
}
