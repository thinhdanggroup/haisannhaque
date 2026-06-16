import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const UPLOADS_DIR = join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "products:update");
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
  const filename = `${crypto.randomUUID()}${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(join(UPLOADS_DIR, filename), Buffer.from(bytes));

  const url = `/api/images/${filename}`;

  const { error } = await client.from("product_images").insert({
    product_id: productId,
    url,
    alt_text: null,
    sort_order: 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}
