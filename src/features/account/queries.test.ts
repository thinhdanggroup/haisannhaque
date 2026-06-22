import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getAccountProfile,
  getAccountOrders,
  getAccountAddresses,
} from "./queries";

describe("getAccountProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps customer row to AccountProfile", async () => {
    const chain = { single: vi.fn().mockResolvedValue({
      data: {
        id: "cust-1",
        full_name: "Nguyễn Văn A",
        phone: "0901234567",
        loyalty_points: 250,
        loyalty_tier: "silver",
      },
      error: null,
    })};
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(chain),
      }),
    });

    const result = await getAccountProfile({ from: mockFrom } as never, "user-1");

    expect(result).toEqual({
      customerId: "cust-1",
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
      loyaltyPoints: 250,
      loyaltyTier: "silver",
    });
  });

  it("returns null when customer row not found", async () => {
    const chain = { single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }) };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountProfile({ from: mockFrom } as never, "user-missing");

    expect(result).toBeNull();
  });
});

describe("getAccountOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps order rows including item count and formats VND", async () => {
    const chain = {
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "ord-1",
          order_no: "ORD-001",
          order_status: "completed",
          grand_total: 299000,
          placed_at: "2026-06-01T10:00:00Z",
          created_at: "2026-06-01T10:00:00Z",
          order_items: [{ id: "i1" }, { id: "i2" }],
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountOrders({ from: mockFrom } as never, "cust-1");

    expect(result).toEqual([{
      id: "ord-1",
      orderNo: "ORD-001",
      status: "completed",
      grandTotal: "299.000d",
      placedAt: "2026-06-01",
      itemCount: 2,
    }]);
  });

  it("uses created_at when placed_at is null", async () => {
    const chain = {
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: "ord-2",
          order_no: "ORD-002",
          order_status: "confirmed",
          grand_total: 0,
          placed_at: null,
          created_at: "2026-05-20T08:00:00Z",
          order_items: [],
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const [row] = await getAccountOrders({ from: mockFrom } as never, "cust-1");

    expect(row.placedAt).toBe("2026-05-20");
    expect(row.itemCount).toBe(0);
  });
});

describe("getAccountAddresses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps address rows and puts default first", async () => {
    const chain = {
      order: vi.fn().mockResolvedValue({
        data: [{
          id: "addr-1",
          label: "Nhà",
          receiver_name: "Nguyễn Văn A",
          phone: "0901234567",
          province: "Hà Nội",
          district: "Ba Đình",
          ward: "Phúc Xá",
          address_line: "123 Đường Láng",
          is_default: true,
        }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) }),
    });

    const result = await getAccountAddresses({ from: mockFrom } as never, "cust-1");

    expect(result).toEqual([{
      id: "addr-1",
      label: "Nhà",
      receiverName: "Nguyễn Văn A",
      phone: "0901234567",
      province: "Hà Nội",
      district: "Ba Đình",
      ward: "Phúc Xá",
      addressLine: "123 Đường Láng",
      isDefault: true,
    }]);
  });
});
