import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerUrl } from "./url";

export function createAdminClient() {
  return createClient(
    getSupabaseServerUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
