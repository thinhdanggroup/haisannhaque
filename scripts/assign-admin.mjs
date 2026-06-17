import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = "admin@dao-seafood.vn";

// Get user ID
const { data: users } = await supabase.auth.admin.listUsers();
const user = users?.users?.find((u) => u.email === email);
if (!user) {
  console.error("User not found:", email);
  process.exit(1);
}

// Get super_admin role ID
const { data: role } = await supabase
  .from("admin_roles")
  .select("id")
  .eq("name", "super_admin")
  .single();

if (!role) {
  console.error("super_admin role not found");
  process.exit(1);
}

// Assign role
const { error } = await supabase
  .from("user_admin_roles")
  .upsert({ user_id: user.id, role_id: role.id }, { onConflict: "user_id,role_id" });

if (error) {
  console.error("Error:", error.message);
} else {
  console.log(`✓ Assigned super_admin to ${email}`);
}
