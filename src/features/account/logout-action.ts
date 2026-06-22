"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/src/lib/supabase/server";

export async function logoutAction(): Promise<never> {
  const client = await createServerClient();
  await client.auth.signOut();
  redirect("/login");
}
