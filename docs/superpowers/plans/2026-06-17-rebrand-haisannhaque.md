# Rebrand to Hải Sản Nhà Quê Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all "Dao Seafood" / "Dao Hai San Commerce" brand strings with the real legal entity CÔNG TY TNHH HẢI SẢN NHÀ QUÊ and update company contact details throughout the application.

**Architecture:** Pure text/content swap across UI components, metadata, seed SQL, and test fixtures. No schema or logic changes needed. All changes are in application code, seed data, and tests.

**Tech Stack:** Next.js App Router (TypeScript), Supabase SQL seed, Playwright/Vitest tests.

## Global Constraints

- Short display name everywhere the brand appears: **Hải Sản Nhà Quê**
- Legal company name (footer company info section only): **CÔNG TY TNHH HẢI SẢN NHÀ QUÊ**
- Tax code: **0319442718**
- Address: **SAV.2-00.04 Tầng trệt, Tháp 2, Toà Nhà The Sun Avenue, 28 Mai Chí Thọ, P.Bình Trưng, TP.HCM, Việt Nam**
- Email placeholder: **care@haisannhaque.vn** (update to real address when available)
- Hotline: keep existing **1900 0098** until a new number is confirmed
- Do not change any logic, component structure, or CSS classes — only string content
- Do not rename files; these are text replacements only

---

## File Map

| File | Change |
|------|--------|
| `app/layout.tsx` | Metadata title |
| `app/login/page.tsx` | Metadata title |
| `app/(admin-auth)/admin/login/page.tsx` | Brand label in admin login card |
| `components/storefront/storefront-header.tsx` | Nav logo text |
| `components/storefront/storefront-footer.tsx` | Brand name (×2) + company info paragraph |
| `components/storefront/partner-strip.tsx` | Default fallback title |
| `supabase/seed.sql` | All brand strings in CMS/nav/asset seed rows + product origin field |
| `src/features/cms/playwright-fixtures.ts` | Three fixture strings matching seed data |
| `tests/e2e/storefront-checkout.spec.ts` | Two E2E assertions |

---

## Task 1: Root Metadata and Login Page Titles

**Files:**
- Modify: `app/layout.tsx:16`
- Modify: `app/login/page.tsx:5`

**Interfaces:**
- Produces: correct `<title>` tags served to the browser

- [ ] **Step 1: Update root layout metadata**

In `app/layout.tsx`, change:
```tsx
// Before
export const metadata: Metadata = {
  title: "Dao Hai San Commerce",
  description: "Next.js and Supabase seafood commerce platform",
};

// After
export const metadata: Metadata = {
  title: "Hải Sản Nhà Quê",
  description: "Nền tảng thương mại hải sản trực tuyến",
};
```

- [ ] **Step 2: Update login page title**

In `app/login/page.tsx`, change:
```tsx
// Before
export const metadata: Metadata = {
  title: "Đăng nhập – Dao Seafood",
};

// After
export const metadata: Metadata = {
  title: "Đăng nhập – Hải Sản Nhà Quê",
};
```

- [ ] **Step 3: Verify build compiles clean**

```bash
pnpm build 2>&1 | tail -20
```
Expected: no TypeScript or build errors.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/login/page.tsx
git commit -m "rebrand: update root and login page metadata to Hải Sản Nhà Quê"
```

---

## Task 2: Admin Login Brand Label

**Files:**
- Modify: `app/(admin-auth)/admin/login/page.tsx:14`

**Interfaces:**
- Produces: correct brand label in the admin login card header

- [ ] **Step 1: Update the admin login brand label**

In `app/(admin-auth)/admin/login/page.tsx`, change:
```tsx
// Before
<div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
  Dao Seafood
</div>

// After
<div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
  Hải Sản Nhà Quê
</div>
```

- [ ] **Step 2: Verify with lint**

```bash
pnpm lint app/\(admin-auth\)/admin/login/page.tsx
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(admin-auth)/admin/login/page.tsx"
git commit -m "rebrand: update admin login brand label"
```

---

## Task 3: Storefront Header Nav Logo

**Files:**
- Modify: `components/storefront/storefront-header.tsx:43`

**Interfaces:**
- Produces: correct brand name rendered in the top navigation bar

- [ ] **Step 1: Update header logo text**

In `components/storefront/storefront-header.tsx`, change the Link text at line 43:
```tsx
// Before
<Link
  href="/"
  className="shrink-0 text-xl font-extrabold tracking-normal text-[#0f766e] md:text-2xl"
>
  Dao Seafood
</Link>

// After
<Link
  href="/"
  className="shrink-0 text-xl font-extrabold tracking-normal text-[#0f766e] md:text-2xl"
>
  Hải Sản Nhà Quê
</Link>
```

- [ ] **Step 2: Lint**

```bash
pnpm lint components/storefront/storefront-header.tsx
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/storefront/storefront-header.tsx
git commit -m "rebrand: update storefront header nav logo text"
```

---

## Task 4: Storefront Footer — Brand Name and Company Info

**Files:**
- Modify: `components/storefront/storefront-footer.tsx:183,186,242,248-249`

**Interfaces:**
- Produces: footer rendering the new brand name, tagline, and real legal company details

- [ ] **Step 1: Update the main footer brand block (upper section, ~line 183)**

In `components/storefront/storefront-footer.tsx`, change:
```tsx
// Before — around line 182-188
<div className="text-2xl font-extrabold text-[#0f766e]">
  Dao Seafood
</div>
<p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
  Dao Seafood Commerce vận hành gian hàng, thanh toán và quy trình
  bán hải sản theo nhịp thương mại Việt Nam.
</p>

// After
<div className="text-2xl font-extrabold text-[#0f766e]">
  Hải Sản Nhà Quê
</div>
<p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
  Hải Sản Nhà Quê vận hành gian hàng, thanh toán và quy trình
  bán hải sản theo nhịp thương mại Việt Nam.
</p>
```

- [ ] **Step 2: Update the bottom footer brand wordmark and company info (around line 242-249)**

In `components/storefront/storefront-footer.tsx`, change:
```tsx
// Before — around line 242-249
<div className="text-2xl font-extrabold text-white">Dao Seafood</div>
<div>
  <h2 className="text-sm font-bold uppercase text-orange-200">
    Thông tin công ty
  </h2>
  <p className="mt-2 text-sm leading-6 text-teal-50">
    Công ty TNHH Dao Seafood. VP: 11 Block A, phường Tân Sơn,
    TP.HCM. Hotline: 1900 0098. Email: care@daoseafood.local.
  </p>

// After
<div className="text-2xl font-extrabold text-white">Hải Sản Nhà Quê</div>
<div>
  <h2 className="text-sm font-bold uppercase text-orange-200">
    Thông tin công ty
  </h2>
  <p className="mt-2 text-sm leading-6 text-teal-50">
    CÔNG TY TNHH HẢI SẢN NHÀ QUÊ. MST: 0319442718. VP: SAV.2-00.04 Tầng trệt, Tháp 2,
    Toà Nhà The Sun Avenue, 28 Mai Chí Thọ, P.Bình Trưng, TP.HCM, Việt Nam.
    Hotline: 1900 0098. Email: care@haisannhaque.vn.
  </p>
```

- [ ] **Step 3: Lint**

```bash
pnpm lint components/storefront/storefront-footer.tsx
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/storefront/storefront-footer.tsx
git commit -m "rebrand: update footer brand name and real company legal info"
```

---

## Task 5: Partner Strip Default Fallback Title

**Files:**
- Modify: `components/storefront/partner-strip.tsx:179`

**Interfaces:**
- Produces: correct fallback title when the CMS section title is null

- [ ] **Step 1: Update fallback title**

In `components/storefront/partner-strip.tsx`, change:
```tsx
// Before — around line 179
{section.title ?? "Đối tác Dao Seafood"}

// After
{section.title ?? "Đối tác Hải Sản Nhà Quê"}
```

- [ ] **Step 2: Lint and commit**

```bash
pnpm lint components/storefront/partner-strip.tsx
git add components/storefront/partner-strip.tsx
git commit -m "rebrand: update partner strip fallback title"
```

---

## Task 6: Seed SQL — All Brand References

**Files:**
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces: seed data that uses the new brand name in all CMS page titles, hero subtitles, nav links, asset labels, and product origin fields

The seed file has these categories of strings to replace (all replacements shown):

| Old | New |
|-----|-----|
| `Dao Seafood` | `Hải Sản Nhà Quê` |
| `Dao Seafood Commerce` | `Hải Sản Nhà Quê` |
| `Bếp Dao Seafood` | `Bếp Nhà Quê` |
| `Trang chủ Dao Seafood` | `Trang chủ Hải Sản Nhà Quê` |
| `Về Dao Seafood Commerce` | `Về Hải Sản Nhà Quê` |
| `care@daoseafood.local` | `care@haisannhaque.vn` |
| `text=Dao+Seafood` (placehold.co URLs) | `text=Hai+San+Nha+Que` |
| `text=Dao+Seafood+Commerce` (placehold.co URLs) | `text=Hai+San+Nha+Que` |

- [ ] **Step 1: Apply all replacements to seed.sql**

Run these sed commands (or edit manually — every replacement is a literal string):

```bash
sed -i \
  "s/Bếp Dao Seafood/Bếp Nhà Quê/g" \
  "s/Trang chủ Dao Seafood/Trang chủ Hải Sản Nhà Quê/g" \
  "s/Về Dao Seafood Commerce/Về Hải Sản Nhà Quê/g" \
  "s/Đối tác Dao Seafood/Đối tác Hải Sản Nhà Quê/g" \
  "s/Ưu đãi hải sản tươi từ Dao Seafood/Ưu đãi hải sản tươi từ Hải Sản Nhà Quê/g" \
  "s/Logo placeholder Dao Seafood/Logo placeholder Hải Sản Nhà Quê/g" \
  "s/Wordmark placeholder Dao Seafood Commerce/Wordmark placeholder Hải Sản Nhà Quê/g" \
  "s/Dao Seafood Commerce/Hải Sản Nhà Quê/g" \
  "s/Dao Seafood/Hải Sản Nhà Quê/g" \
  "s/care@daoseafood.local/care@haisannhaque.vn/g" \
  "s/text=Dao+Seafood+Commerce/text=Hai+San+Nha+Que/g" \
  "s/text=Dao+Seafood/text=Hai+San+Nha+Que/g" \
  supabase/seed.sql
```

> Note: the sed commands above process most specific strings first (`Bếp Dao Seafood` before `Dao Seafood`) to avoid double-substitution. If sed has issues with Vietnamese characters in your shell, use a text editor or the Edit tool instead.

- [ ] **Step 2: Verify the old brand is gone**

```bash
grep -n "Dao Seafood\|daoseafood\|Dao Hai San" supabase/seed.sql
```
Expected: no output.

- [ ] **Step 3: Spot-check the new brand appears correctly**

```bash
grep -n "Hải Sản Nhà Quê\|Bếp Nhà Quê" supabase/seed.sql | head -20
```
Expected: shows the relevant lines now using the new name.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "rebrand: replace all Dao Seafood references in seed data"
```

---

## Task 7: Playwright CMS Fixtures

**Files:**
- Modify: `src/features/cms/playwright-fixtures.ts:412,568,912`

**Interfaces:**
- Consumes: the same string values used in seed.sql (must stay in sync with Task 6's replacements)
- Produces: fixture data that matches the rebranded seed for E2E fixture-based tests

- [ ] **Step 1: Update three fixture strings**

In `src/features/cms/playwright-fixtures.ts`, make these exact replacements:

Line 412:
```ts
// Before
label: "Về Dao Seafood Commerce",
// After
label: "Về Hải Sản Nhà Quê",
```

Line 568:
```ts
// Before
subtitle: "Ưu đãi hải sản tươi từ Dao Seafood",
// After
subtitle: "Ưu đãi hải sản tươi từ Hải Sản Nhà Quê",
```

Line 912:
```ts
// Before
title: "Đối tác Dao Seafood",
// After
title: "Đối tác Hải Sản Nhà Quê",
```

- [ ] **Step 2: Verify no old brand strings remain**

```bash
grep -n "Dao Seafood\|daoseafood" src/features/cms/playwright-fixtures.ts
```
Expected: no output.

- [ ] **Step 3: Run unit tests**

```bash
pnpm test src/features/cms
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/cms/playwright-fixtures.ts
git commit -m "rebrand: update CMS playwright fixtures to Hải Sản Nhà Quê"
```

---

## Task 8: E2E Test Assertions

**Files:**
- Modify: `tests/e2e/storefront-checkout.spec.ts:6,82`

**Interfaces:**
- Consumes: rendered component text from Task 3 (header) and Task 5 (partner strip)
- Produces: passing E2E tests against the rebranded UI

- [ ] **Step 1: Update two E2E assertions**

In `tests/e2e/storefront-checkout.spec.ts`, change:

Line 6:
```ts
// Before
await expect(page.getByText("Đối tác Dao Seafood")).toBeVisible();
// After
await expect(page.getByText("Đối tác Hải Sản Nhà Quê")).toBeVisible();
```

Line 82:
```ts
// Before
page.getByRole("link", { name: "Dao Seafood", exact: true }),
// After
page.getByRole("link", { name: "Hải Sản Nhà Quê", exact: true }),
```

- [ ] **Step 2: Verify no old brand strings remain in tests**

```bash
grep -n "Dao Seafood\|daoseafood" tests/e2e/storefront-checkout.spec.ts
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/storefront-checkout.spec.ts
git commit -m "rebrand: update E2E test assertions for Hải Sản Nhà Quê"
```

---

## Task 9: Final Verification Pass

**Files:** (read-only verification)

- [ ] **Step 1: Full codebase scan for old brand strings**

```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.sql" \
  "Dao Seafood\|dao.?seafood\|daoseafood\|Dao Hai San\|DaoHaiSan" \
  . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```
Expected: only matches in `docs/` plan/research files and `AGENTS.md` (historical references — do not change those).

- [ ] **Step 2: Build passes**

```bash
pnpm build 2>&1 | tail -20
```
Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Unit test suite passes**

```bash
pnpm test
```
Expected: all tests pass.

- [ ] **Step 4: Lint passes**

```bash
pnpm lint
```
Expected: no errors.
