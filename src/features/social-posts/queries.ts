import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPost, SocialPostStatus, SocialPostTemplate } from "./types";

const POST_COLUMNS = "id, template_id, idea, image_url, image_storage_path, image_local_path, generated_caption, edited_caption, status, fb_post_id, test_fb_post_id, tested_at, scheduled_publish_time, conversation_id, generation_ms, generation_tokens, error_message, created_at, posted_at";

const TEMPLATE_COLUMNS = "id, name, prompt_body, is_default, is_active, updated_at";

const DEFAULT_POST_LIMIT = 50;

type PostRow = {
  id: string;
  template_id: string | null;
  idea: string;
  image_url: string | null;
  image_storage_path: string | null;
  image_local_path: string | null;
  generated_caption: string | null;
  edited_caption: string | null;
  status: SocialPostStatus;
  fb_post_id: string | null;
  test_fb_post_id: string | null;
  tested_at: string | null;
  scheduled_publish_time: string | null;
  conversation_id: string | null;
  generation_ms: number | null;
  generation_tokens: number | null;
  error_message: string | null;
  created_at: string;
  posted_at: string | null;
};

type TemplateRow = {
  id: string;
  name: string;
  prompt_body: string;
  is_default: boolean;
  is_active: boolean;
  updated_at: string;
};

function mapPost(row: PostRow): SocialPost {
  return {
    id: row.id,
    templateId: row.template_id,
    idea: row.idea,
    imageUrl: row.image_url,
    imageStoragePath: row.image_storage_path,
    imageLocalPath: row.image_local_path,
    generatedCaption: row.generated_caption,
    editedCaption: row.edited_caption,
    status: row.status,
    fbPostId: row.fb_post_id,
    testFbPostId: row.test_fb_post_id,
    testedAt: row.tested_at,
    scheduledPublishTime: row.scheduled_publish_time,
    conversationId: row.conversation_id,
    generationMs: row.generation_ms,
    generationTokens: row.generation_tokens,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    postedAt: row.posted_at,
  };
}

function mapTemplate(row: TemplateRow): SocialPostTemplate {
  return {
    id: row.id,
    name: row.name,
    promptBody: row.prompt_body,
    isDefault: row.is_default,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

export async function listSocialPosts(
  client: SupabaseClient,
  limit: number = DEFAULT_POST_LIMIT,
): Promise<SocialPost[]> {
  const { data, error } = await client
    .from("social_posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as PostRow[]).map(mapPost);
}

export async function getSocialPost(
  client: SupabaseClient,
  id: string,
): Promise<SocialPost | null> {
  const { data, error } = await client
    .from("social_posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapPost(data as PostRow) : null;
}

export async function listSocialPostTemplates(
  client: SupabaseClient,
): Promise<SocialPostTemplate[]> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as TemplateRow[]).map(mapTemplate);
}

export async function getSocialPostTemplate(
  client: SupabaseClient,
  id: string,
): Promise<SocialPostTemplate | null> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapTemplate(data as TemplateRow) : null;
}

export async function getDefaultSocialPostTemplate(
  client: SupabaseClient,
): Promise<SocialPostTemplate | null> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;

  return data ? mapTemplate(data as TemplateRow) : null;
}
