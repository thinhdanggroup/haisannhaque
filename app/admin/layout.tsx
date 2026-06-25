import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAccountSessionState } from "@/src/features/account/actions";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const session = await getAccountSessionState();

  if (session.status === "anonymous") {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
