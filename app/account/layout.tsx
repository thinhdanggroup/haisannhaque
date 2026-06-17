import Link from "next/link";
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
  const email = session.status === "authenticated" ? session.email : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3">
          <div className="px-2 py-2 text-sm font-semibold">{email ?? "Account"}</div>
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
