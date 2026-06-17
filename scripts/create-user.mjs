import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supabase.auth.admin.createUser({
  email: "admin@dao-seafood.vn",
  password: "Admin@123456",
  email_confirm: true,
});

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("✓ User created:", data.user.email);
  console.log("  Email:    admin@dao-seafood.vn");
  console.log("  Password: Admin@123456");
}
