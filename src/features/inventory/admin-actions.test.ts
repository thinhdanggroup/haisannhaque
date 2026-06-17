import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSelectFrom = vi.fn();
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

import { adjustInventoryBySku } from "./admin-actions";

describe("adjustInventoryBySku", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
  });

  it("returns error when quantityDelta is zero", async () => {
    const fd = new FormData();
    fd.set("sku", "SKU-001");
    fd.set("warehouseCode", "HCM-01");
    fd.set("quantityDelta", "0");
    fd.set("reasonCode", "count");

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_admin_roles") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ admin_roles: { name: "super_admin" } }], error: null }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "v1" }, error: null }) }) }) };
    });

    const result = await adjustInventoryBySku(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("zero") });
  });
});
