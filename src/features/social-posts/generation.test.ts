import { describe, expect, it } from "vitest";
import { generateCaption } from "./generation";
import { createStubGenerator } from "./generator/stub-generator";
import { POST_START } from "./prompt-builder";

const SUCCESS = {
  ok: true as const,
  caption: "Cá hồi tươi về sáng nay!",
  conversationId: "conv-1",
  durationMs: 11329,
  tokens: 13796,
};

const BASE = {
  promptBody: "Bạn là chuyên gia viết content Facebook.",
  idea: "Cá hồi Na Uy tươi về sáng nay, giảm 20%",
  visionMode: "attach-only" as const,
};

describe("generateCaption", () => {
  it("returns the caption and generation metrics on success", async () => {
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({ ...BASE, generator });

    expect(outcome.ok).toBe(true);
    expect(outcome.values).toEqual({
      generated_caption: "Cá hồi tươi về sáng nay!",
      edited_caption: null,
      conversation_id: "conv-1",
      generation_ms: 11329,
      generation_tokens: 13796,
      status: "generated",
      error_message: null,
    });
  });

  it("clears any previous admin edit, since it belonged to superseded output", async () => {
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({ ...BASE, generator });
    // Narrow via outcome.ok: edited_caption exists only on the success branch.
    expect(outcome.ok && outcome.values.edited_caption).toBeNull();
  });

  it("sends a prompt containing the delimiter instruction", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, generator });
    expect(generator.calls[0]?.prompt).toContain(POST_START);
  });

  it("passes the absolute image path to the generator in vision mode", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({
      ...BASE,
      visionMode: "vision",
      imagePath: "/var/lib/social-posts/a.png",
      generator,
    });
    expect(generator.calls[0]?.imagePath).toBe("/var/lib/social-posts/a.png");
    expect(generator.calls[0]?.prompt).toContain("/var/lib/social-posts/a.png");
  });

  it("omits the image path in attach-only mode", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, imagePath: "/var/lib/social-posts/a.png", generator });
    expect(generator.calls[0]?.imagePath).toBeUndefined();
  });

  it("forwards a conversation id so regeneration continues the conversation", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, conversationId: "conv-earlier", generator });
    expect(generator.calls[0]?.conversationId).toBe("conv-earlier");
  });

  it("maps a generator failure to failed status with the error preserved", async () => {
    const generator = createStubGenerator({
      ok: false,
      error: "agy bị từ chối quyền: read_file.",
      deniedActions: ["read_file"],
    });
    const outcome = await generateCaption({ ...BASE, generator });

    expect(outcome.ok).toBe(false);
    expect(outcome.values).toEqual({
      status: "failed",
      error_message: "agy bị từ chối quyền: read_file.",
    });
  });

  it("maps a thrown prompt-builder error to failed status instead of propagating", async () => {
    // vision mode with a relative path makes buildPrompt throw; the admin
    // should see a legible failure rather than an unhandled exception.
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({
      ...BASE,
      visionMode: "vision",
      imagePath: "./relative.png",
      generator,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.values.error_message).toMatch(/absolute/i);
  });
});
