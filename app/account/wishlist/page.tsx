import Image from "next/image";
import Link from "next/link";
import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountWishlist } from "@/src/features/account/queries";
import { RemoveWishlistButton } from "@/components/account/remove-wishlist-button";
import { redirect } from "next/navigation";

export default async function AccountWishlistPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;
  const items = profile ? await getAccountWishlist(client, profile.customerId) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Sản phẩm yêu thích</h1>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có sản phẩm nào trong danh sách yêu thích.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
              {item.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden rounded">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <Link
                href={`/products/${item.productSlug}`}
                className="block text-sm font-medium text-slate-900 hover:underline"
              >
                {item.productName}
              </Link>
              <RemoveWishlistButton wishlistItemId={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
