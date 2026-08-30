import { downloadAndStoreImage } from "./image-store";
import type { ScrapedShopItem } from "./adapters/types";
import type { ShopSourceAdapter } from "./adapters/types";
import type { ShopSyncRun, ShopSyncSettings } from "./types";

// Minimal shape this service needs from the Supabase admin client — kept
// narrow so tests can supply a lightweight fake.
type SyncClient = {
  from: (table: string) => any;
  storage: { from: (bucket: string) => any };
};

const EXTERNAL_SOURCE = "shopeefood";

function makeSlug(name: string, externalId: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${externalId}`;
}

async function recordRunItem(
  client: SyncClient,
  runId: string,
  externalId: string,
  productId: string | null,
  action: "created" | "updated" | "archived" | "skipped" | "error",
  message: string | null,
): Promise<void> {
  await client.from("shop_sync_run_items").insert({
    run_id: runId,
    external_id: externalId,
    product_id: productId,
    action,
    message,
  });
}

async function findOrCreateCategory(client: SyncClient, categoryName: string | null): Promise<string | null> {
  if (!categoryName) return null;

  const { data: existing } = await client
    .from("categories")
    .select("id")
    .ilike("name", categoryName)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await client
    .from("categories")
    .insert({
      name: categoryName,
      slug: makeSlug(categoryName, Math.random().toString(36).slice(2, 8)),
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create category "${categoryName}": ${error.message}`);
  return created.id;
}

async function upsertProductImage(
  client: SyncClient,
  productId: string,
  imageUrl: string | null,
  existingSourceUrl: string | null,
): Promise<void> {
  if (!imageUrl || imageUrl === existingSourceUrl) return;

  const hostedUrl = await downloadAndStoreImage(client, imageUrl, `shop-sync/products/${productId}`);

  const { data: existingImage } = await client
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (existingImage) {
    await client.from("product_images").update({ url: hostedUrl }).eq("id", existingImage.id);
  } else {
    await client.from("product_images").insert({ product_id: productId, url: hostedUrl, sort_order: 0 });
  }
}

async function upsertVariant(client: SyncClient, productId: string, item: ScrapedShopItem): Promise<void> {
  const { data: existingVariant } = await client
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  const variantFields = {
    list_price: item.priceVnd,
    is_active: item.isAvailable,
  };

  if (existingVariant) {
    await client.from("product_variants").update(variantFields).eq("id", existingVariant.id);
  } else {
    await client.from("product_variants").insert({
      product_id: productId,
      sku: `${EXTERNAL_SOURCE}-${item.externalId}`,
      unit: "phần",
      is_weighable: false,
      ...variantFields,
    });
  }
}

async function syncItem(
  client: SyncClient,
  runId: string,
  item: ScrapedShopItem,
): Promise<"created" | "updated" | "error"> {
  try {
    const categoryId = await findOrCreateCategory(client, item.categoryName);

    const { data: existingProduct } = await client
      .from("products")
      .select("id, external_image_source_url")
      .eq("external_source", EXTERNAL_SOURCE)
      .eq("external_id", item.externalId)
      .maybeSingle();

    const status = item.isAvailable ? "published" : "draft";
    let productId: string;
    let action: "created" | "updated";

    if (existingProduct) {
      productId = existingProduct.id;
      action = "updated";
      await client
        .from("products")
        .update({
          name: item.name,
          short_description: item.description,
          description: item.description,
          status,
          external_image_source_url: item.imageUrl,
        })
        .eq("id", productId);
    } else {
      action = "created";
      const { data: created, error } = await client
        .from("products")
        .insert({
          slug: makeSlug(item.name, item.externalId),
          name: item.name,
          short_description: item.description,
          description: item.description,
          status,
          temperature_class: "ready",
          external_source: EXTERNAL_SOURCE,
          external_id: item.externalId,
          external_image_source_url: item.imageUrl,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create product: ${error.message}`);
      productId = created.id;
    }

    await upsertVariant(client, productId, item);
    await upsertProductImage(client, productId, item.imageUrl, existingProduct?.external_image_source_url ?? null);

    if (categoryId) {
      await client
        .from("product_categories")
        .upsert({ product_id: productId, category_id: categoryId }, { onConflict: "product_id,category_id", ignoreDuplicates: true });
    }

    await recordRunItem(client, runId, item.externalId, productId, action, null);
    return action;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRunItem(client, runId, item.externalId, null, "error", message);
    return "error";
  }
}

async function archiveMissingProducts(
  client: SyncClient,
  runId: string,
  seenExternalIds: string[],
): Promise<number> {
  const { data: toArchive } = await client
    .from("products")
    .select("id, external_id")
    .eq("external_source", EXTERNAL_SOURCE)
    .not("status", "eq", "archived");

  const rows = ((toArchive ?? []) as Array<{ id: string; external_id: string }>).filter(
    (row) => !seenExternalIds.includes(row.external_id),
  );

  for (const row of rows) {
    await client.from("products").update({ status: "archived" }).eq("id", row.id);
    await recordRunItem(client, runId, row.external_id, row.id, "archived", null);
  }

  return rows.length;
}

export async function runSync(
  adminClient: SyncClient,
  adapter: ShopSourceAdapter,
  settings: ShopSyncSettings,
  trigger: "scheduled" | "manual",
): Promise<ShopSyncRun> {
  const { data: runRow } = await adminClient
    .from("shop_sync_runs")
    .insert({ settings_id: settings.id, status: "running", trigger })
    .select("id")
    .single();
  const runId = runRow.id as string;

  try {
    const scraped = await adapter.fetchShop(settings.sourceUrl);

    let created = 0;
    let updated = 0;
    let errored = 0;
    let archived = 0;

    if (settings.targetCatalog) {
      const seenExternalIds: string[] = [];
      for (const item of scraped.items) {
        seenExternalIds.push(item.externalId);
        const outcome = await syncItem(adminClient, runId, item);
        if (outcome === "created") created++;
        else if (outcome === "updated") updated++;
        else errored++;
      }
      archived = await archiveMissingProducts(adminClient, runId, seenExternalIds);
    }

    await adminClient
      .from("shop_sync_runs")
      .update({
        status: "success",
        items_created: created,
        items_updated: updated,
        items_archived: archived,
        items_errored: errored,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      id: runId,
      settingsId: settings.id,
      status: "success",
      trigger,
      itemsCreated: created,
      itemsUpdated: updated,
      itemsArchived: archived,
      itemsErrored: errored,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await adminClient
      .from("shop_sync_runs")
      .update({ status: "failed", error_message: message, finished_at: new Date().toISOString() })
      .eq("id", runId);

    return {
      id: runId,
      settingsId: settings.id,
      status: "failed",
      trigger,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsArchived: 0,
      itemsErrored: 0,
      errorMessage: message,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }
}
