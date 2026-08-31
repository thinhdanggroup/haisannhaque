"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

// Form `action` props require a `(formData: FormData) => void | Promise<void>`
// shape; triggerShopSyncNow() returns a result for programmatic callers, so
// this thin wrapper adapts it for direct use as a <form action={...}> value
// (e.g. the "Chạy ngay" button on the shop sync admin page).
export async function triggerShopSyncNowAction(): Promise<void> {
  await triggerShopSyncNow();
}

export async function triggerShopSyncNow(): Promise<ShopSyncTriggerResult> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const settings = await getShopSyncSettings(client);
  if (!settings) {
    return { error: "Shop sync is not configured yet — save settings first." };
  }

  const adminClient = createAdminClient();
  const run = await runSync(adminClient, new ShopeefoodAdapter(), settings, "manual");

  revalidatePath("/admin/shop-sync");
  return { runId: run.id };
}

export type ShopSyncCategoryMappingState = { error: string } | null;

// Points a ShopeeFood category (currently a shopeefood-tagged placeholder
// category, since sync-service.ts falls back to creating one when no
// mapping exists yet) at one of the site's real categories: saves the
// mapping (keyed by category NAME, matching how sync-service.ts resolves
// it), re-links every product currently on the placeholder over to the real
// category, then deactivates the now-empty placeholder rather than deleting
// it (avoids FK surprises if anything still references it).
export async function mapShopSyncCategory(
  _prev: ShopSyncCategoryMappingState,
  formData: FormData,
): Promise<ShopSyncCategoryMappingState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "shop_sync:manage");

  const placeholderCategoryId = z.string().uuid().safeParse(formData.get("placeholderCategoryId"));
  const targetCategoryId = z.string().uuid().safeParse(formData.get("targetCategoryId"));
  if (!placeholderCategoryId.success || !targetCategoryId.success) {
    return { error: "Invalid category selection." };
  }

  const { data: placeholder, error: placeholderError } = await client
    .from("categories")
    .select("name")
    .eq("id", placeholderCategoryId.data)
    .single();
  if (placeholderError || !placeholder) {
    return { error: "Category to map not found." };
  }

  const { error: mappingError } = await client.from("shop_sync_category_mappings").upsert(
    {
      external_source: SOURCE,
      external_category_name: (placeholder as { name: string }).name,
      category_id: targetCategoryId.data,
    },
    { onConflict: "external_source,external_category_name" },
  );
  if (mappingError) return { error: mappingError.message };

  const { error: relinkError } = await client
    .from("product_categories")
    .update({ category_id: targetCategoryId.data })
    .eq("category_id", placeholderCategoryId.data);
  if (relinkError) return { error: relinkError.message };

  const { error: deactivateError } = await client
    .from("categories")
    .update({ is_active: false })
    .eq("id", placeholderCategoryId.data);
  if (deactivateError) return { error: deactivateError.message };

  revalidatePath("/admin/shop-sync/categories");
  return null;
}
