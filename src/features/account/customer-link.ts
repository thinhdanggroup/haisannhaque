import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Returns the customers row for a signed-in user, creating it on first use.
 * Loyalty points (award_loyalty_points) and /account pages key off
 * customers.user_id, and orders only earn points when they carry a
 * customer_id — so every signed-in shopper needs a row.
 *
 * Pass the service-role client: customers has no insert policy for users.
 */
export async function ensureCustomerForUser(
  admin: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
): Promise<string> {
  const { data: existing, error: selectError } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id as string;

  const metadata = (user.user_metadata ?? {}) as { full_name?: unknown; phone?: unknown };

  const { data: created, error: insertError } = await admin
    .from("customers")
    .insert({
      user_id: user.id,
      email: user.email ?? null,
      full_name: typeof metadata.full_name === "string" ? metadata.full_name : null,
      phone: typeof metadata.phone === "string" ? metadata.phone : null,
    })
    .select("id")
    .single();

  if (insertError) {
    // A concurrent request created it first (customers.user_id is unique).
    if (insertError.code === "23505") {
      const { data: raced } = await admin
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (raced) return raced.id as string;
    }
    throw insertError;
  }

  return created.id as string;
}

/** Only allow same-site relative redirects ("/checkout", not "//evil.com"). */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
