import { describe, expect, it } from "vitest";
import { buildAgyArgs } from "./agy-generator";

const CONFIG = { binPath: "/home/u/.local/bin/agy", imageDir: "/var/lib/social-posts" };

describe("buildAgyArgs", () => {
  it("builds the verified flag set", () => {
    const args = buildAgyArgs({ prompt: "xin chào" }, CONFIG);
    expect(args).toEqual([
      "-p",
      "xin chào",
      "--output-format",
      "json",
      "--print-timeout",
      "120s",
      "--add-dir",
      "/var/lib/social-posts",
    ]);
  });

  it("always passes --add-dir, which vision depends on", () => {
    const args = buildAgyArgs({ prompt: "x" }, CONFIG);
    expect(args).toContain("--add-dir");
    expect(args[args.indexOf("--add-dir") + 1]).toBe("/var/lib/social-posts");
  });

  it("appends --conversation when continuing a conversation", () => {
    const args = buildAgyArgs({ prompt: "ngắn hơn", conversationId: "abc-123" }, CONFIG);
    expect(args.slice(-2)).toEqual(["--conversation", "abc-123"]);
  });

  it("honours a custom print timeout", () => {
    const args = buildAgyArgs({ prompt: "x" }, { ...CONFIG, printTimeoutSeconds: 60 });
    expect(args[args.indexOf("--print-timeout") + 1]).toBe("60s");
  });

  it("keeps a prompt containing shell metacharacters as one single argument", () => {
    // Injection guard: the prompt embeds admin-supplied text. Because the
    // adapter uses execFile with an args array (never a shell string), this
    // must stay exactly one element and must not be escaped or split.
    const nasty = 'x"; rm -rf / #$(whoami)`id`';
    const args = buildAgyArgs({ prompt: nasty }, CONFIG);
    expect(args.filter((a) => a === nasty)).toHaveLength(1);
    expect(args[args.indexOf("-p") + 1]).toBe(nasty);
  });
});
