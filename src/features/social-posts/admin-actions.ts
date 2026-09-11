"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { publishPhoto, resolveFacebookConfig } from "./facebook/graph-client";
import { createAgyGenerator } from "./generator/agy-generator";
import { generateCaption } from "./generation";
import { resolveImageDir } from "./image-store";
import { getSocialPost, getSocialPostTemplate } from "./queries";
import {
  isUuid,
  parseCaptionForm,
  parseGenerateSocialPostForm,
  parseScheduledPublishTime,
  parseSocialPostTemplateForm,
} from "./schema";
import { effectiveCaption } from "./types";

const PERMISSION = "social_posts:manage";
const LIST_PATH = "/admin/social-posts";
const TEMPLATES_PATH = "/admin/social-posts/templates";

export type SocialPostActionState = { error: string } | null;

function buildGenerator() {
  return createAgyGenerator({
    binPath: process.env.AGY_BIN_PATH ?? "agy",
    imageDir: resolveImageDir(),
  });
}

export async function generateSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  // Auth before validation, per the server-action rules.
  await requireAdminPermission(client, PERMISSION);

  const parsed = parseGenerateSocialPostForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const template = await getSocialPostTemplate(client, parsed.data.templateId);
  if (!template) return { error: "Không tìm thấy mẫu prompt" };

  const { data: inserted, error: insertError } = await client
    .from("social_posts")
    .insert({
      template_id: template.id,
      idea: parsed.data.idea,
      image_url: parsed.data.imageUrl ?? null,
      image_storage_path: parsed.data.imageStoragePath ?? null,
      image_local_path: parsed.data.imageLocalPath ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Không tạo được bài đăng" };
  }

  const outcome = await generateCaption({
    generator: buildGenerator(),
    promptBody: template.promptBody,
    idea: parsed.data.idea,
    visionMode: parsed.data.visionMode,
    imagePath: parsed.data.imageLocalPath,
  });

  const { error: updateError } = await client
    .from("social_posts")
    .update(outcome.values)
    .eq("id", inserted.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${inserted.id}`);

  // Redirect even on generation failure: the review page shows the recorded
  // error_message, which is more useful than a bare form error. redirect()
  // throws internally, so it stays outside any try/catch.
  redirect(`${LIST_PATH}/${inserted.id}`);
}

export async function regenerateSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const post = await getSocialPost(client, id);
  if (!post) return { error: "Không tìm thấy bài đăng" };
  if (!post.templateId) return { error: "Bài đăng không còn mẫu prompt liên kết" };

  const template = await getSocialPostTemplate(client, post.templateId);
  if (!template) return { error: "Không tìm thấy mẫu prompt" };

  const adjustment = String(formData.get("adjustment") ?? "").trim();
  const idea = adjustment ? `${post.idea}\n\nYêu cầu thêm: ${adjustment}` : post.idea;

  const outcome = await generateCaption({
    generator: buildGenerator(),
    promptBody: template.promptBody,
    idea,
    visionMode: post.imageLocalPath ? "vision" : "attach-only",
    imagePath: post.imageLocalPath ?? undefined,
    // Continuing the conversation is cheaper and more coherent than a cold
    // re-prompt when the admin asks for an adjustment.
    conversationId: post.conversationId ?? undefined,
  });

  const { error } = await client.from("social_posts").update(outcome.values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);

  return outcome.ok ? null : { error: outcome.values.error_message };
}

export async function updateSocialPostCaption(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const parsed = parseCaptionForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await client
    .from("social_posts")
    .update({ edited_caption: parsed.data.caption })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`${LIST_PATH}/${id}`);
  return null;
}

export async function publishSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const config = resolveFacebookConfig();
  if (!config) {
    return { error: "Chưa cấu hình FACEBOOK_PAGE_ID và FACEBOOK_PAGE_ACCESS_TOKEN" };
  }

  const post = await getSocialPost(client, id);
  if (!post) return { error: "Không tìm thấy bài đăng" };
  if (!post.imageUrl) return { error: "Bài đăng chưa có ảnh để đăng lên Facebook" };

  const caption = effectiveCaption(post);
  if (!caption) return { error: "Bài đăng chưa có nội dung" };

  // An empty schedule field means publish now.
  const rawSchedule = String(formData.get("scheduledPublishTime") ?? "").trim();
  let scheduledPublishTime: Date | undefined;

  if (rawSchedule) {
    const parsedSchedule = parseScheduledPublishTime(rawSchedule, new Date());
    if (!parsedSchedule.success) return { error: parsedSchedule.error };
    scheduledPublishTime = parsedSchedule.data;
  }

  const result = await publishPhoto({
    pageId: config.pageId,
    accessToken: config.accessToken,
    message: caption,
    imageUrl: post.imageUrl,
    scheduledPublishTime,
  });

  if (!result.ok) {
    const { error: recordError } = await client
      .from("social_posts")
      .update({ status: "failed", error_message: result.error })
      .eq("id", id);

    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${id}`);

    if (recordError) {
      return {
        error: `${result.error} (Ngoài ra, không ghi lại được lỗi này: ${recordError.message})`,
      };
    }

    return { error: result.error };
  }

  const { error } = await client
    .from("social_posts")
    .update({
      status: scheduledPublishTime ? "scheduled" : "posted",
      fb_post_id: result.postId,
      scheduled_publish_time: scheduledPublishTime?.toISOString() ?? null,
      posted_at: scheduledPublishTime ? null : new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return null;
}

export async function deleteSocialPost(formData: FormData): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return;

  const { error } = await client.from("social_posts").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(LIST_PATH);
}

export async function upsertSocialPostTemplate(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const parsed = parseSocialPostTemplateForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const rawId = String(formData.get("templateId") ?? "").trim();
  if (rawId && !isUuid(rawId)) return { error: "Mã mẫu không hợp lệ" };

  // social_post_templates_default_key is a partial unique index on
  // is_default, so the previous default must be cleared first. Left
  // unchecked, a failure here would let the write below violate that index
  // and surface a raw Postgres unique-violation instead of the real cause.
  if (parsed.data.isDefault) {
    const { error: clearError } = await client
      .from("social_post_templates")
      .update({ is_default: false })
      .eq("is_default", true);

    if (clearError) return { error: clearError.message };
  }

  const values = {
    name: parsed.data.name,
    prompt_body: parsed.data.promptBody,
    is_default: parsed.data.isDefault,
    is_active: parsed.data.isActive,
    updated_at: new Date().toISOString(),
  };

  const { error } = rawId
    ? await client.from("social_post_templates").update(values).eq("id", rawId)
    : await client.from("social_post_templates").insert(values);

  if (error) return { error: error.message };

  revalidatePath(TEMPLATES_PATH);
  revalidatePath(`${LIST_PATH}/new`);
  return null;
}

export async function deleteSocialPostTemplate(formData: FormData): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("templateId") ?? "");
  if (!isUuid(id)) return;

  const { error } = await client.from("social_post_templates").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(TEMPLATES_PATH);
  revalidatePath(`${LIST_PATH}/new`);
}
