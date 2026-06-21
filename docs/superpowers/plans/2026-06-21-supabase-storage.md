# Supabase Storage for Media Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local-disk image upload/serving with Supabase Storage so product images survive deployments and work in serverless environments.

**Architecture:** A new SQL migration creates a public `media` bucket with RLS allowing public reads and admin-only writes. The existing `/api/admin/images` route handler is rewritten to upload to Supabase Storage instead of the local filesystem. The local file-serving route and `uploads/` writes are removed. Next.js `remotePatterns` is updated to allow Supabase Storage URLs. No changes needed to the upload form or `ProductImagesManager` — they already POST to `/api/admin/images`.

**Tech Stack:** Supabase Storage JS client (`@supabase/supabase-js` already installed), Next.js App Router route handler, SQL migration.

## Global Constraints

- Use `pnpm` for all package commands
- Migrations are append-only: add new file, never edit existing ones
- Admin writes use `createAdminClient()` (service role) from `src/lib/supabase/admin.ts`
- Permission guard: `requireAdminPermission(client, "products:update")` before any write
- All user-facing text in Vietnamese
- `NEXT_PUBLIC_SUPABASE_URL` must be in `next.config.ts` remotePatterns for `next/image` to load storage URLs
- Max file size: 5 MB; allowed types: JPEG, PNG, WebP, GIF

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/202606210015_media_storage.sql` | Create | Bucket + RLS policies |
| `app/api/admin/images/route.ts` | Modify | Replace local FS write with Supabase Storage upload |
| `app/api/images/[filename]/route.ts` | Delete | Local file serving no longer needed |
| `next.config.ts` | Modify | Add Supabase Storage hostname to `remotePatterns` |

---

### Task 1: Migration — create `media` bucket with RLS

**Files:**
- Create: `supabase/migrations/202606210015_media_storage.sql`

**Interfaces:**
- Produces: `storage.buckets` row `id='media'`, public read policy for `anon`+`authenticated`, insert/update/delete policies for admins via `user_admin_roles` join

- [ ] **Step 1: Create the migration file**

```bash
cd /home/thinhda/Documents/web-store/web-store
supabase migration new media_storage
```

This creates `supabase/migrations/<timestamp>_media_storage.sql`. Rename/replace the generated file path in subsequent steps with the actual generated filename, or create the file manually:

```bash
cat > supabase/migrations/202606210015_media_storage.sql << 'EOF'
-- Create public media bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Public read
create policy "media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Admin insert
create policy "media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admin update (needed for upsert)
create policy "media_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admin delete
create policy "media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );
EOF
```

- [ ] **Step 2: Apply the migration to the local database**

```bash
supabase db push --local
```

Expected: migration applies without error.

- [ ] **Step 3: Verify the bucket was created**

```bash
supabase db query --local "select id, name, public from storage.buckets where id = 'media';"
```

Expected output:
```
  id   | name  | public
-------+-------+--------
 media | media | t
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606210015_media_storage.sql
git commit -m "feat(storage): add media bucket with public read and admin write RLS"
```

---

### Task 2: Rewrite upload route to use Supabase Storage

**Files:**
- Modify: `app/api/admin/images/route.ts`

**Interfaces:**
- Consumes: `createAdminClient()` from `@/src/lib/supabase/admin`, `requireAdminPermission` from `@/src/features/admin/auth`
- Produces: JSON `{ url: string }` where `url` is the Supabase Storage public URL (e.g. `https://<project>.supabase.co/storage/v1/object/public/media/products/<uuid>.jpg`)

- [ ] **Step 1: Replace the route handler**

Replace the full content of `app/api/admin/images/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export async function POST(request: NextRequest) {
  const authClient = await createServerClient();

  try {
    await requireAdminPermission(authClient, "products:update");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;

  if (!file || !productId) {
    return NextResponse.json({ error: "file and productId are required" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const ext = extname(file.name) || ".jpg";
  const storagePath = `products/${crypto.randomUUID()}${ext}`;

  const adminClient = createAdminClient();
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from("media")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("media").getPublicUrl(storagePath);

  const { error: dbError } = await authClient.from("product_images").insert({
    product_id: productId,
    url: publicUrl,
    alt_text: null,
    sort_order: 0,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to `app/api/admin/images/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/images/route.ts
git commit -m "feat(storage): upload product images to Supabase Storage instead of local disk"
```

---

### Task 3: Update next.config.ts to allow Supabase Storage image URLs

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL` env var (e.g. `https://<ref>.supabase.co`)
- Produces: `next/image` can load URLs from `*.supabase.co`

- [ ] **Step 1: Add Supabase Storage hostname to remotePatterns**

Replace the `images` block in `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify build config is valid**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(storage): allow Supabase Storage hostnames in next/image remotePatterns"
```

---

### Task 4: Remove the local file-serving route

**Files:**
- Delete: `app/api/images/[filename]/route.ts`

**Notes:** Existing product images already in the DB with `/api/images/<uuid>` URLs will return 404 after this. This is acceptable for a development database with placeholder data. In production, a data migration would be needed to re-upload and update URLs.

- [ ] **Step 1: Delete the local image serving route**

```bash
rm app/api/images/\[filename\]/route.ts
rmdir app/api/images/\[filename\] app/api/images 2>/dev/null || true
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Restart dev server and smoke test upload**

Start the dev server if not running:
```bash
pnpm dev
```

Navigate to `http://localhost:3000/admin/products`, open any product's edit page, and use the "Tải lên hình ảnh" form to upload a test image. Verify:
- No 500 error in browser console
- Image appears in the grid after upload
- Image URL in the DB starts with `https://<project>.supabase.co/storage/v1/object/public/media/products/`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(storage): remove local file-serving route, uploads now served from Supabase Storage"
```
