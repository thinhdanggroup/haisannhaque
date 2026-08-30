import cron from "node-cron";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { getShopSyncSettings } from "./queries";
import { runSync } from "./sync-service";
import { ShopeefoodAdapter } from "./adapters/shopeefood-adapter";

export async function startShopSyncScheduler(): Promise<void> {
  const adminClient = createAdminClient();

  let settings;
  try {
    settings = await getShopSyncSettings(adminClient);
  } catch (error) {
    console.error("[shop-sync] failed to load settings at startup; scheduler not started:", error);
    return;
  }

  if (!settings || !settings.enabled) return;

  let runInFlight = false;

  try {
    cron.schedule(
      settings.cronExpression,
      async () => {
        if (runInFlight) return;
        runInFlight = true;
        try {
          const latestSettings = await getShopSyncSettings(adminClient);
          if (!latestSettings || !latestSettings.enabled) return;
          await runSync(adminClient, new ShopeefoodAdapter(), latestSettings, "scheduled");
        } catch (error) {
          // node-cron does not await the callback's promise, so an unhandled
          // rejection here would crash the Node process. Swallow and log.
          console.error("[shop-sync] scheduled run failed:", error);
        } finally {
          runInFlight = false;
        }
      },
      // Without an explicit timezone node-cron uses the container clock (UTC),
      // so "0 3 * * *" would fire at 10:00 Vietnam time.
      { timezone: "Asia/Ho_Chi_Minh" },
    );
  } catch (error) {
    console.error("[shop-sync] invalid cron expression, scheduler not started:", error);
  }
}
