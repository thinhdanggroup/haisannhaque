import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
// vi.mock is hoisted above these const declarations. Referencing a
// sibling-module mock (e.g. "./sync-service", which lives in this same
// directory) from a plain top-level const trips a hoisting bug in this
// repo's vitest version (TDZ "Cannot access before initialization"), even
// though the same pattern works fine for mocks outside this directory
// (e.g. "@/src/lib/supabase/server" below). vi.hoisted() sidesteps it by
// running before the mock factories are registered.
const { mockRunSync } = vi.hoisted(() => ({ mockRunSync: vi.fn() }));

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}));
vi.mock("@/src/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, storage: { from: vi.fn() } })),
}));
vi.mock("./sync-service", () => ({ runSync: mockRunSync }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateShopSyncSettings, triggerShopSyncNow, mapShopSyncCategory } from "./admin-actions";

function grantSuperAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "user_admin_roles") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
        }),
      };
    }
    if (table === "shop_sync_settings") {
      return {
        select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "settings-1" }, error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

describe("updateShopSyncSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid sourceUrl before touching the database", async () => {
    grantSuperAdmin();
    const fd = new FormData();
    fd.set("sourceUrl", "not-a-url");
    fd.set("cronExpression", "0 3 * * *");
    const result = await updateShopSyncSettings(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("URL") });
  });

  it("saves valid settings", async () => {
    grantSuperAdmin();
    const fd = new FormData();
    fd.set("sourceUrl", "https://shopeefood.vn/now-food/shop/1303714");
    fd.set("cronExpression", "0 3 * * *");
    fd.set("enabled", "on");
    fd.set("targetCatalog", "on");
    fd.set("targetShopInfo", "on");
    const result = await updateShopSyncSettings(null, fd);
    expect(result).toBeNull();
  });
});

describe("triggerShopSyncNow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an error when no settings exist yet", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
          }),
        };
      }
      if (table === "shop_sync_settings") {
        return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await triggerShopSyncNow();
    expect(result).toEqual({ error: expect.stringContaining("not configured") });
  });

  it("runs the sync and returns the run id when settings exist", async () => {
    grantSuperAdmin();
    mockRunSync.mockResolvedValue({ id: "run-1" });
    const result = await triggerShopSyncNow();
    expect(mockRunSync).toHaveBeenCalled();
    expect(result).toEqual({ runId: "run-1" });
  });
});

describe("mapShopSyncCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  function grantSuperAdminForMapping() {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  }

  it("rejects non-UUID category ids before touching the database", async () => {
    grantSuperAdminForMapping();
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const fd = new FormData();
    fd.set("placeholderCategoryId", "not-a-uuid");
    fd.set("targetCategoryId", "also-not-a-uuid");
    const result = await mapShopSyncCategory(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("category") });
  });

  it("saves the mapping, re-links products, and deactivates the placeholder", async () => {
    grantSuperAdminForMapping();
    const placeholderId = "caca07be-4855-45ea-93c1-d061853878ae";
    const targetId = "e1b0d055-7a48-4cff-9268-6ed2e40ff8a4";

    const mappingUpsert = vi.fn().mockResolvedValue({ error: null });
    const relinkUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const deactivateUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ admin_roles: { name: "super_admin" } }], error: null }),
          }),
        };
      }
      if (table === "categories") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { name: "Món chế biến sẳn" }, error: null }),
            }),
          }),
          update: () => ({ eq: deactivateUpdateEq }),
        };
      }
      if (table === "shop_sync_category_mappings") {
        return { upsert: mappingUpsert };
      }
      if (table === "product_categories") {
        return { update: () => ({ eq: relinkUpdateEq }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const fd = new FormData();
    fd.set("placeholderCategoryId", placeholderId);
    fd.set("targetCategoryId", targetId);
    const result = await mapShopSyncCategory(null, fd);

    expect(mappingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        external_source: "shopeefood",
        external_category_name: "Món chế biến sẳn",
        category_id: targetId,
      }),
      expect.objectContaining({ onConflict: "external_source,external_category_name" }),
    );
    expect(relinkUpdateEq).toHaveBeenCalledWith("category_id", placeholderId);
    expect(deactivateUpdateEq).toHaveBeenCalledWith("id", placeholderId);
    expect(result).toBeNull();
  });
});
