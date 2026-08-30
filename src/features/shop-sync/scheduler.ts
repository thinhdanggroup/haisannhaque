import cron from "node-cron";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { getShopSyncSettings } from "./queries";
import { runSync } from "./sync-service";
import { ShopeefoodAdapter } from "./adapters/shopeefood-adapter";

export async function startShopSyncScheduler(): Promise<void> {
  const adminClient = createAdminClient();
  const settings = await getShopSyncSettings(adminClient);

  if (!settings || !settings.enabled) return;

  let runInFlight = false;

  cron.schedule(settings.cronExpression, async () => {
    if (runInFlight) return;
    runInFlight = true;
    try {
      await runSync(adminClient, new ShopeefoodAdapter(), settings, "scheduled");
    } finally {
      runInFlight = false;
    }
  });
}
