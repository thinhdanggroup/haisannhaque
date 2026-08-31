import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadAndStoreImage } from "./image-store";
import type { StorageLikeClient } from "./image-store";
import type { ScrapedShopInfo, ScrapedShopItem } from "./adapters/types";
import type { ShopSourceAdapter } from "./adapters/types";
import type { ShopSyncRun, ShopSyncSettings } from "./types";

// Minimal shape this service needs from the Supabase admin client — kept
// narrow so tests can supply a lightweight fake.
type SyncClient = Pick<SupabaseClient, "from" | "rpc"> & { storage: StorageLikeClient["storage"] };

const EXTERNAL_SOURCE = "shopeefood";
const INVENTORY_WAREHOUSE_CODE = "HCM-01";
const SYNCED_STOCK_QUANTITY = 50;

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
  const { error } = await client.from("shop_sync_run_items").insert({
    run_id: runId,
    external_id: externalId,
    product_id: productId,
    action,
    message,
  });
  // This function *is* the audit-trail writer, so it must not throw: doing so
  // would mask the original error that triggered the call. Surface it in the
  // server logs instead.
  if (error) {
    console.error(`[shop-sync] failed to record run item (${action}, ${externalId}):`, error.message);
  }
}

// Falls back for a ShopeeFood category with no admin-provided mapping yet
// (see resolveCategoryId below): find-or-create a shopeefood-tagged
// placeholder category so nothing is left uncategorized. It shows up in
// /admin/shop-sync/categories for an admin to map onto a real category.
async function findOrCreatePlaceholderCategory(client: SyncClient, categoryName: string): Promise<string> {
  // Exact match, not .ilike(): ilike treats the name as a LIKE pattern, so a
  // category like "Combo giảm 20%" would match the wrong rows (or several,
  // which makes .maybeSingle() error). A swallowed error here would fall
  // through to the create branch below and mint a fresh duplicate category
  // — with a random-suffixed slug that can never collide — on every run.
  const { data: existing, error: lookupError } = await client
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`Failed to look up category "${categoryName}": ${lookupError.message}`);
  }
  const existingCategory = existing as { id: string } | null;
  if (existingCategory) return existingCategory.id;

  const { data: created, error } = await client
    .from("categories")
    .insert({
      name: categoryName,
      slug: makeSlug(categoryName, Math.random().toString(36).slice(2, 8)),
      is_active: true,
      sort_order: 0,
      external_source: EXTERNAL_SOURCE,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create category "${categoryName}": ${error.message}`);
  return (created as { id: string }).id;
}

// Resolves a ShopeeFood category name to a real site category id if an admin
// has already mapped it (see /admin/shop-sync/categories); otherwise falls
// back to a placeholder category rather than leaving the product unlinked.
async function resolveCategoryId(client: SyncClient, categoryName: string | null): Promise<string | null> {
  if (!categoryName) return null;

  const { data: mapping, error: mappingError } = await client
    .from("shop_sync_category_mappings")
    .select("category_id")
    .eq("external_source", EXTERNAL_SOURCE)
    .eq("external_category_name", categoryName)
    .maybeSingle();
  if (mappingError) {
    throw new Error(`Failed to look up category mapping for "${categoryName}": ${mappingError.message}`);
  }
  const mappingRow = mapping as { category_id: string } | null;
  if (mappingRow) return mappingRow.category_id;

  return findOrCreatePlaceholderCategory(client, categoryName);
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
  const existingImageRow = existingImage as { id: string } | null;

  if (existingImageRow) {
    const { error } = await client.from("product_images").update({ url: hostedUrl }).eq("id", existingImageRow.id);
    if (error) throw new Error(`Failed to update product image: ${error.message}`);
  } else {
    const { error } = await client
      .from("product_images")
      .insert({ product_id: productId, url: hostedUrl, sort_order: 0 });
    if (error) throw new Error(`Failed to create product image: ${error.message}`);
  }
}

async function upsertVariant(client: SyncClient, productId: string, item: ScrapedShopItem): Promise<string> {
  const { data: existingVariant } = await client
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();
  const existingVariantRow = existingVariant as { id: string } | null;

  const variantFields = {
    list_price: item.priceVnd,
    is_active: item.isAvailable,
  };

  if (existingVariantRow) {
    const { error } = await client
      .from("product_variants")
      .update(variantFields)
      .eq("id", existingVariantRow.id);
    if (error) throw new Error(`Failed to update product variant: ${error.message}`);
    return existingVariantRow.id;
  }

  const { data: createdVariant, error } = await client
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `${EXTERNAL_SOURCE}-${item.externalId}`,
      unit: "phần",
      is_weighable: false,
      ...variantFields,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create product variant: ${error.message}`);
  return (createdVariant as { id: string }).id;
}

// ShopeeFood only tells us a dish is available or not — never a real
// quantity — so synced stock converges to a flat target (SYNCED_STOCK_QUANTITY
// when available, 0 when not) rather than accumulating deltas every run.
// Real orders then decrement it normally through the existing inventory
// system. Inventory is an enhancement on top of the sync, not core to it: a
// missing warehouse skips convergence rather than failing the whole item.
async function convergeStock(client: SyncClient, variantId: string, isAvailable: boolean): Promise<void> {
  const { data: warehouse, error: warehouseError } = await client
    .from("warehouses")
    .select("id")
    .eq("code", INVENTORY_WAREHOUSE_CODE)
    .maybeSingle();
  if (warehouseError) {
    throw new Error(`Failed to look up warehouse "${INVENTORY_WAREHOUSE_CODE}": ${warehouseError.message}`);
  }
  const warehouseRow = warehouse as { id: string } | null;
  if (!warehouseRow) return;

  const { data: currentStock, error: stockError } = await client.rpc("calculate_available_stock", {
    input_variant_id: variantId,
    input_warehouse_id: warehouseRow.id,
  });
  if (stockError) {
    throw new Error(`Failed to read current stock for variant ${variantId}: ${stockError.message}`);
  }

  const target = isAvailable ? SYNCED_STOCK_QUANTITY : 0;
  const delta = target - Number(currentStock ?? 0);
  if (delta === 0) return;

  const { error: ledgerError } = await client.from("stock_ledger_entries").insert({
    variant_id: variantId,
    warehouse_id: warehouseRow.id,
    movement_type: "adjustment",
    quantity_delta: delta,
    source_doc_type: "shop_sync",
  });
  if (ledgerError) {
    throw new Error(`Failed to adjust stock for variant ${variantId}: ${ledgerError.message}`);
  }
}

async function syncItem(
  client: SyncClient,
  runId: string,
  item: ScrapedShopItem,
): Promise<"created" | "updated" | "error"> {
  try {
    const categoryId = await resolveCategoryId(client, item.categoryName);

    const { data: existingProduct } = await client
      .from("products")
      .select("id, external_image_source_url")
      .eq("external_source", EXTERNAL_SOURCE)
      .eq("external_id", item.externalId)
      .maybeSingle();
    const existingProductRow = existingProduct as { id: string; external_image_source_url: string | null } | null;

    const status = item.isAvailable ? "published" : "draft";
    let productId: string;
    let action: "created" | "updated";

    if (existingProductRow) {
      productId = existingProductRow.id;
      action = "updated";
      // external_image_source_url is deliberately NOT written here — see the
      // follow-up update after upsertProductImage below.
      const { error } = await client
        .from("products")
        .update({
          name: item.name,
          short_description: item.description,
          description: item.description,
          status,
        })
        .eq("id", productId);
      if (error) throw new Error(`Failed to update product: ${error.message}`);
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
        })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create product: ${error.message}`);
      productId = (created as { id: string }).id;
    }

    const variantId = await upsertVariant(client, productId, item);
    await convergeStock(client, variantId, item.isAvailable);
    await upsertProductImage(
      client,
      productId,
      item.imageUrl,
      existingProductRow?.external_image_source_url ?? null,
    );

    // Only record the source URL once the image actually downloaded and
    // stored. Writing it as part of the insert/update above would make a
    // failed download look "already synced" on the next run (the guard in
    // upsertProductImage compares against this column), permanently skipping
    // the retry.
    if (item.imageUrl) {
      const { error: imageSourceError } = await client
        .from("products")
        .update({ external_image_source_url: item.imageUrl })
        .eq("id", productId);
      if (imageSourceError) {
        throw new Error(`Failed to record product image source URL: ${imageSourceError.message}`);
      }
    }

    if (categoryId) {
      const { error: categoryLinkError } = await client
        .from("product_categories")
        .upsert(
          { product_id: productId, category_id: categoryId },
          { onConflict: "product_id,category_id", ignoreDuplicates: true },
        );
      if (categoryLinkError) {
        throw new Error(`Failed to link product to category: ${categoryLinkError.message}`);
      }
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

  let archived = 0;
  for (const row of rows) {
    const { error } = await client.from("products").update({ status: "archived" }).eq("id", row.id);
    if (error) {
      await recordRunItem(
        client,
        runId,
        row.external_id,
        row.id,
        "error",
        `Failed to archive product: ${error.message}`,
      );
      continue;
    }
    await recordRunItem(client, runId, row.external_id, row.id, "archived", null);
    archived++;
  }

  return archived;
}

async function syncShopProfile(client: SyncClient, shopInfo: ScrapedShopInfo): Promise<void> {
  const { data } = await client
    .from("shop_profile")
    .select("id, logo_source_url, cover_image_source_url")
    .eq("source", EXTERNAL_SOURCE)
    .maybeSingle();
  const existing = data as { id: string; logo_source_url: string | null; cover_image_source_url: string | null } | null;

  const logoUrl =
    shopInfo.logoUrl && shopInfo.logoUrl !== existing?.logo_source_url
      ? await downloadAndStoreImage(client, shopInfo.logoUrl, "shop-sync/shop-profile/logo")
      : undefined;
  const coverImageUrl =
    shopInfo.coverImageUrl && shopInfo.coverImageUrl !== existing?.cover_image_source_url
      ? await downloadAndStoreImage(client, shopInfo.coverImageUrl, "shop-sync/shop-profile/cover")
      : undefined;

  const fields = {
    source: EXTERNAL_SOURCE,
    name: shopInfo.name,
    description: shopInfo.description,
    address: shopInfo.address,
    opening_hours: shopInfo.openingHours,
    updated_at: new Date().toISOString(),
    ...(logoUrl ? { logo_url: logoUrl, logo_source_url: shopInfo.logoUrl } : {}),
    ...(coverImageUrl ? { cover_image_url: coverImageUrl, cover_image_source_url: shopInfo.coverImageUrl } : {}),
  };

  if (existing) {
    await client.from("shop_profile").update(fields).eq("id", existing.id);
  } else {
    await client.from("shop_profile").insert(fields);
  }
}

export async function runSync(
  adminClient: SyncClient,
  adapter: ShopSourceAdapter,
  settings: ShopSyncSettings,
  trigger: "scheduled" | "manual",
): Promise<ShopSyncRun> {
  const { data: runRow, error: runInsertError } = await adminClient
    .from("shop_sync_runs")
    .insert({ settings_id: settings.id, status: "running", trigger })
    .select("id")
    .single();
  // This runs before the try block below, so an unchecked cast on a null row
  // would escape as a bare TypeError. Fail with a real message instead.
  if (runInsertError || !runRow) {
    throw new Error(
      `Failed to create shop_sync_runs row: ${runInsertError?.message ?? "no row returned"}`,
    );
  }
  const runId = (runRow as { id: string }).id;

  try {
    const scraped = await adapter.fetchShop(settings.sourceUrl);

    let created = 0;
    let updated = 0;
    let errored = 0;
    let archived = 0;

    if (settings.targetShopInfo) {
      await syncShopProfile(adminClient, scraped.shopInfo);
    }

    if (settings.targetCatalog) {
      const seenExternalIds: string[] = [];
      for (const item of scraped.items) {
        seenExternalIds.push(item.externalId);
        const outcome = await syncItem(adminClient, runId, item);
        if (outcome === "created") created++;
        else if (outcome === "updated") updated++;
        else errored++;
      }

      // A scrape that returns nothing (malformed-but-200 response, shop
      // marked closed) would otherwise archive the entire synced catalog in
      // one run and still be recorded as a success.
      if (scraped.items.length > 0) {
        archived = await archiveMissingProducts(adminClient, runId, seenExternalIds);
      } else {
        await recordRunItem(
          adminClient,
          runId,
          "n/a",
          null,
          "skipped",
          "Scrape returned zero items; skipped archiving to avoid wiping the catalog on a bad/empty response.",
        );
      }
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
