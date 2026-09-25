#!/usr/bin/env node
// Read-only post-deploy smoke test for the live storefront.
// Visits public pages at desktop and mobile width, fails on HTTP errors,
// page crashes, console errors, or a missing header/footer. Never submits
// a form or adds to cart: production data is real.
//
// Usage: node scripts/smoke-prod.mjs [baseUrl]   (default https://haisannhaque.com)
// Screenshots land in $SMOKE_OUT_DIR (default ./.smoke-prod).

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = (process.argv[2] ?? "https://haisannhaque.com").replace(/\/$/, "");
const outDir = process.env.SMOKE_OUT_DIR ?? ".smoke-prod";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function discoverPaths(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const hrefs = await page.$$eval("a[href]", (links) => links.map((a) => a.getAttribute("href")));
  const first = (prefix) => hrefs.find((href) => href?.startsWith(prefix));

  return ["/", first("/categories/"), first("/products/"), "/search?q=cua", "/cart"].filter(
    Boolean,
  );
}

async function checkPage(page, path, viewport) {
  const problems = [];
  const consoleErrors = [];
  const onConsole = (msg) => msg.type() === "error" && consoleErrors.push(msg.text());
  const onPageError = (err) => problems.push(`page error: ${err.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  if (status >= 400 || status === 0) problems.push(`HTTP ${status}`);

  if ((await page.locator("header").count()) === 0) problems.push("no <header>");
  if ((await page.locator("footer").count()) === 0) problems.push("no <footer>");

  const brokenImages = await page.$$eval("img", (imgs) =>
    imgs
      .filter((img) => img.complete && img.naturalWidth === 0 && img.loading !== "lazy")
      .map((img) => img.currentSrc || img.src),
  );
  if (brokenImages.length > 0) problems.push(`broken images: ${brokenImages.join(", ")}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) problems.push(`horizontal overflow ${overflow}px`);

  for (const text of consoleErrors) problems.push(`console error: ${text}`);

  const slug = path === "/" ? "home" : path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: `${outDir}/${viewport.name}-${slug}.png` });

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return { status, problems };
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const paths = await discoverPaths(page);

    for (const path of paths) {
      const { status, problems } = await checkPage(page, path, viewport);
      const ok = problems.length === 0;
      if (!ok) failures += 1;
      console.log(`${ok ? "PASS" : "FAIL"} [${viewport.name}] ${path} (${status})`);
      for (const problem of problems) console.log(`     - ${problem}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? "All checks passed" : `${failures} page(s) failed`}. Screenshots: ${outDir}/`);
process.exit(failures === 0 ? 0 : 1);
