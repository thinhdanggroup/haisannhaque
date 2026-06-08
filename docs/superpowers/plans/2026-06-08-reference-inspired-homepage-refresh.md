# Reference-Inspired Homepage Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When spawning subagents, always request model `gpt-5.5` with reasoning effort `xhigh`.

**Goal:** Refresh the full public homepage so it matches the approved reference-inspired, CMS-driven seafood commerce design from header through footer.

**Architecture:** Keep `app/(storefront)/page.tsx` as the CMS section dispatcher. Add missing section renderers for recommendation tabs, content highlights, and partner strip; refresh existing storefront components for a brighter cyan/orange dense storefront style; update Playwright fixtures and seed data with non-proprietary generated/placeholder imagery and full-homepage content.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript strict mode, Tailwind CSS 4, Supabase/PostgreSQL CMS rows, Vitest, Playwright, lucide-react.

---

## Source Documents

- Project guide: `AGENTS.md`
- Approved design spec: `docs/superpowers/specs/2026-06-08-reference-inspired-homepage-refresh-design.md`
- Visual reference: `docs/references/daohaisan-vn.pdf`
- Existing homepage: `app/(storefront)/page.tsx`
- CMS types and fixture data: `src/features/cms/types.ts`, `src/features/cms/playwright-fixtures.ts`
- Local demo seed: `supabase/seed.sql`

## Current Branch Constraint

The user explicitly requested implementation on the current `main` branch, without creating a git worktree. Do not revert or stage unrelated changes. `next-env.d.ts` is currently modified before this work and should remain untouched unless it directly blocks verification.

## File Structure

Modify:

- `app/(storefront)/page.tsx`
- `components/storefront/storefront-header.tsx`
- `components/storefront/category-nav.tsx`
- `components/storefront/category-sidebar.tsx`
- `components/storefront/category-shortcut-strip.tsx`
- `components/storefront/hero-merchandising-grid.tsx`
- `components/storefront/service-strip.tsx`
- `components/storefront/promo-band.tsx`
- `components/storefront/product-rail.tsx`
- `components/storefront/product-grid.tsx`
- `components/storefront/product-card.tsx`
- `components/storefront/storefront-footer.tsx`
- `src/features/cms/playwright-fixtures.ts`
- `supabase/seed.sql`
- `tests/e2e/storefront-checkout.spec.ts`

Create:

- `components/storefront/recommendation-tabs.tsx`
- `components/storefront/content-highlights.tsx`
- `components/storefront/partner-strip.tsx`

Avoid schema migrations unless implementation discovers a concrete blocker.

---

### Task 1: Add Homepage Acceptance Coverage

**Files:**
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Add failing assertions for the approved full-homepage sections**

Update the homepage smoke test to assert:

```ts
await expect(
  page.getByRole("heading", { name: "Chợ hải sản hôm nay" }),
).toBeVisible();
await expect(page.getByRole("contentinfo")).toBeVisible();

const productCards = page.getByTestId("homepage-product-card");
await expect.poll(() => productCards.count()).toBeGreaterThanOrEqual(24);

await expect(page.getByText("Gợi ý cho bạn")).toBeVisible();
await expect(page.getByText("Thông tin hữu ích")).toBeVisible();
await expect(page.getByText("Đối tác Dao Seafood")).toBeVisible();
await expect(page.getByText("Thông tin công ty")).toBeVisible();
```

Keep the existing desktop sidebar assertions and screenshot capture.

- [ ] **Step 2: Run the targeted E2E test and confirm RED**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected before implementation: FAIL because the new homepage sections are not rendered yet.

---

### Task 2: Expand CMS Fixture And Seed Content

**Files:**
- Modify: `src/features/cms/playwright-fixtures.ts`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Expand deterministic Playwright fixture content**

Add enough fixture content to render the full approved homepage:

- Hero collage banners with varied cyan/orange/seafood placeholder URLs.
- At least 12 navigation/category items.
- At least 24 product cards across product rails.
- Flash-sale metadata with sale badge, countdown label, and countdown items.
- `recommendation_tabs` section with tab metadata and products.
- `content_highlights` section with policy/news/useful-info metadata.
- `partner_strip` section metadata or brand assets for partners, payment, social, and trust.
- Footer links and brand assets with generic non-proprietary placeholders.

Use Vietnamese user-facing copy and placeholder URLs that make screenshots readable, such as `https://placehold.co/...?...`.

- [ ] **Step 2: Update local demo seed data to match fixture shape**

Update `supabase/seed.sql` so local seeded CMS rows include the same section rhythm:

1. `hero`
2. `service-strip` or `category-shortcuts`
3. `best-sellers`
4. `flash-sale`
5. `budget-promo`
6. `recommendations`
7. `sashimi`
8. `frozen-seafood`
9. `shellfish`
10. `crab-lobster`
11. `ready-to-eat`
12. `content-highlights`
13. `partners`

Ensure seeded banners and brand assets remain generated/placeholder assets and do not reference daohaisan.vn.

- [ ] **Step 3: Run fixture/unit checks**

Run:

```bash
pnpm test src/features/cms/queries.test.ts
```

Expected: PASS. If fixture type errors are only caught by lint/build, continue to Task 6 and fix there.

---

### Task 3: Add Missing CMS Section Renderers

**Files:**
- Modify: `app/(storefront)/page.tsx`
- Create: `components/storefront/recommendation-tabs.tsx`
- Create: `components/storefront/content-highlights.tsx`
- Create: `components/storefront/partner-strip.tsx`

- [ ] **Step 1: Implement `RecommendationTabs`**

Create a server-renderable component that:

- Accepts `section: CmsSection`.
- Reads tab labels from `section.metadata.tabs` when valid.
- Falls back to simple tabs from section title or known categories.
- Shows tab buttons as non-interactive visual filters if no client state is added.
- Renders `ProductGrid` with `density="dense"` using `section.products`.
- Includes a `Xem thêm` link when `metadata.viewMoreHref` is a string.

- [ ] **Step 2: Implement `ContentHighlights`**

Create a component that:

- Accepts `section: CmsSection`.
- Reads highlight cards from metadata with typed runtime guards.
- Supports title, description, href, imageUrl, and group label.
- Renders a larger lead card plus smaller side cards on desktop.
- Stacks cleanly on mobile.
- Returns `null` if no valid cards exist.

- [ ] **Step 3: Implement `PartnerStrip`**

Create a component that:

- Accepts `section: CmsSection`.
- Reads grouped assets from metadata or uses `section.banners` as visual logo placeholders.
- Supports partners, payments, social, and trust group labels.
- Renders compact logo pills or image tiles without copying proprietary assets.
- Returns `null` when no data exists.

- [ ] **Step 4: Register the section types**

Update `renderHomeSection` in `app/(storefront)/page.tsx`:

```ts
case "recommendation_tabs":
  return <RecommendationTabs key={section.id} section={section} />;
case "content_highlights":
  return <ContentHighlights key={section.id} section={section} />;
case "partner_strip":
  return <PartnerStrip key={section.id} section={section} />;
```

- [ ] **Step 5: Run targeted checks**

Run:

```bash
pnpm lint
```

Expected: PASS or only pre-existing unrelated warnings. Fix TypeScript/ESLint issues from this task before continuing.

---

### Task 4: Refresh Header, Hero, Sidebar, And Promo Rhythm

**Files:**
- Modify: `components/storefront/storefront-header.tsx`
- Modify: `components/storefront/category-nav.tsx`
- Modify: `components/storefront/category-sidebar.tsx`
- Modify: `components/storefront/category-shortcut-strip.tsx`
- Modify: `components/storefront/hero-merchandising-grid.tsx`
- Modify: `components/storefront/service-strip.tsx`
- Modify: `components/storefront/promo-band.tsx`

- [ ] **Step 1: Refresh the header stack**

Update `StorefrontHeader` to use:

- Bright cyan/sky top campaign bar.
- Main logo/search/hotline/account/cart row.
- Orange search submit button.
- Cyan/orange category nav row.
- Stable mobile layout with no overlapping text.

- [ ] **Step 2: Refresh category navigation and sidebar**

Update `CategoryNav` and `CategorySidebar` so desktop resembles the reference:

- Sidebar title row with menu icon and cyan background.
- Compact category rows with icons.
- Horizontal nav row with action-like category chips.

- [ ] **Step 3: Refresh hero collage and campaign bands**

Update `HeroMerchandisingGrid` and `PromoBand`:

- Reduce overlay darkness so generated product imagery remains visible.
- Use compact section spacing.
- Support one large banner plus multiple side/secondary banners.
- Make promo bands full-width, image-led, and visually varied.

- [ ] **Step 4: Refresh service/category shortcut density**

Keep service and category shortcut blocks compact:

- 3 to 6 columns depending viewport.
- Small icons and labels.
- Fine borders and bright hover states.

- [ ] **Step 5: Run targeted visual smoke**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts --project=chromium
```

Expected: new homepage assertions should be closer to passing. Fix obvious layout or locator failures from this task before continuing.

---

### Task 5: Refresh Product Shelves And Footer Areas

**Files:**
- Modify: `components/storefront/product-rail.tsx`
- Modify: `components/storefront/product-grid.tsx`
- Modify: `components/storefront/product-card.tsx`
- Modify: `components/storefront/storefront-footer.tsx`
- Modify: `components/storefront/partner-strip.tsx`
- Modify: `components/storefront/content-highlights.tsx`

- [ ] **Step 1: Tighten product rail headers**

Update `ProductRail` so each rail has:

- Compact white section surface.
- Title/subtitle on the left.
- `Xem thêm` on the right.
- Flash-sale badge and countdown as compact pills.

- [ ] **Step 2: Tighten product grid and card styling**

Update `ProductGrid` and `ProductCard`:

- Keep 5 columns on desktop for dense grids.
- Preserve 2 columns on mobile.
- Make cards image-led with compact padding.
- Keep red price, compare-at price, unit, sold label, discount/status ribbons, and orange add/options button.
- Avoid text overlap at 320px and 390px widths.

- [ ] **Step 3: Refresh content highlights and partner strip styling**

Polish `ContentHighlights` and `PartnerStrip` so they match the near-footer reference rhythm:

- Content highlights should include a lead campaign/news card and smaller policy/useful-info cards.
- Partner strip should group partner, payment, social, and trust badges without proprietary logos.

- [ ] **Step 4: Refresh footer**

Update `StorefrontFooter`:

- Use a white or light footer link area for partner/payment/social/trust groups when appropriate.
- Add a gray company-information band with heading `Thông tin công ty`.
- Keep mobile bottom padding for the dock.
- Preserve fallback footer behavior when CMS data is sparse.

- [ ] **Step 5: Run responsive homepage smoke**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts --project=chromium
```

Expected: PASS for homepage-related assertions. Fix locator and responsive failures before continuing.

---

### Task 6: Final Verification, Review, And Commit

**Files:**
- Review all modified implementation files.

- [ ] **Step 1: Inspect working tree carefully**

Run:

```bash
git status --short
git diff --stat
```

Confirm `next-env.d.ts` is not staged if it remains unrelated.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test
```

Expected: all commands exit 0. If a command fails, fix the issue and re-run the failing command until it exits 0.

- [ ] **Step 3: Review against the design spec**

Check the implementation against:

- `docs/superpowers/specs/2026-06-08-reference-inspired-homepage-refresh-design.md`

Verify every success criterion is represented in code or tests.

- [ ] **Step 4: Commit implementation on current `main` branch**

Stage only files related to this homepage refresh. Do not stage unrelated `next-env.d.ts` unless it is intentionally part of the implementation.

Run:

```bash
git add app/(storefront)/page.tsx components/storefront src/features/cms/playwright-fixtures.ts supabase/seed.sql tests/e2e/storefront-checkout.spec.ts docs/superpowers/plans/2026-06-08-reference-inspired-homepage-refresh.md
git commit -m "feat: refresh storefront homepage"
```

If the shell needs escaped parentheses, quote the path:

```bash
git add 'app/(storefront)/page.tsx'
```
