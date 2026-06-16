import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdate = vi.fn();
const mockEq = vi.fn();
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

import { archiveProduct } from "./admin-actions";

describe("archiveProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const chain = { eq: mockEq };
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue(chain);
    mockFrom.mockReturnValue({ update: mockUpdate, select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ admin_roles: { name: "super_admin" } }], error: null }) }) });
  });

  it("sets status to archived for the given product id", async () => {
    const validId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    await archiveProduct(validId);
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
    expect(mockEq).toHaveBeenCalledWith("id", validId);
  });

  it("throws for a non-UUID product id", async () => {
    await expect(archiveProduct("prod-uuid-123")).rejects.toThrow("Invalid product id");
  });
});
