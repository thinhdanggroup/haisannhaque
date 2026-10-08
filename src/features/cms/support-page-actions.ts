"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import {
  SUPPORT_FOOTER_GROUP,
  supportPageHref,
  supportPageInputSchema,
  type SupportPageInput,
} from "./support-pages";

export type SupportPageState = { error: string } | null;

function readInput(formData: FormData) {
  return supportPageInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    body: formData.get("body") ?? "",
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "true",
  });
}

/**
 * Keeps the page's link in the footer's "Hỗ trợ khách hàng" group in step
 * with the page: same title and order, shown only while published. Matches
 * on the previous href too so renaming the slug moves the link.
 */
async function syncFooterLink(
  client: SupabaseClient,
  page: SupportPageInput,
  previousSlug?: string,
): Promise<void> {
  const href = supportPageHref(page.slug);
  const hrefs = previousSlug ? [href, supportPageHref(previousSlug)] : [href];

  const { data: existing, error: selectError } = await client
    .from("cms_footer_links")
    .select("id")
    .eq("group_label", SUPPORT_FOOTER_GROUP)
    .in("href", hrefs)
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const row = {
    group_label: SUPPORT_FOOTER_GROUP,
    label: page.title,
    href,
    sort_order: page.sortOrder,
    is_active: page.isPublished,
  };

  const { error } = existing
    ? await client.from("cms_footer_links").update(row).eq("id", existing.id)
    : await client.from("cms_footer_links").insert(row);

  if (error) throw error;
}

function revalidateSupportPages(slugs: string[]) {
  revalidatePath("/admin/support-pages");
  revalidatePath("/admin/content");
  revalidatePath("/", "layout");
  for (const slug of slugs) revalidatePath(supportPageHref(slug));
}

export async function createSupportPage(
  _prev: SupportPageState,
  formData: FormData,
): Promise<SupportPageState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const result = readInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  const { error } = await client.from("cms_support_pages").insert({
    slug: result.data.slug,
    title: result.data.title,
    body: result.data.body,
    sort_order: result.data.sortOrder,
    is_published: result.data.isPublished,
  });

  if (error) {
    if (error.code === "23505") return { error: "Đường dẫn này đã được dùng cho trang khác." };
    throw error;
  }

  await syncFooterLink(client, result.data);
  revalidateSupportPages([result.data.slug]);
  redirect("/admin/support-pages");
}

export async function updateSupportPage(
  _prev: SupportPageState,
  formData: FormData,
): Promise<SupportPageState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Trang không hợp lệ." };

  const result = readInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  const { data: previous, error: previousError } = await client
    .from("cms_support_pages")
    .select("slug")
    .eq("id", id.data)
    .single();

  if (previousError || !previous) return { error: "Không tìm thấy trang." };

  const { error } = await client
    .from("cms_support_pages")
    .update({
      slug: result.data.slug,
      title: result.data.title,
      body: result.data.body,
      sort_order: result.data.sortOrder,
      is_published: result.data.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") return { error: "Đường dẫn này đã được dùng cho trang khác." };
    throw error;
  }

  await syncFooterLink(client, result.data, previous.slug as string);
  revalidateSupportPages([result.data.slug, previous.slug as string]);
  redirect("/admin/support-pages");
}

export async function deleteSupportPage(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid support page id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "cms:update");

  const { data: page, error: selectError } = await client
    .from("cms_support_pages")
    .select("slug")
    .eq("id", parsed.data)
    .single();

  if (selectError || !page) throw selectError ?? new Error("Support page not found.");

  const { error } = await client.from("cms_support_pages").delete().eq("id", parsed.data);
  if (error) throw error;

  const { error: linkError } = await client
    .from("cms_footer_links")
    .delete()
    .eq("group_label", SUPPORT_FOOTER_GROUP)
    .eq("href", supportPageHref(page.slug as string));
  if (linkError) throw linkError;

  revalidateSupportPages([page.slug as string]);
}
