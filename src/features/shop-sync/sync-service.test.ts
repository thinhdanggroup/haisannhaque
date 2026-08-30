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

  const categoriesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const categoriesInsertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "category-1" }, error: null });

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
  const variantsInsert = vi.fn().mockResolvedValue({ error: null });
  const variantsUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const imagesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const imagesInsert = vi.fn().mockResolvedValue({ error: null });
  const imagesUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const productCategoriesUpsert = vi.fn().mockResolvedValue({ error: null });

  const shopProfileSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const shopProfileInsert = vi.fn().mockResolvedValue({ error: null });
  const shopProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });

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
    if (table === "categories") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: categoriesSelectMaybeSingle }) }),
        insert: () => ({ select: () => ({ single: categoriesInsertSelectSingle }) }),
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
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    client: { from, storage: { from: vi.fn() } } as never,
    spies: {
      categoriesSelectMaybeSingle,
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
