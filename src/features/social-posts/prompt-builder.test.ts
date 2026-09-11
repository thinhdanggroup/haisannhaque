import { describe, expect, it } from "vitest";
import { buildPrompt, NO_SHELL_CLAUSE, POST_END, POST_START } from "./prompt-builder";

const PROMPT_BODY = "Bạn là chuyên gia viết content Facebook.";
const IDEA = "Cá hồi Na Uy tươi về sáng nay, giảm 20%";
const ABS_PATH = "/var/lib/social-posts/abc.png";

describe("buildPrompt", () => {
  it("includes the template body and the idea", () => {
    const prompt = buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "attach-only" });
    expect(prompt).toContain(PROMPT_BODY);
    expect(prompt).toContain(IDEA);
  });

  it("always instructs the model to wrap output in the delimiters", () => {
    const prompt = buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "attach-only" });
    expect(prompt).toContain(POST_START);
    expect(prompt).toContain(POST_END);
  });

  it("includes the absolute image path and the no-shell clause in vision mode", () => {
    const prompt = buildPrompt({
      promptBody: PROMPT_BODY,
      idea: IDEA,
      visionMode: "vision",
      imagePath: ABS_PATH,
    });
    expect(prompt).toContain(ABS_PATH);
    expect(prompt).toContain(NO_SHELL_CLAUSE);
  });

  it("omits the image path and no-shell clause in attach-only mode", () => {
    const prompt = buildPrompt({
      promptBody: PROMPT_BODY,
      idea: IDEA,
      visionMode: "attach-only",
      imagePath: ABS_PATH,
    });
    expect(prompt).not.toContain(ABS_PATH);
    expect(prompt).not.toContain(NO_SHELL_CLAUSE);
  });

  it("rejects a relative image path in vision mode", () => {
    expect(() =>
      buildPrompt({
        promptBody: PROMPT_BODY,
        idea: IDEA,
        visionMode: "vision",
        imagePath: "./abc.png",
      }),
    ).toThrow(/absolute/i);
  });

  it("rejects vision mode with no image path", () => {
    expect(() =>
      buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "vision" }),
    ).toThrow(/imagePath/i);
  });

  it("trims surrounding whitespace from the body and idea", () => {
    const prompt = buildPrompt({
      promptBody: `  ${PROMPT_BODY}  `,
      idea: `  ${IDEA}  `,
      visionMode: "attach-only",
    });
    expect(prompt).not.toContain(`  ${PROMPT_BODY}`);
    expect(prompt).toContain(`"${IDEA}"`);
  });
});
