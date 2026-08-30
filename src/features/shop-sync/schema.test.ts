import { describe, expect, it } from "vitest";
import { parseShopSyncSettingsForm } from "./schema";

function buildForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("sourceUrl", overrides.sourceUrl ?? "https://shopeefood.vn/now-food/shop/1303714");
  fd.set("enabled", overrides.enabled ?? "on");
  fd.set("cronExpression", overrides.cronExpression ?? "0 3 * * *");
  fd.set("targetCatalog", overrides.targetCatalog ?? "on");
  fd.set("targetShopInfo", overrides.targetShopInfo ?? "on");
  return fd;
}

describe("parseShopSyncSettingsForm", () => {
  it("parses a valid form", () => {
    const result = parseShopSyncSettingsForm(buildForm());
    expect(result).toEqual({
      success: true,
      data: {
        sourceUrl: "https://shopeefood.vn/now-food/shop/1303714",
        enabled: true,
        cronExpression: "0 3 * * *",
        targetCatalog: true,
        targetShopInfo: true,
      },
    });
  });

  it("treats missing checkboxes as false", () => {
    const fd = buildForm();
    fd.delete("enabled");
    fd.delete("targetShopInfo");
    const result = parseShopSyncSettingsForm(fd);
    expect(result.success && result.data.enabled).toBe(false);
    expect(result.success && result.data.targetShopInfo).toBe(false);
  });

  it("rejects a non-URL sourceUrl", () => {
    const result = parseShopSyncSettingsForm(buildForm({ sourceUrl: "not-a-url" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("URL") });
  });

  it("rejects an empty cron expression", () => {
    const result = parseShopSyncSettingsForm(buildForm({ cronExpression: "" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("cron") });
  });
});
