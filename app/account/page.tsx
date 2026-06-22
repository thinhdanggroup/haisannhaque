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
  // getAccountProfile is still needed for customerId (used by other account pages)
  if (user) await getAccountProfile(client, user.id);

  // Fetch form defaults from profiles table — this is where updateProfileAction writes
  const { data: profileRow } = user
    ? await client
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-1">Hồ sơ</h1>
      <p className="text-sm text-slate-500 mb-6">{session.email}</p>
      <ProfileForm
        defaultFullName={profileRow?.full_name ?? null}
        defaultPhone={profileRow?.phone ?? null}
      />
    </div>
  );
}
