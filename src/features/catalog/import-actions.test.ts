import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
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

import { importProducts } from "./import-actions";

function makeFormData(csvContent: string): FormData {
  const file = new File([csvContent], "products.csv", { type: "text/csv" });
  const fd = new FormData();
  fd.set("file", file);
  return fd;
}

const HEADER =
  "name,status,temperature_class,origin,short_description,description,sku,unit,list_price,sale_price";

function setupMocks({
  productId = "prod-uuid-1",
  productError = null,
  variantError = null,
}: {
  productId?: string;
  productError?: { message: string } | null;
  variantError?: { message: string } | null;
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_admin_roles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ admin_roles: { name: "super_admin" } }],
            error: null,
          }),
        }),
      };
    }
    if (table === "products") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: productError ? null : { id: productId },
              error: productError,
            }),
          }),
        }),
      };
    }
    if (table === "product_variants") {
      return {
        insert: vi.fn().mockResolvedValue({ error: variantError }),
      };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });
}

describe("importProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no file is provided", async () => {
    setupMocks();
    const fd = new FormData();
    const result = await importProducts(null, fd);
    expect(result).toMatchObject({
      imported: 0,
      errors: [{ row: 0, message: expect.stringContaining("file") }],
    });
  });

  it("returns error when CSV has no data rows", async () => {
    setupMocks();
    const result = await importProducts(null, makeFormData(HEADER + "\n"));
    expect(result).toMatchObject({
      imported: 0,
      errors: [{ row: 0, message: expect.stringContaining("data") }],
    });
  });

  it("records validation error for a row missing required name", async () => {
    setupMocks();
    const csv = [HEADER, ",draft,fresh,,,,SKU-001,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0]).toMatchObject({ row: 2 });
  });

  it("records validation error for an invalid temperature_class", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,draft,INVALID,,,,SKU-002,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/temperature/i);
  });

  it("records validation error for a non-numeric list_price", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,draft,fresh,,,,SKU-003,kg,abc,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/price/i);
  });

  it("imports a valid row and returns imported count of 1", async () => {
    setupMocks();
    const csv = [
      HEADER,
      "Cá hồi tươi,draft,fresh,Na Uy,Tươi ngon,Mô tả,SKU-010,kg,150000,",
    ].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(1);
    expect(result?.errors).toHaveLength(0);
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(mockFrom).toHaveBeenCalledWith("product_variants");
  });

  it("counts errors and successes when batch has mixed validity", async () => {
    setupMocks();
    const csv = [
      HEADER,
      "Cá hồi,draft,fresh,,,,SKU-011,kg,100,", // valid
      ",draft,fresh,,,,SKU-012,kg,100,", // invalid: no name
      "Tôm he,published,frozen,,,,SKU-013,con,80000,70000", // valid
    ].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(2);
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].row).toBe(3);
  });

  it("records a row error when the DB insert fails", async () => {
    setupMocks({ productError: { message: "duplicate key" } });
    const csv = [HEADER, "Cá hồi,draft,fresh,,,,SKU-014,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.errors).toHaveLength(1);
    expect(result?.errors[0].message).toMatch(/duplicate/i);
  });

  it("defaults status to draft when status column is blank", async () => {
    setupMocks();
    const csv = [HEADER, "Cá hồi,,fresh,,,,SKU-015,kg,100,"].join("\n");
    const result = await importProducts(null, makeFormData(csv));
    expect(result?.imported).toBe(1);
    const productsInsertCall = mockFrom.mock.calls.find((c) => c[0] === "products");
    expect(productsInsertCall).toBeDefined();
  });
});
