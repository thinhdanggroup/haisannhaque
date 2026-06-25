# Banner Configuration Guide

This guide walks through configuring homepage hero banners via the Admin panel.

## Prerequisites

- Admin account with `super_admin` role
- Run `node scripts/create-user.mjs` then `node scripts/assign-admin.mjs` if the account doesn't exist yet

---

## Step 1 — Log in to Admin

Navigate to `/admin/login`.

![Login page](screenshots/banner-config/step-01-login.png)

Enter your credentials and click **Đăng nhập**.

![Login filled](screenshots/banner-config/step-02-login-filled.png)

---

## Step 2 — Go to Content Management

After login you land on the Admin dashboard. Click **Content** in the left sidebar.

![Admin dashboard](screenshots/banner-config/step-03-admin-dashboard.png)

The Content page shows all CMS records: pages, sections, banners, navigation, footer links, and brand assets.

![Content page](screenshots/banner-config/step-04-content-page.png)

---

## Step 3 — Create a Hero Section

Banners belong to a **section**. You need one `hero` section on the `home` page before adding banners.

Go to **Content → Sections → New** (or click the **New** button next to "CMS sections").

![New section form](screenshots/banner-config/step-05-new-section-form.png)

Fill in the form:

| Field | Value |
|---|---|
| **Page** | `Trang chủ Hải Sản Nhà Quê (home)` |
| **Section key** | `hero-main` (lowercase, hyphens only) |
| **Section type** | `hero` |
| **Title** | Optional heading shown above the banner grid |
| **Sort order** | `0` (lower = appears higher on the page) |
| **Status** | `Active` |

![Section form filled](screenshots/banner-config/step-06-section-filled.png)

Click **Create section**. You are redirected back to the Content page.

---

## Step 4 — Add Banners

Navigate to **Content → Banners → New**.

![New banner form](screenshots/banner-config/step-08-new-banner-form.png)

### Banner layout rules

The hero section renders banners by sort order:

| Sort order | Position |
|---|---|
| Lowest (e.g. 10) | Large featured hero — 2/3 width, full height |
| 2nd (e.g. 20) | Compact side banner — top right |
| 3rd (e.g. 30) | Compact side banner — bottom right |
| 4th–5th | Second row, full-width pair |

### Banner form fields

| Field | Notes |
|---|---|
| **Section** | Select `home / hero-main` |
| **Title** | Text overlaid on the image |
| **Subtitle** | Optional secondary line |
| **Image URL** | Full URL (Supabase Storage, CDN, Unsplash, etc.) — see note below |
| **Mobile image URL** | Optional; falls back to desktop image if empty |
| **CTA label** | Button text, e.g. `Xem ngay` |
| **CTA href** | Link, e.g. `/categories/fresh-seafood` |
| **Sort order** | Controls slot position (see table above) |

![Banner form filled](screenshots/banner-config/step-09-banner-filled.png)

Click **Create banner**.

Repeat for each banner you want in the grid, incrementing sort order by 10.

---

## Step 5 — Verify the Banners List

After creating all banners, the Banners list at `/admin/content/banners` shows all entries with their section assignment, CTA, order, and status.

![Banners list](screenshots/banner-config/step-11-banners-list.png)

---

## Step 6 — View on Storefront

Visit `/` — the hero grid will render with the real images.

![Storefront result](screenshots/banner-config/step-12-storefront-result.png)

---

## Image URL notes

Any public image URL works. The component uses `<Image … unoptimized>` so no Next.js domain configuration is required.

**Recommended sources:**
- **Supabase Storage** — create a public bucket (`banners`), upload files, copy the public URL
- **Cloudflare Images / R2** — CDN-hosted, fast globally
- Any `https://` URL that returns an image

**Avoid** URLs containing `placehold.co` — those trigger the teal placeholder fallback instead of showing the real image.

---

## Editing or deactivating a banner

From `/admin/content/banners`, click **Edit** on any row. You can update any field, change sort order, or set Status to **Inactive** to hide it from the storefront without deleting it.
