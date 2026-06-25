# Admin: Update Hero Banner

Step-by-step guide for editing an existing hero banner — changing the image, copy, CTA, or display order — without creating a new record.

---

## Prerequisites

- Admin account with `cms:update` permission (`super_admin` role satisfies this)
- The banner must already exist; see [Banner Configuration Guide](admin-banner-config.md) to create one

---

## Step 1 — Open the Banners list

Navigate to `/admin/content/banners`.

The list shows every banner with its section assignment, title, CTA href, sort order, and active status.

---

## Step 2 — Find the banner to update

Scan the list for the banner by its title or section column (`home / hero-main`).

Click **Edit** on the target row. You are taken to `/admin/content/banners/[id]/edit`.

---

## Step 3 — Update the fields

The edit form is identical to the create form. Change only the fields you need:

| What you want to change | Field to update |
|---|---|
| Hero image | **Image URL** — paste the new `https://` URL |
| Mobile-only image | **Mobile image URL** — leave blank to reuse the desktop image |
| Headline text | **Title** |
| Body copy below the headline | **Subtitle** |
| CTA button label | **CTA label** (e.g. `Mua ngay`) |
| CTA destination | **CTA href** (e.g. `/categories/tom`) |
| Slot in the grid | **Sort order** — see layout rules below |
| Show/hide without deleting | **Status** → `Active` / `Inactive` |

### Hero grid slot rules

| Sort order | Visual position |
|---|---|
| Lowest (e.g. 10) | Large featured hero — left 2/3, full height |
| 2nd (e.g. 20) | Compact banner — top right |
| 3rd (e.g. 30) | Compact banner — bottom right |
| 4th–5th (e.g. 40–50) | Second row, full-width pair |

To swap two banners, increment one and decrement the other (e.g. swap 10 ↔ 20).

### Image URL guidelines

- Use any public `https://` URL — Supabase Storage, Cloudflare R2, or any CDN
- Images are rendered unoptimized (`<Image unoptimized>`), so no Next.js domain config is required
- Avoid `placehold.co` URLs — they trigger the teal placeholder fallback instead of showing the real image
- Recommended dimensions: **1440 × 600 px** for the featured hero, **720 × 400 px** for compact banners

---

## Step 4 — Save

Click **Save**. The form validates required fields (Title, Image URL, Section) before submitting.

On success you are redirected to the Banners list. The updated record appears immediately.

---

## Step 5 — Verify on the storefront

Visit `/` and confirm the hero grid reflects your changes.

- Hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) to bypass browser cache
- On mobile, the `mobile_image_url` field is used if set; otherwise the desktop image fills the slot

---

## Hiding a banner temporarily

Set **Status** → `Inactive` and save. The banner is removed from the storefront immediately but remains in the database for future use. Set it back to `Active` to re-enable it.

---

## Related guides

- [Banner Configuration Guide](admin-banner-config.md) — full setup from scratch (sections → banners)
- [Admin Content Guide](admin-content-guide.md) — overview of all CMS record types
