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

import {
  archiveProduct,
  createProduct,
  createProductVariant,
  updateVariantPricing,
} from "./admin-actions";

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    const insertChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "new-product-uuid" }, error: null }),
      }),
    };
    const fromChain = {
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ admin_roles: { name: "super_admin" } }],
          error: null,
        }),
      }),
    };
    mockFrom.mockReturnValue(fromChain);
  });

  it("returns error when name is empty", async () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("status", "draft");
    fd.set("temperatureClass", "fresh");
    const result = await createProduct(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("inserts product and redirects on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("name", "Cá hồi tươi");
    fd.set("status", "draft");
    fd.set("shortDescription", "");
    fd.set("description", "");
    fd.set("origin", "Na Uy");
    fd.set("temperatureClass", "fresh");
    await createProduct(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining("/admin/products/"));
  });
});

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

describe("createProductVariant", () => {
  const productId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  let variantInsert: ReturnType<typeof vi.fn>;

  function setup(options: { insertError?: { code?: string; message: string } | null; slug?: string } = {}) {
    variantInsert = vi.fn().mockResolvedValue({ error: options.insertError ?? null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "product_variants") {
        return { insert: variantInsert };
      }
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { slug: options.slug ?? "mam-ca-com" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ admin_roles: { name: "super_admin" } }],
            error: null,
          }),
        }),
      };
    });
  }

  function formData(overrides: Record<string, string> = {}) {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("sku", "MAM-001");
    fd.set("unit", "hũ");
    fd.set("optionSummary", "");
    fd.set("listPrice", "120000");
    fd.set("salePrice", "");
    for (const [key, value] of Object.entries(overrides)) fd.set(key, value);
    return fd;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    setup();
  });

  it("returns an error for a non-UUID product id", async () => {
    const result = await createProductVariant(null, formData({ productId: "nope" }));
    expect(result).toEqual({ error: "Invalid product ID." });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("returns an error when the unit is empty", async () => {
    const result = await createProductVariant(null, formData({ unit: "  " }));
    expect(result).toEqual({ error: expect.stringContaining("Unit") });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("returns an error when the list price is negative", async () => {
    const result = await createProductVariant(null, formData({ listPrice: "-1" }));
    expect(result).toEqual({ error: expect.stringContaining("List price") });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("returns an error when the list price is not a number", async () => {
    const result = await createProductVariant(null, formData({ listPrice: "" }));
    expect(result).toEqual({ error: expect.stringContaining("List price") });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("returns an error when the list price is not numeric text", async () => {
    const result = await createProductVariant(null, formData({ listPrice: "miễn phí" }));
    expect(result).toEqual({ error: expect.stringContaining("List price") });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("returns an error when the sale price is not numeric text", async () => {
    const result = await createProductVariant(null, formData({ salePrice: "rẻ" }));
    expect(result).toEqual({ error: expect.stringContaining("Sale price") });
    expect(variantInsert).not.toHaveBeenCalled();
  });

  it("inserts an active variant and stores a blank sale price as null", async () => {
    const result = await createProductVariant(null, formData());
    expect(result).toEqual({ success: true });
    expect(variantInsert).toHaveBeenCalledWith({
      product_id: productId,
      sku: "MAM-001",
      unit: "hũ",
      option_summary: null,
      list_price: 120000,
      sale_price: null,
      is_active: true,
      is_weighable: false,
    });
  });

  it("keeps a provided sale price and option summary", async () => {
    await createProductVariant(
      null,
      formData({ salePrice: "99000", optionSummary: "Hũ 500g" }),
    );
    expect(variantInsert).toHaveBeenCalledWith(
      expect.objectContaining({ sale_price: 99000, option_summary: "Hũ 500g" }),
    );
  });

  it("generates a SKU from the product slug when none is given", async () => {
    await createProductVariant(null, formData({ sku: "   " }));
    expect(mockFrom).toHaveBeenCalledWith("products");
    expect(variantInsert).toHaveBeenCalledWith(
      expect.objectContaining({ sku: expect.stringMatching(/^mam-ca-com-[a-z0-9]{5}$/) }),
    );
  });

  it("reports a duplicate SKU instead of throwing", async () => {
    setup({ insertError: { code: "23505", message: "duplicate key value" } });
    const result = await createProductVariant(null, formData());
    expect(result).toEqual({ error: expect.stringContaining("SKU") });
  });

  it("revalidates the product edit page after a successful insert", async () => {
    const { revalidatePath } = await import("next/cache");
    await createProductVariant(null, formData());
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/products/${productId}/edit`);
  });
});

describe("updateVariantPricing", () => {
  const productId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const variantId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  let variantUpdate: ReturnType<typeof vi.fn>;

  function formData(overrides: Record<string, string> = {}) {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.append("variantId", variantId);
    fd.set(`listPrice_${variantId}`, "120000");
    fd.set(`salePrice_${variantId}`, "");
    for (const [key, value] of Object.entries(overrides)) fd.set(key, value);
    return fd;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });

    variantUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === "product_variants") return { update: variantUpdate };
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ admin_roles: { name: "super_admin" } }],
            error: null,
          }),
        }),
      };
    });
  });

  it("clears a blank sale price to null instead of 0", async () => {
    const result = await updateVariantPricing(null, formData());
    expect(result).toEqual({ success: true });
    expect(variantUpdate).toHaveBeenCalledWith({ list_price: 120000, sale_price: null });
  });

  it("keeps a real sale price", async () => {
    await updateVariantPricing(null, formData({ [`salePrice_${variantId}`]: "99000" }));
    expect(variantUpdate).toHaveBeenCalledWith({ list_price: 120000, sale_price: 99000 });
  });

  it("rejects a blank list price rather than storing 0", async () => {
    const result = await updateVariantPricing(null, formData({ [`listPrice_${variantId}`]: "" }));
    expect(result).toEqual({ error: expect.stringContaining("List price") });
    expect(variantUpdate).not.toHaveBeenCalled();
  });
});
