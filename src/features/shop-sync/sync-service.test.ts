import { describe, expect, it, vi, beforeEach } from "vitest";
import { runSync } from "./sync-service";
import type { ShopSourceAdapter, ScrapedShop } from "./adapters/types";
import type { ShopSyncSettings } from "./types";

vi.mock("./image-store", () => ({
  downloadAndStoreImage: vi.fn(async (_client, sourceUrl: string) => `https://media.test/${sourceUrl}`),
}));

function fakeAdapter(shop: ScrapedShop): ShopSourceAdapter {
  return { fetchShop: vi.fn().mockResolvedValue(shop) };
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
  const state: { products: Record<string, unknown>[] } = { products: [] };

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
  const productsArchiveNotInEq = vi.fn().mockResolvedValue({ data: [], error: null });

  const variantsSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const variantsInsert = vi.fn().mockResolvedValue({ error: null });
  const variantsUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const imagesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const imagesInsert = vi.fn().mockResolvedValue({ error: null });
  const imagesUpdateEq = vi.fn().mockResolvedValue({ error: null });

  const productCategoriesUpsert = vi.fn().mockResolvedValue({ error: null });

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
        select: () => ({ ilike: () => ({ maybeSingle: categoriesSelectMaybeSingle }) }),
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
        insert: () => ({ select: () => ({ single: productsInsertSelectSingle }) }),
        update: () => ({ eq: productsUpdateEq }),
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
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    client: { from, storage: { from: vi.fn() } } as never,
    spies: {
      productsArchiveNotInEq,
      productsInsertSelectSingle,
      productsUpdateEq,
      variantsInsert,
      runsUpdateEq,
      runItemsInsert,
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

  it("records a failed run without throwing when the adapter fails", async () => {
    const { client } = makeAdminClientMock();
    const failingAdapter: ShopSourceAdapter = {
      fetchShop: vi.fn().mockRejectedValue(new Error("network down")),
    };

    const run = await runSync(client, failingAdapter, baseSettings(), "scheduled");

    expect(run.status).toBe("failed");
    expect(run.errorMessage).toContain("network down");
  });
});
