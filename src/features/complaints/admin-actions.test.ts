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

import { updateComplaintCase } from "./admin-actions";

describe("updateComplaintCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      update: mockUpdate,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ admin_roles: { name: "super_admin" } }],
          error: null,
        }),
      }),
    });
  });

  it("returns error when id is missing", async () => {
    const fd = new FormData();
    fd.set("status", "resolved");
    fd.set("resolution", "Fixed.");
    const result = await updateComplaintCase(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("updates status and resolution", async () => {
    const fd = new FormData();
    fd.set("id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    fd.set("status", "resolved");
    fd.set("resolution", "Issue fixed.");
    await updateComplaintCase(null, fd);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resolved", resolution: "Issue fixed." }),
    );
  });
});
