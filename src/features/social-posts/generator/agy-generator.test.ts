import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => {
  const mkdir = vi.fn().mockResolvedValue(undefined);
  return { mkdir, default: { mkdir } };
});

// Simulates a killed subprocess: Node sets `code: null`, `signal: "SIGTERM"`
// and `stderr: ""` (not null/undefined) on a timeout kill — this is the
// exact shape that made the old `??`-based fallback discard `message` and
// surface a blank error (Finding 1).
vi.mock("node:child_process", () => {
  const execFile = (
    _file: string,
    _args: string[],
    _options: unknown,
    callback: (err: unknown) => void,
  ) => {
    const err = Object.assign(new Error("Command failed: sleep 5"), {
      code: null,
      signal: "SIGTERM",
      stdout: "",
      stderr: "",
    });
    callback(err);
  };
  return { execFile, default: { execFile } };
});

const { buildAgyArgs, createAgyGenerator } = await import("./agy-generator");

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

describe("createAgyGenerator error handling", () => {
  it("surfaces a non-empty Vietnamese timeout message on a killed subprocess (Finding 1)", async () => {
    const generator = createAgyGenerator({ ...CONFIG, printTimeoutSeconds: 5 });

    const result = await generator.generate({ prompt: "xin chào" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure result");

    // This is the assertion that would have caught Finding 1: against the
    // old `failure.stderr ?? failure.message ?? ""` code, stderr is ""
    // (not null/undefined) on a kill, so `??` never fell through to
    // `message` and this would have been an empty string appended to a
    // generic "agy thất bại (exit 1): " message instead.
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.error).toContain("quá thời gian chờ");
    expect(result.error).toContain("5s");
  });
});
