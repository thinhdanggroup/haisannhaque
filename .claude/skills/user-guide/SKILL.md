---
name: user-guide
description: Use when asked to write a new user guide, update an existing one, or export/publish guides to Google Drive for shop staff (Vietnamese "hướng dẫn" docs in docs/, with screenshots and a PDF). Also use after shipping an admin or storefront feature that staff need to learn.
---

# Writing, updating and publishing user guides

User guides are for **shop staff who don't use git**: Vietnamese, plain words,
step-by-step, with screenshots. Each guide ships as Markdown + PDF in `docs/`
and is shared with staff through Google Drive.

| Guide | What it covers |
|---|---|
| `docs/admin-operations-guide.md` | Full admin reference; **index of all guides** (table near the end) |
| `docs/huong-dan-tinh-nang-moi.md` | October 2026 features |
| `docs/huong-dan-dua-danh-muc-len-web.md` | Publishing a category to the site |
| `docs/huong-dan-dang-bai-facebook-bang-ai.md` | Posting to Facebook with AI |

Developer docs (`developer-guide.md`, `admin-content-guide.md`, `DEPLOYMENT.md`)
are English and are **not** published to Drive.

Drive folder: https://drive.google.com/drive/u/1/folders/1dGpAmJ6Q-vaY033GTUQ2oY_bDqC_NtPZ

## 1. Write or update the Markdown

- **New guide:** `docs/huong-dan-<chu-de-khong-dau>.md`. Open with a `# Hướng dẫn …`
  title, one line on who it is for and where the admin is
  (`https://haisannhaque.com/admin`), then a **Tổng quan** table
  (# / Tính năng / Bạn làm ở đâu), then one `##` section per task.
  Copy the shape of `docs/huong-dan-tinh-nang-moi.md`.
- **Update:** read the guide and the code that changed (`git log`, the admin
  page under `app/admin/`), then edit only the sections the change affects.
  If a screenshot shows the old UI, retake it.
- Use the exact button and menu labels from the UI in **bold**, written the way
  the page shows them. Check them in the code (`grep -r "Lưu giá" app components`)
  rather than from memory.
- Write for a non-technical reader: what to click, what they will see, what to
  check before saving. Put warnings in `> **Lưu ý:**` blockquotes. Tables of
  "Bạn gõ → Được lưu thành" work well for input formats.
- Add the new guide to the index table in `docs/admin-operations-guide.md` and
  rebuild that PDF too.

## 2. Screenshots

Save to `docs/images/<guide-slug>/NN-ten-anh.png` (numbered in reading order)
and reference them relatively: `![mô tả ngắn](images/<guide-slug>/01-....png)`.

Take them with the Playwright MCP browser against `pnpm dev` (http://localhost:3000).
Crop to the relevant form or section (element screenshot) rather than full pages.

> **Local dev uses the production Supabase.** Open forms and screenshot them,
> but **do not press Lưu / Thêm / Xoá** unless the user agreed — it writes real
> shop data. For "after saving" shots, use what already exists on the live site
> (https://haisannhaque.com) instead.

The admin login is in `AGENTS.md` (first-time admin user section).

## 3. Export the PDF

Use the `md-to-pdf` skill, once per changed guide:

```bash
bash ~/.claude/skills/md-to-pdf/scripts/run.sh docs/<guide>.md docs/<guide>.pdf
```

Read a couple of pages of the PDF (Read tool, `pages: "1-3"`) to check
Vietnamese diacritics and images render. Find stale PDFs with:

```bash
for f in docs/*.pdf; do [ "${f%.pdf}.md" -nt "$f" ] && echo "STALE $f"; done
```

## 4. Commit

Commit the `.md`, `.pdf` and images together (`docs: …` message). Docs-only
changes don't need a deploy.

## 5. Publish to Google Drive

Only the Vietnamese staff guides (the table above, plus any new `huong-dan-*`):

```bash
bash .claude/skills/user-guide/scripts/publish-drive.sh docs/<guide>.pdf [...]
```

The script never overwrites. If a file with that name is already in the folder,
the new one is uploaded as `<name>-YYYY-MM-DD.pdf`; tell the user the old copy
is still there for them to delete (never delete or move Drive files yourself,
and never change sharing). It prints every file in the folder with its link —
give the user the links for what you uploaded.

If it exits 3 there is no rclone Drive remote on this machine; see the
`google-drive-rclone` skill.
