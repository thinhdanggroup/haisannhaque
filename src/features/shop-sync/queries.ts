import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShopSyncRun, ShopSyncRunItem, ShopSyncSettings } from "./types";

type SettingsRow = {
  id: string;
  source: string;
  source_url: string;
  enabled: boolean;
  cron_expression: string;
  target_catalog: boolean;
  target_shop_info: boolean;
  updated_at: string;
};

type RunRow = {
  id: string;
  settings_id: string;
  status: "running" | "success" | "failed";
  trigger: "scheduled" | "manual";
  items_created: number;
  items_updated: number;
  items_archived: number;
  items_errored: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

type RunItemRow = {
  id: string;
  run_id: string;
  external_id: string;
  product_id: string | null;
  action: ShopSyncRunItem["action"];
  message: string | null;
};

function mapSettings(row: SettingsRow): ShopSyncSettings {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    enabled: row.enabled,
    cronExpression: row.cron_expression,
    targetCatalog: row.target_catalog,
    targetShopInfo: row.target_shop_info,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow): ShopSyncRun {
  return {
    id: row.id,
    settingsId: row.settings_id,
    status: row.status,
    trigger: row.trigger,
    itemsCreated: row.items_created,
    itemsUpdated: row.items_updated,
    itemsArchived: row.items_archived,
    itemsErrored: row.items_errored,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function mapRunItem(row: RunItemRow): ShopSyncRunItem {
  return {
    id: row.id,
    runId: row.run_id,
    externalId: row.external_id,
    productId: row.product_id,
    action: row.action,
    message: row.message,
  };
}

export async function getShopSyncSettings(
  client: Pick<SupabaseClient, "from">,
): Promise<ShopSyncSettings | null> {
  const { data, error } = await client
    .from("shop_sync_settings")
    .select("id, source, source_url, enabled, cron_expression, target_catalog, target_shop_info, updated_at")
    .maybeSingle();

  if (error) throw error;
  return data ? mapSettings(data as SettingsRow) : null;
}

export async function listShopSyncRuns(
  client: Pick<SupabaseClient, "from">,
  limit = 20,
): Promise<ShopSyncRun[]> {
  const { data, error } = await client
    .from("shop_sync_runs")
    .select(
      "id, settings_id, status, trigger, items_created, items_updated, items_archived, items_errored, error_message, started_at, finished_at",
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as RunRow[]).map(mapRun);
}

export async function getShopSyncRunWithItems(
  client: Pick<SupabaseClient, "from">,
  runId: string,
): Promise<{ run: ShopSyncRun; items: ShopSyncRunItem[] } | null> {
  const { data: runRow, error: runError } = await client
    .from("shop_sync_runs")
    .select(
      "id, settings_id, status, trigger, items_created, items_updated, items_archived, items_errored, error_message, started_at, finished_at",
    )
    .eq("id", runId)
    .maybeSingle();

  if (runError) throw runError;
  if (!runRow) return null;

  const { data: itemRows, error: itemsError } = await client
    .from("shop_sync_run_items")
    .select("id, run_id, external_id, product_id, action, message")
    .eq("run_id", runId);

  if (itemsError) throw itemsError;

  return {
    run: mapRun(runRow as RunRow),
    items: ((itemRows ?? []) as RunItemRow[]).map(mapRunItem),
  };
}
