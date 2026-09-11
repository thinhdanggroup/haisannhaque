import type { ImageVisionMode } from "./types";

export const POST_START = "<<<POST>>>";
export const POST_END = "<<<END>>>";

// Verified during spec probing (§2.4.1): without this exact steering, agy
// reached for its shell tool (command/RunCommand), which stays denied on the
// server. A relative path made it explore the directory for the same reason,
// which is why an absolute path is enforced below.
export const NO_SHELL_CLAUSE =
  "Use ONLY your file-reading tool to read that image. Do NOT run any shell command.";

export type BuildPromptInput = {
  promptBody: string;
  idea: string;
  visionMode: ImageVisionMode;
  imagePath?: string;
};

export function buildPrompt(input: BuildPromptInput): string {
  const { promptBody, idea, visionMode, imagePath } = input;

  if (visionMode === "vision") {
    if (!imagePath) {
      throw new Error("imagePath is required when visionMode is 'vision'");
    }
    if (!imagePath.startsWith("/")) {
      throw new Error("imagePath must be an absolute path");
    }
  }

  const parts = [promptBody.trim()];

  if (visionMode === "vision" && imagePath) {
    parts.push(`Ảnh sản phẩm: ${imagePath}`);
    parts.push(NO_SHELL_CLAUSE);
  }

  parts.push(`Ý tưởng: "${idea.trim()}"`);
  parts.push(
    `Chỉ xuất ra bài đăng, bọc trong đúng định dạng: ${POST_START} nội dung ${POST_END}. ` +
      "Không thêm lời mở đầu, không giải thích.",
  );

  return parts.join("\n\n");
}
