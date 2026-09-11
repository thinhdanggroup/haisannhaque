import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDefaultSocialPostTemplate,
  getSocialPost,
  listSocialPostTemplates,
  listSocialPosts,
} from "./queries";

const POST_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  template_id: "22222222-2222-4222-8222-222222222222",
  idea: "Cá hồi tươi",
  image_url: "https://example.com/a.png",
  image_storage_path: "social/a.png",
  image_local_path: "/var/lib/social-posts/a.png",
  generated_caption: "Bản AI",
  edited_caption: null,
  status: "generated",
  fb_post_id: null,
  scheduled_publish_time: null,
  conversation_id: "conv-1",
  generation_ms: 11329,
  generation_tokens: 13796,
  error_message: null,
  created_at: "2026-09-11T00:00:00.000Z",
  posted_at: null,
};

const TEMPLATE_ROW = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Bài đăng bán hàng",
  prompt_body: "Bạn là chuyên gia viết content.",
  is_default: true,
  is_active: true,
  updated_at: "2026-09-11T00:00:00.000Z",
};

function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: string[] = [];
  const chain: Array<{ method: string; args: unknown[] }> = [];
  const builder = {
    select: (cols: string) => {
      chain.push({ method: "select", args: [cols] });
      return builder;
    },
    eq: (field: string, value: unknown) => {
      chain.push({ method: "eq", args: [field, value] });
      return builder;
    },
    order: (field: string, opts?: unknown) => {
      chain.push({ method: "order", args: [field, opts] });
      return builder;
    },
    limit: (count: number) => {
      chain.push({ method: "limit", args: [count] });
      return builder;
    },
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  const client = {
    from: (table: string) => {
      calls.push(table);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls, chain };
}

describe("listSocialPosts", () => {
  it("maps snake_case rows to domain objects", async () => {
    const { client } = fakeClient({ data: [POST_ROW], error: null });
    const posts = await listSocialPosts(client);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: POST_ROW.id,
      templateId: POST_ROW.template_id,
      generatedCaption: "Bản AI",
      editedCaption: null,
      status: "generated",
      conversationId: "conv-1",
      generationMs: 11329,
      generationTokens: 13796,
    });
  });

  it("reads from the social_posts table", async () => {
    const { client, calls, chain } = fakeClient({ data: [], error: null });
    await listSocialPosts(client, 25);
    expect(calls).toContain("social_posts");
    const orderCall = chain.find((c) => c.method === "order");
    expect(orderCall).toBeDefined();
    expect(orderCall?.args[0]).toBe("created_at");
    expect(orderCall?.args[1]).toEqual({ ascending: false });
    const limitCall = chain.find((c) => c.method === "limit");
    expect(limitCall).toBeDefined();
    expect(limitCall?.args[0]).toBe(25);
  });

  it("returns an empty array when data is null", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await listSocialPosts(client)).toEqual([]);
  });

  it("throws when the query errors", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    await expect(listSocialPosts(client)).rejects.toBeTruthy();
  });
});

describe("getSocialPost", () => {
  it("maps a single row", async () => {
    const { client, chain } = fakeClient({ data: POST_ROW, error: null });
    const post = await getSocialPost(client, POST_ROW.id);
    expect(post?.idea).toBe("Cá hồi tươi");
    const eqCall = chain.find((c) => c.method === "eq");
    expect(eqCall).toBeDefined();
    expect(eqCall?.args).toEqual(["id", POST_ROW.id]);
  });

  it("returns null when no row is found", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getSocialPost(client, POST_ROW.id)).toBeNull();
  });
});

describe("listSocialPostTemplates", () => {
  it("maps template rows", async () => {
    const { client, chain } = fakeClient({ data: [TEMPLATE_ROW], error: null });
    const templates = await listSocialPostTemplates(client);
    expect(templates[0]).toEqual({
      id: TEMPLATE_ROW.id,
      name: "Bài đăng bán hàng",
      promptBody: "Bạn là chuyên gia viết content.",
      isDefault: true,
      isActive: true,
      updatedAt: TEMPLATE_ROW.updated_at,
    });
    const orderCall = chain.find((c) => c.method === "order");
    expect(orderCall).toBeDefined();
    expect(orderCall?.args[0]).toBe("name");
    expect(orderCall?.args[1]).toEqual({ ascending: true });
  });
});

describe("getDefaultSocialPostTemplate", () => {
  it("returns the default template when one exists", async () => {
    const { client, chain } = fakeClient({ data: TEMPLATE_ROW, error: null });
    const template = await getDefaultSocialPostTemplate(client);
    expect(template?.isDefault).toBe(true);
    const eqCall = chain.find((c) => c.method === "eq");
    expect(eqCall).toBeDefined();
    expect(eqCall?.args).toEqual(["is_default", true]);
  });

  it("returns null when there is no default", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getDefaultSocialPostTemplate(client)).toBeNull();
  });
});
