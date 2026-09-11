import { describe, expect, it } from "vitest";
import { extractPost, parseAgyResponse, stripMarkdownFileLinks } from "./response-parser";

function envelope(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    conversation_id: "76e612f3-1a70-4d20-8d86-cc9a12755638",
    status: "SUCCESS",
    response: "<<<POST>>>\nCá hồi tươi về sáng nay!\n<<<END>>>\n",
    duration_seconds: 11.329279588,
    num_turns: 1,
    usage: { input_tokens: 11925, output_tokens: 1871, total_tokens: 13796 },
    ...overrides,
  });
}

function parse(stdout: string, exitCode = 0, stderr = "") {
  return parseAgyResponse({ exitCode, stdout, stderr });
}

describe("stripMarkdownFileLinks", () => {
  it("replaces a markdown file link with its label", () => {
    const input = "The image [mindmap.png](file:///home/u/mindmap.png) shows a chart.";
    expect(stripMarkdownFileLinks(input)).toBe("The image mindmap.png shows a chart.");
  });

  it("leaves ordinary text untouched", () => {
    expect(stripMarkdownFileLinks("no links here")).toBe("no links here");
  });
});

describe("extractPost", () => {
  it("extracts the content between the delimiters", () => {
    expect(extractPost("<<<POST>>>\nXin chào\n<<<END>>>")).toBe("Xin chào");
  });

  it("falls back to the whole trimmed response when delimiters are absent", () => {
    expect(extractPost("  Xin chào  ")).toBe("Xin chào");
  });

  it("ignores a stray END that appears before START", () => {
    expect(extractPost("<<<END>>> junk <<<POST>>>\nXin chào\n")).toBe("Xin chào");
  });
});

describe("parseAgyResponse", () => {
  it("returns the caption, conversation id, duration and tokens on success", () => {
    const result = parse(envelope());
    expect(result).toEqual({
      ok: true,
      caption: "Cá hồi tươi về sáng nay!",
      conversationId: "76e612f3-1a70-4d20-8d86-cc9a12755638",
      durationMs: 11329,
      tokens: 13796,
    });
  });

  it("decodes JSON-escaped delimiters", () => {
    // agy escapes < and > in .response; a raw-stdout regex would miss these.
    const raw =
      '{"conversation_id":"c1","status":"SUCCESS","response":"\\u003c\\u003c\\u003cPOST\\u003e\\u003e\\u003e\\nXin chào\\n\\u003c\\u003c\\u003cEND\\u003e\\u003e\\u003e","duration_seconds":1,"usage":{"total_tokens":5}}';
    const result = parse(raw);
    expect(result.ok && result.caption).toBe("Xin chào");
  });

  it("reports denied actions even when status is SUCCESS", () => {
    // Observed in spec §2.4: denials arrive with status SUCCESS and an
    // empty response, so denied_actions must be checked before status.
    const result = parse(
      envelope({
        response: "",
        denied_actions: [{ action: "read_file", display_name: "ListDir" }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.deniedActions).toEqual(["read_file"]);
    expect(result.ok === false && result.error).toContain("read_file");
  });

  it("fails on a non-SUCCESS status", () => {
    const result = parse(envelope({ status: "ERROR" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("ERROR");
  });

  it("fails when the extracted caption is empty", () => {
    const result = parse(envelope({ response: "<<<POST>>>   <<<END>>>" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/nội dung/i);
  });

  it("fails on a non-zero exit code and includes the stderr excerpt", () => {
    const result = parse("", 1, "agy: something broke");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("something broke");
  });

  it("fails on unparseable stdout", () => {
    const result = parse("not json at all");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/không đọc được/i);
  });

  it("defaults tokens to 0 when usage is absent", () => {
    const result = parse(envelope({ usage: undefined }));
    expect(result.ok && result.tokens).toBe(0);
  });
});
