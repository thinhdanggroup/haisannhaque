import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminPermission = vi.fn();
const from = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: () => Promise.resolve({ from }),
}));

vi.mock("@/src/features/admin/auth", () => ({
  requireAdminPermission: (...args: unknown[]) => requireAdminPermission(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { generateSocialPost, updateSocialPostCaption } = await import("./admin-actions");

beforeEach(() => {
  requireAdminPermission.mockReset();
  from.mockReset();
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
