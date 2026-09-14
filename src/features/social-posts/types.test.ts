import { describe, expect, it } from "vitest";
import { effectiveCaption } from "./types";
import type { SocialPost } from "./types";

function buildPost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    templateId: null,
    idea: "Cá hồi tươi",
    imageUrl: null,
    imageStoragePath: null,
    imageLocalPath: null,
    generatedCaption: "Bản AI",
    editedCaption: null,
    status: "generated",
    fbPostId: null,
    testFbPostId: null,
    testedAt: null,
    scheduledPublishTime: null,
    conversationId: null,
    generationMs: null,
    generationTokens: null,
    errorMessage: null,
    createdAt: "2026-09-11T00:00:00.000Z",
    postedAt: null,
    ...overrides,
  };
}

describe("effectiveCaption", () => {
  it("uses the generated caption when there is no edit", () => {
    expect(effectiveCaption(buildPost())).toBe("Bản AI");
  });

  it("prefers the admin edit over the generated caption", () => {
    expect(effectiveCaption(buildPost({ editedCaption: "Bản sửa" }))).toBe("Bản sửa");
  });

  it("returns an empty string when nothing has been generated", () => {
    expect(effectiveCaption(buildPost({ generatedCaption: null }))).toBe("");
  });
});
