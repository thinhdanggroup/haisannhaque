"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { parseShopSyncSettingsForm } from "./schema";
import { getShopSyncSettings } from "./queries";
import { runSync } from "./sync-service";
import { ShopeefoodAdapter } from "./adapters/shopeefood-adapter";

export type ShopSyncSettingsState = { error: string } | null;
export type ShopSyncTriggerResult = { error: string } | { runId: string };

const SOURCE = "shopeefood";

export async function updateShopSyncSettings(
  _prev: ShopSyncSettingsState,
  formData: FormData,
): Promise<ShopSyncSettingsState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const parsed = parseShopSyncSettingsForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await client.from("shop_sync_settings").upsert(
    {
      source: SOURCE,
      source_url: parsed.data.sourceUrl,
      enabled: parsed.data.enabled,
      cron_expression: parsed.data.cronExpression,
      target_catalog: parsed.data.targetCatalog,
      target_shop_info: parsed.data.targetShopInfo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source" },
  );

  if (error) return { error: error.message };

  revalidatePath("/admin/shop-sync");
  return null;
}

export async function triggerShopSyncNow(): Promise<ShopSyncTriggerResult> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const settings = await getShopSyncSettings(client);
  if (!settings) {
    return { error: "Shop sync is not configured yet — save settings first." };
  }

  const adminClient = createAdminClient();
  // `runSync`'s internal SyncClient type is a narrow duck-typed shape built
  // for its own test fakes; the real Supabase client is structurally
  // compatible at runtime (it implements every chain method SyncClient
  // needs) but not identical, so bridge the two with a type-only cast.
  const run = await runSync(
    adminClient as unknown as Parameters<typeof runSync>[0],
    new ShopeefoodAdapter(),
    settings,
    "manual",
  );

  revalidatePath("/admin/shop-sync");
  return { runId: run.id };
}
