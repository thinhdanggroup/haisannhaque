import { buildPrompt } from "./prompt-builder";
import type { ContentGenerator } from "./generator/types";
import type { ImageVisionMode } from "./types";

export type GenerateCaptionParams = {
  generator: ContentGenerator;
  promptBody: string;
  idea: string;
  visionMode: ImageVisionMode;
  imagePath?: string;
  conversationId?: string;
};

type SuccessUpdate = {
  generated_caption: string;
  edited_caption: null;
  conversation_id: string;
  generation_ms: number;
  generation_tokens: number;
  status: "generated";
  error_message: null;
};

type FailureUpdate = {
  status: "failed";
  error_message: string;
};

export type SocialPostUpdate = SuccessUpdate | FailureUpdate;

export type GenerationOutcome =
  | { ok: true; values: SuccessUpdate }
  | { ok: false; values: FailureUpdate };

export async function generateCaption(
  params: GenerateCaptionParams,
): Promise<GenerationOutcome> {
  const { generator, promptBody, idea, visionMode, imagePath, conversationId } = params;

  let prompt: string;
  try {
    prompt = buildPrompt({ promptBody, idea, visionMode, imagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không dựng được prompt";
    return { ok: false, values: { status: "failed", error_message: message } };
  }

  const result = await generator.generate({
    prompt,
    // Only vision mode gives agy a file to read.
    imagePath: visionMode === "vision" ? imagePath : undefined,
    conversationId,
  });

  if (!result.ok) {
    return { ok: false, values: { status: "failed", error_message: result.error } };
  }

  return {
    ok: true,
    values: {
      generated_caption: result.caption,
      // Regeneration supersedes any earlier admin edit.
      edited_caption: null,
      conversation_id: result.conversationId,
      generation_ms: result.durationMs,
      generation_tokens: result.tokens,
      status: "generated",
      error_message: null,
    },
  };
}
