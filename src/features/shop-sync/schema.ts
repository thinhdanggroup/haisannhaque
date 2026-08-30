import cron from "node-cron";
import { z } from "zod";

export const shopSyncSettingsSchema = z.object({
  sourceUrl: z.string().url("sourceUrl must be a valid URL"),
  enabled: z.boolean(),
  // An unparseable expression would make cron.schedule() throw at server
  // boot, so reject it at the form boundary instead of persisting it.
  cronExpression: z
    .string()
    .min(1, "cronExpression is required")
    .refine((value) => cron.validate(value), {
      message: "cronExpression must be a valid cron expression",
    }),
  targetCatalog: z.boolean(),
  targetShopInfo: z.boolean(),
});

export type ShopSyncSettingsFormData = z.infer<typeof shopSyncSettingsSchema>;

export type ShopSyncSettingsFormResult =
  | { success: true; data: ShopSyncSettingsFormData }
  | { success: false; error: string };

export function parseShopSyncSettingsForm(formData: FormData): ShopSyncSettingsFormResult {
  const raw = {
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    enabled: formData.get("enabled") === "on",
    cronExpression: String(formData.get("cronExpression") ?? ""),
    targetCatalog: formData.get("targetCatalog") === "on",
    targetShopInfo: formData.get("targetShopInfo") === "on",
  };

  const parsed = shopSyncSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return { success: true, data: parsed.data };
}
