import { describe, expect, it } from "vitest";

describe("Supabase client modules", () => {
  it("export browser, server, and admin client factories", async () => {
    const browser = await import("@/src/lib/supabase/browser");
    const server = await import("@/src/lib/supabase/server");
    const admin = await import("@/src/lib/supabase/admin");

    expect(typeof browser.createBrowserClient).toBe("function");
    expect(typeof server.createServerClient).toBe("function");
    expect(typeof admin.createAdminClient).toBe("function");
  });
});
