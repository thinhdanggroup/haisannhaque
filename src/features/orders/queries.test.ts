import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

import { getAdminOrderRows } from "./queries";

describe("getAdminOrderRows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps raw DB rows to AdminOrderRow including id", async () => {
    const selectChain = {
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "order-uuid-1",
            order_no: "ORD-001",
            order_status: "confirmed",
            payment_status: "paid",
            grand_total: 150000,
            created_at: "2026-06-01T10:00:00Z",
            placed_at: "2026-06-01T10:00:00Z",
          },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(selectChain) });

    const client = { from: mockFrom } as never;
    const rows = await getAdminOrderRows(client);

    expect(rows[0].id).toBe("order-uuid-1");
    expect(rows[0].orderNo).toBe("ORD-001");
  });
});
