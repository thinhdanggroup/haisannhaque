import { mkdir, writeFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { buildImagePaths, resolveImageDir, validateImageFile } from "@/src/features/social-posts/image-store";

export async function POST(request: NextRequest) {
  const authClient = await createServerClient();

  try {
    await requireAdminPermission(authClient, "social_posts:manage");
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
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const validationError = validateImageFile({ type: file.type, size: file.size });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const imageDir = resolveImageDir();
  const { storagePath, localPath } = buildImagePaths(file.name, imageDir);
  const bytes = Buffer.from(await file.arrayBuffer());

  // Destination 1: Supabase Storage, for the Facebook photo and the preview.
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("media")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("media").getPublicUrl(storagePath);

  // Destination 2: local disk, because agy's read_file needs a real path.
  try {
    await mkdir(imageDir, { recursive: true });
    await writeFile(localPath, bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không ghi được ảnh vào đĩa";
    return NextResponse.json(
      { error: `Không ghi được ảnh vào ${imageDir}: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: publicUrl, storagePath, localPath });
}
