import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminPermission = vi.fn();
const from = vi.fn();
const publishPhoto = vi.fn();
const resolveFacebookConfig = vi.fn();
const generateCaption = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: () => Promise.resolve({ from }),
}));

vi.mock("@/src/features/admin/auth", () => ({
  requireAdminPermission: (...args: unknown[]) => requireAdminPermission(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("./facebook/graph-client", () => ({
  publishPhoto: (...args: unknown[]) => publishPhoto(...args),
  resolveFacebookConfig: (...args: unknown[]) => resolveFacebookConfig(...args),
}));

vi.mock("./generation", () => ({
  generateCaption: (...args: unknown[]) => generateCaption(...args),
}));

const {
  generateSocialPost,
  updateSocialPostCaption,
  deleteSocialPost,
  publishSocialPost,
  upsertSocialPostTemplate,
} = await import("./admin-actions");

// Matches the row shape queries.ts's mapPost() expects (snake_case columns).
const BASE_POST_ROW = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  template_id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  idea: "Cá hồi Na Uy tươi về sáng nay",
  image_url: "https://cdn.example.com/social/a.jpg",
  image_storage_path: "social/a.jpg",
  image_local_path: "/tmp/social-post-images/a.jpg",
  generated_caption: "Cá hồi tươi về sáng nay!",
  edited_caption: null,
  status: "generated",
  fb_post_id: null,
  scheduled_publish_time: null,
  conversation_id: "conv-1",
  generation_ms: 5000,
  generation_tokens: 120,
  error_message: null,
  created_at: "2026-01-01T00:00:00.000Z",
  posted_at: null,
};

function makeSelectChain(row: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function makeUpdateChain(result: { error: unknown } = { error: null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn().mockReturnValue({ eq });
  return { update, eq };
}

beforeEach(() => {
  requireAdminPermission.mockReset();
  from.mockReset();
  publishPhoto.mockReset();
  resolveFacebookConfig.mockReset();
  generateCaption.mockReset();
});

describe("generateSocialPost", () => {
  it("checks the permission before touching the form or the database", async () => {
    requireAdminPermission.mockRejectedValue(new Error("Permission denied"));

    const formData = new FormData();
    // Deliberately invalid: if parsing ran first it would return a validation
    // error instead of propagating the authorization failure.
    formData.set("idea", "x");

    await expect(generateSocialPost(null, formData)).rejects.toThrow("Permission denied");
    expect(from).not.toHaveBeenCalled();
  });

  it("requests the social_posts:manage permission", async () => {
    requireAdminPermission.mockRejectedValue(new Error("Permission denied"));
    await expect(generateSocialPost(null, new FormData())).rejects.toThrow();
    expect(requireAdminPermission).toHaveBeenCalledWith(expect.anything(), "social_posts:manage");
  });

  it("returns a validation error without writing when the form is invalid", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const formData = new FormData();
    formData.set("templateId", "not-a-uuid");
    formData.set("idea", "short");
    formData.set("visionMode", "attach-only");

    const result = await generateSocialPost(null, formData);
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("updateSocialPostCaption", () => {
  it("rejects a non-UUID post id before any database call", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const formData = new FormData();
    formData.set("postId", "../../etc/passwd");
    formData.set("caption", "Nội dung hợp lệ");

    const result = await updateSocialPostCaption(null, formData);
    expect(result).toMatchObject({ error: expect.stringContaining("không hợp lệ") });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("deleteSocialPost", () => {
  it("throws instead of failing silently when the delete errors", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const eq = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    const del = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ delete: del });

    const formData = new FormData();
    formData.set("postId", "3fa85f64-5717-4562-b3fc-2c963f66afa6");

    await expect(deleteSocialPost(formData)).rejects.toThrow("boom");
  });
});

describe("publishSocialPost", () => {
  it("on success, updates the row to posted with the returned fb_post_id", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });
    resolveFacebookConfig.mockReturnValue({ pageId: "page-1", accessToken: "token-1" });
    publishPhoto.mockResolvedValue({ ok: true, postId: "fb-123" });

    const selectChain = makeSelectChain(BASE_POST_ROW);
    const updateChain = makeUpdateChain({ error: null });
    from.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const formData = new FormData();
    formData.set("postId", BASE_POST_ROW.id);

    const result = await publishSocialPost(null, formData);

    expect(result).toBeNull();
    // Assert on what was actually sent to the DB, not merely that the
    // update was called.
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "posted",
        fb_post_id: "fb-123",
        scheduled_publish_time: null,
        error_message: null,
      }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", BASE_POST_ROW.id);
  });

  it("on failure, records status: failed with the error and returns it", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });
    resolveFacebookConfig.mockReturnValue({ pageId: "page-1", accessToken: "token-1" });
    publishPhoto.mockResolvedValue({
      ok: false,
      error: "Facebook từ chối: Invalid OAuth access token",
    });

    const selectChain = makeSelectChain(BASE_POST_ROW);
    const updateChain = makeUpdateChain({ error: null });
    from.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const formData = new FormData();
    formData.set("postId", BASE_POST_ROW.id);

    const result = await publishSocialPost(null, formData);

    expect(result).toEqual({ error: "Facebook từ chối: Invalid OAuth access token" });
    expect(updateChain.update).toHaveBeenCalledWith({
      status: "failed",
      error_message: "Facebook từ chối: Invalid OAuth access token",
    });
    expect(updateChain.eq).toHaveBeenCalledWith("id", BASE_POST_ROW.id);
  });

  it("rejects a second publish attempt once fb_post_id is already set", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });
    resolveFacebookConfig.mockReturnValue({ pageId: "page-1", accessToken: "token-1" });

    const selectChain = makeSelectChain({ ...BASE_POST_ROW, fb_post_id: "fb-already-posted" });
    from.mockReturnValueOnce(selectChain);

    const formData = new FormData();
    formData.set("postId", BASE_POST_ROW.id);

    const result = await publishSocialPost(null, formData);

    expect(result).toEqual({ error: "Bài đăng này đã được đăng lên Facebook" });
    expect(publishPhoto).not.toHaveBeenCalled();
  });
});

describe("upsertSocialPostTemplate", () => {
  it("clears the previous default before writing the new one", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const callOrder: string[] = [];
    const clearEq = vi.fn().mockImplementation(() => {
      callOrder.push("clear");
      return Promise.resolve({ error: null });
    });
    const clearUpdate = vi.fn().mockReturnValue({ eq: clearEq });
    const insert = vi.fn().mockImplementation(() => {
      callOrder.push("insert");
      return Promise.resolve({ error: null });
    });

    from.mockImplementation(() => ({ update: clearUpdate, insert }));

    const formData = new FormData();
    formData.set("name", "Khuyến mãi cuối tuần");
    formData.set("promptBody", "Bạn là chuyên gia viết content Facebook cho hải sản.");
    formData.set("isDefault", "on");
    formData.set("isActive", "on");

    const result = await upsertSocialPostTemplate(null, formData);

    expect(result).toBeNull();
    // The clearing update must run before the insert/update that writes the
    // new default, or the partial unique index on is_default is violated.
    expect(callOrder).toEqual(["clear", "insert"]);
    expect(clearUpdate).toHaveBeenCalledWith({ is_default: false });
    expect(clearEq).toHaveBeenCalledWith("is_default", true);
  });
});
