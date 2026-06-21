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
