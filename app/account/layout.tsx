import Link from "next/link";
import { getAccountSessionState } from "@/src/features/account/actions";
import { logoutAction } from "@/src/features/account/logout-action";

type AccountLayoutProps = {
  children: React.ReactNode;
};

const accountLinks = [
  { href: "/account", label: "Hồ sơ" },
  { href: "/account/orders", label: "Đơn hàng" },
  { href: "/account/addresses", label: "Địa chỉ" },
  { href: "/account/wishlist", label: "Yêu thích" },
  { href: "/account/loyalty", label: "Tích điểm" },
];

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const session = await getAccountSessionState();
  const email = session.status === "authenticated" ? session.email : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3">
          <div className="px-2 py-2 text-sm font-semibold text-slate-700 truncate">
            {email ?? "Tài khoản"}
          </div>
          <nav className="mt-2 space-y-1">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
