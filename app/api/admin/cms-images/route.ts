import { extname } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { validateImageFile } from "@/src/features/social-posts/image-store";

export async function POST(request: NextRequest) {
  const authClient = await createServerClient();

  try {
    await requireAdminPermission(authClient, "cms:update");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const validationError = validateImageFile({ type: file.type, size: file.size });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Only the extension comes from the client-supplied name.
  const storagePath = `banners/${crypto.randomUUID()}${extname(file.name) || ".jpg"}`;

  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("media")
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("media").getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl });
}
