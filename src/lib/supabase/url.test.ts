import { describe, expect, it } from "vitest";
import { getSupabaseServerUrl } from "./url";

describe("getSupabaseServerUrl", () => {
  it("prefers an internal Supabase URL for server-side Docker traffic", () => {
    expect(
      getSupabaseServerUrl({
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        SUPABASE_INTERNAL_URL: "http://supabase-gateway:8000",
      }),
    ).toBe("http://supabase-gateway:8000");
  });

  it("falls back to the public Supabase URL", () => {
    expect(
      getSupabaseServerUrl({
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      }),
    ).toBe("http://localhost:54321");
  });
});
