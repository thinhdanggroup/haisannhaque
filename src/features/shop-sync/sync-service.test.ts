import { describe, expect, it, vi, beforeEach } from "vitest";
import { runSync } from "./sync-service";
import { downloadAndStoreImage } from "./image-store";
import type { ShopSourceAdapter, ScrapedShop } from "./adapters/types";
import type { ShopSyncSettings } from "./types";

vi.mock("./image-store", () => ({
  downloadAndStoreImage: vi.fn(async (_client, sourceUrl: string) => `https://media.test/${sourceUrl}`),
}));

function fakeAdapter(shop: ScrapedShop): ShopSourceAdapter {
  return { fetchShop: vi.fn().mockResolvedValue(shop) };
}

function shopWithOneItem(overrides: Partial<ScrapedShop["items"][number]> = {}): ScrapedShop {
  return {
    shopInfo: {
      name: "Shop",
      logoUrl: null,
      coverImageUrl: null,
      description: null,
      address: null,
      openingHours: null,
    },
    items: [
      {
        externalId: "293255211",
        name: "Cá Chẽm hấp Hồng kông",
        description: "Ngon",
        priceVnd: 350000,
        imageUrl: "https://mms.img.susercontent.com/x.jpg",
        categoryName: "Hải sản hấp",
        isAvailable: true,
        ...overrides,
      },
    ],
  };
}

function baseSettings(overrides: Partial<ShopSyncSettings> = {}): ShopSyncSettings {
  return {
    id: "settings-1",
    source: "shopeefood",
    sourceUrl: "https://shopeefood.vn/now-food/shop/1303714",
    enabled: true,
    cronExpression: "0 3 * * *",
    targetCatalog: true,
    targetShopInfo: false,
    updatedAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function makeAdminClientMock() {
  const runsInsertSelectSingle = vi.fn().mockResolvedValue({ data: { id: "run-1" }, error: null });
  const runsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const runItemsInsert = vi.fn().mockResolvedValue({ error: null });

  const categoryMappingSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const categoriesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const categoriesInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "category-1" }, error: null });
  const categoriesInsert = vi.fn(() => ({ select: () => ({ single: categoriesInsertSelectSingle }) }));

  const productsSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const productsInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "product-1" }, error: null });
  const productsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  // Wrappers that capture the insert/update payloads, so tests can assert on
  // which columns a write actually carried (e.g. external_image_source_url).
  const productsInsert = vi.fn(() => ({ select: () => ({ single: productsInsertSelectSingle }) }));
  const productsUpdate = vi.fn(() => ({ eq: productsUpdateEq }));
  const productsArchiveNotInEq = vi.fn().mockResolvedValue({ data: [], error: null });

  const variantsSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const variantsInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "variant-1" }, error: null });
  const variantsInsert = vi.fn(() => ({ select: () => ({ single: variantsInsertSelectSingle }) }));
  const variantsUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const imagesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const imagesInsert = vi.fn().mockResolvedValue({ error: null });
  const imagesUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const productCategoriesUpsert = vi.fn().mockResolvedValue({ error: null });

  const shopProfileSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const shopProfileInsert = vi.fn().mockResolvedValue({ error: null });
  const shopProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const warehouseSelectMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "warehouse-1" }, error: null });
  const calculateAvailableStockRpc = vi.fn().mockResolvedValue({ data: 0, error: null });
  const stockLedgerInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "shop_sync_runs") {
      return {
        insert: () => ({ select: () => ({ single: runsInsertSelectSingle }) }),
        update: () => ({ eq: runsUpdateEq }),
      };
    }
    if (table === "shop_sync_run_items") {
      return { insert: runItemsInsert };
    }
    if (table === "shop_sync_category_mappings") {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: categoryMappingSelectMaybeSingle }) }) }),
      };
    }
    if (table === "categories") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: categoriesSelectMaybeSingle }) }),
        insert: categoriesInsert,
      };
    }
    if (table === "products") {
      // Two different query shapes land here: the existing-item lookup
      // (`select().eq().eq().maybeSingle()`) and the archive scan
      // (`select().eq().not(...)`, which resolves directly). Both start
      // with `select().eq()`, so the returned object supports both next steps.
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: productsSelectMaybeSingle }),
            not: productsArchiveNotInEq,
          }),
        }),
        insert: productsInsert,
        update: productsUpdate,
      };
    }
    if (table === "product_variants") {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: variantsSelectMaybeSingle }) }) }),
        insert: variantsInsert,
        update: () => ({ eq: variantsUpdateEq }),
      };
    }
    if (table === "product_images") {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: imagesSelectMaybeSingle }) }) }),
        insert: imagesInsert,
        update: () => ({ eq: imagesUpdateEq }),
      };
    }
    if (table === "product_categories") {
      return { upsert: productCategoriesUpsert };
    }
    if (table === "shop_profile") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: shopProfileSelectMaybeSingle }) }),
        insert: shopProfileInsert,
        update: () => ({ eq: shopProfileUpdateEq }),
      };
    }
    if (table === "warehouses") {
      return { select: () => ({ eq: () => ({ maybeSingle: warehouseSelectMaybeSingle }) }) };
    }
    if (table === "stock_ledger_entries") {
      return { insert: stockLedgerInsert };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  const rpc = vi.fn((name: string) => {
    if (name === "calculate_available_stock") return calculateAvailableStockRpc();
    throw new Error(`Unexpected rpc in test: ${name}`);
  });

  return {
    client: { from, rpc, storage: { from: vi.fn() } } as never,
    spies: {
      categoryMappingSelectMaybeSingle,
      categoriesSelectMaybeSingle,
      categoriesInsert,
      categoriesInsertSelectSingle,
      productsArchiveNotInEq,
      productsInsert,
      productsInsertSelectSingle,
      productsSelectMaybeSingle,
      productsUpdate,
      productsUpdateEq,
      variantsInsert,
      runsUpdateEq,
      runItemsInsert,
      shopProfileInsert,
      shopProfileUpdateEq,
      warehouseSelectMaybeSingle,
      calculateAvailableStockRpc,
      stockLedgerInsert,
    },
  };
}

describe("runSync (catalog)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a product for a new ShopeeFood item", async () => {
    const shop: ScrapedShop = {
      shopInfo: {
        name: "Shop",
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        address: null,
        openingHours: null,
      },
      items: [
        {
          externalId: "293255211",
          name: "Cá Chẽm hấp Hồng kông",
          description: "Ngon",
          priceVnd: 350000,
          imageUrl: "https://mms.img.susercontent.com/x.jpg",
          categoryName: "Hải sản hấp",
          isAvailable: true,
        },
      ],
    };

    const { client, spies } = makeAdminClientMock();
    const run = await runSync(client, fakeAdapter(shop), baseSettings(), "manual");

    expect(spies.productsInsertSelectSingle).toHaveBeenCalled();
    expect(spies.variantsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "product-1",
        sku: "shopeefood-293255211",
        list_price: 350000,
        is_active: true,
      }),
    );
    expect(run.itemsCreated).toBe(1);
    expect(run.status).toBe("success");
  });

  it("does not persist external_image_source_url when the image download fails", async () => {
    const imageUrl = "https://mms.img.susercontent.com/broken.jpg";
    const shop = shopWithOneItem({ imageUrl });

    vi.mocked(downloadAndStoreImage).mockRejectedValueOnce(new Error("unsupported content-type"));

    const { client, spies } = makeAdminClientMock();
    const run = await runSync(client, fakeAdapter(shop), baseSettings(), "manual");

    // The initial insert must not carry the source URL...
    expect(spies.productsInsert).toHaveBeenCalledTimes(1);
    expect(spies.productsInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ external_image_source_url: expect.anything() }),
    );
    // ...and the follow-up update is never reached, so the next run retries.
    expect(spies.productsUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ external_image_source_url: imageUrl }),
    );
    expect(run.itemsErrored).toBe(1);
    expect(run.itemsCreated).toBe(0);
  });

  it("persists external_image_source_url only after the image download succeeds", async () => {
    const imageUrl = "https://mms.img.susercontent.com/ok.jpg";
    const { client, spies } = makeAdminClientMock();
    const run = await runSync(client, fakeAdapter(shopWithOneItem({ imageUrl })), baseSettings(), "manual");

    expect(spies.productsUpdate).toHaveBeenCalledWith({ external_image_source_url: imageUrl });
    expect(run.itemsCreated).toBe(1);
  });

  it("records an error item instead of creating a duplicate when the category lookup fails", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.categoriesSelectMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "more than one row returned" },
    });

    const run = await runSync(client, fakeAdapter(shopWithOneItem()), baseSettings(), "manual");

    expect(spies.categoriesInsertSelectSingle).not.toHaveBeenCalled();
    expect(spies.productsInsert).not.toHaveBeenCalled();
    expect(spies.runItemsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "error",
        message: expect.stringContaining("Failed to look up category"),
      }),
    );
    expect(run.itemsErrored).toBe(1);
  });

  it("skips archiving (and records why) when the scrape returns zero items", async () => {
    const shop: ScrapedShop = {
      shopInfo: {
        name: "Shop",
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        address: null,
        openingHours: null,
      },
      items: [],
    };

    const { client, spies } = makeAdminClientMock();
    const run = await runSync(client, fakeAdapter(shop), baseSettings(), "scheduled");

    expect(spies.productsArchiveNotInEq).not.toHaveBeenCalled();
    expect(spies.productsUpdate).not.toHaveBeenCalled();
    expect(spies.runItemsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "skipped", external_id: "n/a", product_id: null }),
    );
    expect(run.itemsArchived).toBe(0);
    expect(run.status).toBe("success");
  });

  it("records a failed run without throwing when the adapter fails", async () => {
    const { client } = makeAdminClientMock();
    const failingAdapter: ShopSourceAdapter = {
      fetchShop: vi.fn().mockRejectedValue(new Error("network down")),
    };

    const run = await runSync(client, failingAdapter, baseSettings(), "scheduled");

    expect(run.status).toBe("failed");
    expect(run.errorMessage).toContain("network down");
  });

  it("links the product to the mapped category instead of creating a placeholder", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.categoryMappingSelectMaybeSingle.mockResolvedValue({
      data: { category_id: "real-category-1" },
      error: null,
    });

    const run = await runSync(client, fakeAdapter(shopWithOneItem()), baseSettings(), "manual");

    expect(spies.categoriesInsert).not.toHaveBeenCalled();
    expect(spies.categoriesSelectMaybeSingle).not.toHaveBeenCalled();
    // productCategoriesUpsert isn't exposed as a spy on its own, but the
    // product row it's called for confirms the sync completed past the
    // category-resolution step using the mapped id.
    expect(run.itemsCreated).toBe(1);
    expect(run.status).toBe("success");
  });

  it("falls back to a shopeefood-tagged placeholder category when no mapping exists", async () => {
    const { client, spies } = makeAdminClientMock();

    const run = await runSync(client, fakeAdapter(shopWithOneItem()), baseSettings(), "manual");

    expect(spies.categoryMappingSelectMaybeSingle).toHaveBeenCalled();
    expect(spies.categoriesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Hải sản hấp", external_source: "shopeefood" }),
    );
    expect(run.itemsCreated).toBe(1);
  });

  it("converges stock up to the synced quantity for an available item with none on hand", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.calculateAvailableStockRpc.mockResolvedValue({ data: 0, error: null });

    await runSync(client, fakeAdapter(shopWithOneItem({ isAvailable: true })), baseSettings(), "manual");

    expect(spies.stockLedgerInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: "variant-1",
        warehouse_id: "warehouse-1",
        movement_type: "adjustment",
        quantity_delta: 50,
        source_doc_type: "shop_sync",
      }),
    );
  });

  it("converges stock down to zero for an unavailable item that currently has stock", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.calculateAvailableStockRpc.mockResolvedValue({ data: 50, error: null });

    await runSync(client, fakeAdapter(shopWithOneItem({ isAvailable: false })), baseSettings(), "manual");

    expect(spies.stockLedgerInsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity_delta: -50 }),
    );
  });

  it("does not write a stock adjustment when already at the target quantity", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.calculateAvailableStockRpc.mockResolvedValue({ data: 50, error: null });

    await runSync(client, fakeAdapter(shopWithOneItem({ isAvailable: true })), baseSettings(), "manual");

    expect(spies.stockLedgerInsert).not.toHaveBeenCalled();
  });

  it("skips inventory convergence without failing the item when no warehouse is configured", async () => {
    const { client, spies } = makeAdminClientMock();
    spies.warehouseSelectMaybeSingle.mockResolvedValue({ data: null, error: null });

    const run = await runSync(client, fakeAdapter(shopWithOneItem()), baseSettings(), "manual");

    expect(spies.stockLedgerInsert).not.toHaveBeenCalled();
    expect(spies.calculateAvailableStockRpc).not.toHaveBeenCalled();
    expect(run.itemsCreated).toBe(1);
    expect(run.itemsErrored).toBe(0);
  });

  it("creates a shop_profile row when targetShopInfo is enabled", async () => {
    const shop: ScrapedShop = {
      shopInfo: {
        name: "Cơm Nhà Vị Quê",
        logoUrl: "https://mms.img.susercontent.com/logo.jpg",
        coverImageUrl: "https://mms.img.susercontent.com/cover.jpg",
        description: null,
        address: "123 Đường ABC",
        openingHours: "Thứ Hai: 07:30–20:00",
      },
      items: [],
    };

    const { client, spies } = makeAdminClientMock();
    const settings = baseSettings({ targetCatalog: false, targetShopInfo: true });
    const run = await runSync(client, fakeAdapter(shop), settings, "manual");

    expect(spies.shopProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "shopeefood",
        name: "Cơm Nhà Vị Quê",
        address: "123 Đường ABC",
      }),
    );
    expect(run.status).toBe("success");
  });
});
