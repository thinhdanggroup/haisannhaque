import { describe, expect, it } from "vitest";
import { envSchema } from "@/src/lib/env";

describe("envSchema", () => {
  it("accepts required public Supabase values", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing values", () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("keeps the optional internal Supabase URL", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_INTERNAL_URL: "http://supabase-gateway:8000",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      SUPABASE_INTERNAL_URL: "http://supabase-gateway:8000",
    });
  });
});
