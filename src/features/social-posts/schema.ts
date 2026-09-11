import { z } from "zod";
import type { ImageVisionMode } from "./types";

// Facebook rejects scheduled_publish_time outside this window, so it is
// enforced at the form boundary rather than surfacing as a Graph API error.
export const SCHEDULE_MIN_MINUTES = 10;
export const SCHEDULE_MAX_DAYS = 75;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

const uuidSchema = z.string().uuid();

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const generateSocialPostSchema = z
  .object({
    templateId: z.string().uuid("Mẫu prompt không hợp lệ"),
    idea: z
      .string()
      .trim()
      .min(10, "Ý tưởng cần ít nhất 10 ký tự")
      .max(2000, "Ý tưởng không được vượt quá 2000 ký tự"),
    visionMode: z.enum(["vision", "attach-only"]),
    imageUrl: optionalText,
    imageStoragePath: optionalText,
    imageLocalPath: optionalText,
  })
  .refine(
    (value) => value.visionMode !== "vision" || Boolean(value.imageLocalPath?.startsWith("/")),
    { message: "Cần tải ảnh lên trước khi dùng chế độ đọc ảnh", path: ["imageLocalPath"] },
  );

export type GenerateSocialPostData = {
  templateId: string;
  idea: string;
  visionMode: ImageVisionMode;
  imageUrl?: string;
  imageStoragePath?: string;
  imageLocalPath?: string;
};

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}

function readOptional(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (raw === null) return undefined;
  const text = String(raw).trim();
  return text === "" ? undefined : text;
}

export function parseGenerateSocialPostForm(formData: FormData): ParseResult<GenerateSocialPostData> {
  const parsed = generateSocialPostSchema.safeParse({
    templateId: String(formData.get("templateId") ?? ""),
    idea: String(formData.get("idea") ?? ""),
    visionMode: String(formData.get("visionMode") ?? "attach-only"),
    imageUrl: readOptional(formData, "imageUrl"),
    imageStoragePath: readOptional(formData, "imageStoragePath"),
    imageLocalPath: readOptional(formData, "imageLocalPath"),
  });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data as GenerateSocialPostData };
}

export function parseScheduledPublishTime(raw: string, now: Date): ParseResult<Date> {
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return { success: false, error: "Thời gian đăng không hợp lệ" };
  }

  const delta = parsed.getTime() - now.getTime();

  if (delta < SCHEDULE_MIN_MINUTES * MINUTE_MS) {
    return {
      success: false,
      error: `Thời gian đăng phải cách hiện tại ít nhất ${SCHEDULE_MIN_MINUTES} phút`,
    };
  }

  if (delta > SCHEDULE_MAX_DAYS * DAY_MS) {
    return {
      success: false,
      error: `Thời gian đăng không được quá ${SCHEDULE_MAX_DAYS} ngày kể từ hiện tại`,
    };
  }

  return { success: true, data: parsed };
}

export const socialPostTemplateSchema = z.object({
  name: z.string().trim().min(1, "Tên mẫu là bắt buộc").max(120, "Tên mẫu quá dài"),
  promptBody: z
    .string()
    .trim()
    .min(20, "Nội dung prompt cần ít nhất 20 ký tự")
    .max(5000, "Nội dung prompt không được vượt quá 5000 ký tự"),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type SocialPostTemplateData = z.infer<typeof socialPostTemplateSchema>;

export function parseSocialPostTemplateForm(formData: FormData): ParseResult<SocialPostTemplateData> {
  const parsed = socialPostTemplateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    promptBody: String(formData.get("promptBody") ?? ""),
    isDefault: formData.get("isDefault") === "on",
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

export const captionSchema = z.object({
  caption: z.string().trim().min(1, "Nội dung bài đăng không được để trống"),
});

export function parseCaptionForm(formData: FormData): ParseResult<{ caption: string }> {
  const parsed = captionSchema.safeParse({ caption: String(formData.get("caption") ?? "") });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data };
}
