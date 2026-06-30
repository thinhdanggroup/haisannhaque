import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createFlashSaleEvent, deleteFlashSaleEvent } from "./admin-actions";

describe("createFlashSaleEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const adminRoleRow = { data: [{ admin_roles: { name: "super_admin" } }], error: null };
    mockSingle.mockResolvedValue({ data: { id: "new-event-id" }, error: null });
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect, error: null });
    mockEq.mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(adminRoleRow),
          }),
        };
      }
      return {
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        select: mockSelect,
      };
    });
  });

  it("returns error when name is missing", async () => {
    const fd = new FormData();
    fd.set("discountPct", "20");
    fd.set("startAt", "2026-07-01T00:00:00+07:00");
    fd.set("endAt", "2026-07-02T00:00:00+07:00");
    const result = await createFlashSaleEvent(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("returns error when discountPct is 0", async () => {
    const fd = new FormData();
    fd.set("name", "Sale");
    fd.set("discountPct", "0");
    fd.set("startAt", "2026-07-01T00:00:00+07:00");
    fd.set("endAt", "2026-07-02T00:00:00+07:00");
    const result = await createFlashSaleEvent(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});

describe("deleteFlashSaleEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const adminRoleRow = { data: [{ admin_roles: { name: "super_admin" } }], error: null };
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(adminRoleRow),
          }),
        };
      }
      return { delete: mockDelete };
    });
  });

  it("throws for invalid uuid", async () => {
    await expect(deleteFlashSaleEvent("not-a-uuid")).rejects.toThrow();
  });
});
