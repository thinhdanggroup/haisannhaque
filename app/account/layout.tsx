import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountSessionState } from "@/src/features/account/actions";

type AccountLayoutProps = {
  children: React.ReactNode;
};

const accountLinks = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/loyalty", label: "Loyalty" },
];

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const session = await getAccountSessionState();

  if (session.status === "anonymous") {
    redirect("/");
  }

  if (session.status === "unconfigured") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase auth is not configured yet.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3">
          <div className="px-2 py-2 text-sm font-semibold">{session.email ?? "Account"}</div>
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
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
