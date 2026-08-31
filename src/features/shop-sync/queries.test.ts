import { describe, expect, it, vi } from "vitest";
import {
  getShopSyncSettings,
  listShopSyncRuns,
  getShopSyncRunWithItems,
  listUnmappedShopSyncCategories,
  listMappableCategories,
} from "./queries";

function clientReturning(row: unknown, table: string) {
  return {
    from: vi.fn((t: string) => {
      if (t !== table) throw new Error(`unexpected table ${t}`);
      return {
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
          order: () => ({ limit: () => Promise.resolve({ data: row, error: null }) }),
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
        }),
      };
    }),
  } as never;
}

describe("getShopSyncSettings", () => {
  it("maps a settings row to camelCase", async () => {
    const client = clientReturning(
      {
        id: "s1",
        source: "shopeefood",
        source_url: "https://shopeefood.vn/x",
        enabled: true,
        cron_expression: "0 3 * * *",
        target_catalog: true,
        target_shop_info: false,
        updated_at: "2026-08-30T00:00:00Z",
      },
      "shop_sync_settings",
    );

    const result = await getShopSyncSettings(client);
    expect(result).toEqual({
      id: "s1",
      source: "shopeefood",
      sourceUrl: "https://shopeefood.vn/x",
      enabled: true,
      cronExpression: "0 3 * * *",
      targetCatalog: true,
      targetShopInfo: false,
      updatedAt: "2026-08-30T00:00:00Z",
    });
  });

  it("returns null when no settings row exists", async () => {
    const client = clientReturning(null, "shop_sync_settings");
    expect(await getShopSyncSettings(client)).toBeNull();
  });
});

describe("listShopSyncRuns", () => {
  it("maps run rows to camelCase", async () => {
    const client = clientReturning(
      [
        {
          id: "r1",
          settings_id: "s1",
          status: "success",
          trigger: "manual",
          items_created: 2,
          items_updated: 1,
          items_archived: 0,
          items_errored: 0,
          error_message: null,
          started_at: "2026-08-30T00:00:00Z",
          finished_at: "2026-08-30T00:01:00Z",
        },
      ],
      "shop_sync_runs",
    );

    const result = await listShopSyncRuns(client);
    expect(result).toEqual([
      {
        id: "r1",
        settingsId: "s1",
        status: "success",
        trigger: "manual",
        itemsCreated: 2,
        itemsUpdated: 1,
        itemsArchived: 0,
        itemsErrored: 0,
        errorMessage: null,
        startedAt: "2026-08-30T00:00:00Z",
        finishedAt: "2026-08-30T00:01:00Z",
      },
    ]);
  });
});

describe("listUnmappedShopSyncCategories", () => {
  it("lists active shopeefood-tagged categories with no mapping yet", async () => {
    const rows = [{ id: "cat-1", name: "Món chế biến sẳn" }];
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
          }),
        }),
      })),
    } as never;

    expect(await listUnmappedShopSyncCategories(client)).toEqual(rows);
  });
});

describe("listMappableCategories", () => {
  it("lists active categories with no external_source (real, site-owned categories)", async () => {
    const rows = [{ id: "cat-2", name: "Hải sản tươi sống" }];
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          is: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
          }),
        }),
      })),
    } as never;

    expect(await listMappableCategories(client)).toEqual(rows);
  });
});

describe("getShopSyncRunWithItems", () => {
  it("returns null when the run does not exist", async () => {
    const client = {
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      })),
    } as never;
    expect(await getShopSyncRunWithItems(client, "missing")).toBeNull();
  });
});
