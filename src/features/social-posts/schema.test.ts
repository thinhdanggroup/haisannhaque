import { describe, expect, it } from "vitest";
import {
  SCHEDULE_MAX_DAYS,
  SCHEDULE_MIN_MINUTES,
  isUuid,
  parseCaptionForm,
  parseGenerateSocialPostForm,
  parseScheduledPublishTime,
  parseSocialPostTemplateForm,
} from "./schema";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-11T10:00:00.000Z");
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function generateForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("templateId", overrides.templateId ?? TEMPLATE_ID);
  fd.set("idea", overrides.idea ?? "Cá hồi Na Uy tươi về sáng nay, giảm 20%");
  fd.set("visionMode", overrides.visionMode ?? "vision");
  fd.set("imageUrl", overrides.imageUrl ?? "https://example.supabase.co/storage/v1/a.png");
  fd.set("imageStoragePath", overrides.imageStoragePath ?? "social/a.png");
  fd.set("imageLocalPath", overrides.imageLocalPath ?? "/var/lib/social-posts/a.png");
  return fd;
}

describe("isUuid", () => {
  it("accepts a valid UUID", () => {
    expect(isUuid(TEMPLATE_ID)).toBe(true);
  });

  it("rejects a non-UUID", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("parseGenerateSocialPostForm", () => {
  it("parses a valid vision-mode form", () => {
    const result = parseGenerateSocialPostForm(generateForm());
    expect(result.success).toBe(true);
    expect(result.success && result.data.visionMode).toBe("vision");
    expect(result.success && result.data.imageLocalPath).toBe("/var/lib/social-posts/a.png");
  });

  it("trims the idea", () => {
    const result = parseGenerateSocialPostForm(generateForm({ idea: "   Cá hồi tươi ngon   " }));
    expect(result.success && result.data.idea).toBe("Cá hồi tươi ngon");
  });

  it("rejects a non-UUID templateId", () => {
    const result = parseGenerateSocialPostForm(generateForm({ templateId: "abc" }));
    expect(result.success).toBe(false);
  });

  it("rejects an idea shorter than 10 characters", () => {
    const result = parseGenerateSocialPostForm(generateForm({ idea: "ngắn" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("10") });
  });

  it("rejects vision mode without a local image path", () => {
    const result = parseGenerateSocialPostForm(generateForm({ imageLocalPath: "" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("ảnh") });
  });

  it("allows attach-only mode with no image at all", () => {
    const fd = generateForm({ visionMode: "attach-only" });
    fd.delete("imageLocalPath");
    fd.delete("imageUrl");
    fd.delete("imageStoragePath");
    const result = parseGenerateSocialPostForm(fd);
    expect(result.success).toBe(true);
    expect(result.success && result.data.imageLocalPath).toBeUndefined();
  });

  it("rejects an unknown vision mode", () => {
    const result = parseGenerateSocialPostForm(generateForm({ visionMode: "magic" }));
    expect(result.success).toBe(false);
  });
});

describe("parseScheduledPublishTime", () => {
  it("accepts a time inside the window", () => {
    const target = new Date(NOW.getTime() + DAY);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result.success && result.data.toISOString()).toBe(target.toISOString());
  });

  it("rejects a time sooner than the minimum", () => {
    const target = new Date(NOW.getTime() + (SCHEDULE_MIN_MINUTES - 1) * MINUTE);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result).toEqual({ success: false, error: expect.stringContaining("10 phút") });
  });

  it("accepts a time exactly at the minimum boundary", () => {
    const target = new Date(NOW.getTime() + SCHEDULE_MIN_MINUTES * MINUTE);
    expect(parseScheduledPublishTime(target.toISOString(), NOW).success).toBe(true);
  });

  it("rejects a time beyond the maximum", () => {
    const target = new Date(NOW.getTime() + (SCHEDULE_MAX_DAYS + 1) * DAY);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result).toEqual({ success: false, error: expect.stringContaining("75 ngày") });
  });

  it("accepts a time exactly at the maximum boundary", () => {
    const target = new Date(NOW.getTime() + SCHEDULE_MAX_DAYS * DAY);
    expect(parseScheduledPublishTime(target.toISOString(), NOW).success).toBe(true);
  });

  it("rejects an unparseable time", () => {
    const result = parseScheduledPublishTime("not a date", NOW);
    expect(result.success).toBe(false);
  });

  it("rejects an empty time", () => {
    expect(parseScheduledPublishTime("", NOW).success).toBe(false);
  });
});

describe("parseSocialPostTemplateForm", () => {
  it("parses a valid template form", () => {
    const fd = new FormData();
    fd.set("name", "Flash sale");
    fd.set("promptBody", "Viết bài đăng flash sale bằng tiếng Việt cho shop hải sản.");
    fd.set("isDefault", "on");
    const result = parseSocialPostTemplateForm(fd);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Flash sale",
        promptBody: "Viết bài đăng flash sale bằng tiếng Việt cho shop hải sản.",
        isDefault: true,
        isActive: false,
      },
    });
  });

  it("treats missing checkboxes as false", () => {
    const fd = new FormData();
    fd.set("name", "Tên mẫu");
    fd.set("promptBody", "Nội dung prompt đủ dài để hợp lệ.");
    const result = parseSocialPostTemplateForm(fd);
    expect(result.success && result.data.isDefault).toBe(false);
  });

  it("rejects an empty name", () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("promptBody", "Nội dung prompt đủ dài để hợp lệ.");
    expect(parseSocialPostTemplateForm(fd).success).toBe(false);
  });

  it("rejects a prompt body shorter than 20 characters", () => {
    const fd = new FormData();
    fd.set("name", "Tên mẫu");
    fd.set("promptBody", "quá ngắn");
    expect(parseSocialPostTemplateForm(fd).success).toBe(false);
  });
});

describe("parseCaptionForm", () => {
  it("parses and trims a caption", () => {
    const fd = new FormData();
    fd.set("caption", "  Nội dung bài đăng  ");
    expect(parseCaptionForm(fd)).toEqual({ success: true, data: { caption: "Nội dung bài đăng" } });
  });

  it("rejects an empty caption", () => {
    const fd = new FormData();
    fd.set("caption", "   ");
    expect(parseCaptionForm(fd).success).toBe(false);
  });
});
