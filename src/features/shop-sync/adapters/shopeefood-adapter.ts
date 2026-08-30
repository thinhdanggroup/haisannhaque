import { chromium, type Browser } from "playwright-core";
import type { ScrapedShop } from "./types";
import type { ShopSourceAdapter } from "./types";
import { mapToScrapedShop } from "./shopeefood-mapper";

const SHOP_DETAIL_PATTERN = /gappapi\.deliverynow\.vn\/api\/delivery\/get_detail/;
const DISHES_PATTERN = /gappapi\.deliverynow\.vn\/api\/dish\/get_delivery_dishes/;
const NAVIGATION_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export function resolveChromiumExecutablePath(): string {
  return process.env.SHOPEEFOOD_SYNC_CHROMIUM_PATH || "/usr/bin/chromium-browser";
}

export class ShopeefoodAdapter implements ShopSourceAdapter {
  async fetchShop(sourceUrl: string): Promise<ScrapedShop> {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: resolveChromiumExecutablePath(),
      });
      const context = await browser.newContext({ userAgent: USER_AGENT });
      const page = await context.newPage();

      const detailPromise = page.waitForResponse(
        (res) => SHOP_DETAIL_PATTERN.test(res.url()) && res.status() === 200,
        { timeout: NAVIGATION_TIMEOUT_MS },
      );
      const dishesPromise = page.waitForResponse(
        (res) => DISHES_PATTERN.test(res.url()) && res.status() === 200,
        { timeout: NAVIGATION_TIMEOUT_MS },
      );

      await page.goto(sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      const [detailResponse, dishesResponse] = await Promise.all([detailPromise, dishesPromise]);
      const [detailJson, dishesJson] = await Promise.all([
        detailResponse.json(),
        dishesResponse.json(),
      ]);

      return mapToScrapedShop(detailJson, dishesJson);
    } catch (error) {
      throw new Error(
        `ShopeeFood adapter failed to fetch ${sourceUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      await browser?.close();
    }
  }
}
